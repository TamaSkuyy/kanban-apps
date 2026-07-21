# Kanban Drag & Drop — Design Spec

**Date:** 2026-07-21
**Branch:** main
**Status:** approved

---

## Overview

Replace the existing HTML5 native drag-and-drop with `@dnd-kit/core` + `@dnd-kit/sortable` for a polished Kanban board experience. Add column reordering, visual drag feedback, and optimistic updates with rollback.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@dnd-kit/core` | Drag & drop engine |
| `@dnd-kit/sortable` | Sortable list primitives |
| `@dnd-kit/utilities` | CSS transform helpers |
| `sonner` | Toast notifications for errors |

## Architecture

Single `DndContext` at board level wrapping two sortable layers:

```
BoardDetailPage
  └── KanbanBoard              ← DndContext + DragOverlay
        └── SortableContext     ← columns (vertical)
              └── KanbanColumn  ← useSortable
                    └── SortableContext  ← tasks (vertical, per column)
                          └── SortableTaskCard  ← useSortable
                                └── TaskCard    ← pure UI (no drag logic)
```

**Collision detection:** `closestCorners` for cross-column task movement; `rectSortingStrategy` for column reorder.

## New & Modified Files

### New

| File | Role |
|------|------|
| `frontend/src/app/components/KanbanBoard.tsx` | Main DndContext wrapper, manages drag state, renders DragOverlay |
| `frontend/src/app/components/SortableTaskCard.tsx` | Thin `useSortable` wrapper around TaskCard |
| `frontend/src/app/components/DragOverlayContent.tsx` | Renders ghost card or column during drag |
| `frontend/src/app/lib/dnd-hooks.ts` | Custom hooks: `useBoardDrag`, helper utils |

### Modified

| File | Changes |
|------|---------|
| `frontend/src/app/boards/[boardId]/page.tsx` | Use `<KanbanBoard>` instead of direct column map |
| `frontend/src/app/components/KanbanColumn.tsx` | Add `useSortable`, column highlight on card hover, remove native drag handlers |
| `frontend/src/app/components/TaskCard.tsx` | Remove `draggable` / `onDragStart`, become pure presentational |
| `frontend/src/app/lib/store.ts` | Add `moveColumnOptimistic`, refine `moveTaskOptimistic` for position + same-column reorder |
| `backend/router.go` | Add `PUT /api/columns/:id` endpoint |

## Data Flow

### Task Drag (cross-column or reorder)

```
onDragStart  → set active task (DragOverlay appears)
onDragOver   → detect container under pointer → update column highlight
onDragEnd    → compute { fromCol, toCol, newPosition }
                → store.moveTaskOptimistic(taskId, fromCol, toCol, newPosition)
                   → snapshot board
                   → apply move locally
                   → PUT /api/tasks/:id { column_id, position }
                   → on failure: restore snapshot + toast.error(...)
```

### Column Drag (reorder)

```
onDragStart  → set active column (DragOverlay appears)
onDragEnd    → store.moveColumnOptimistic(columnId, newPosition)
                → snapshot columns
                → reorder locally
                → PUT /api/columns/:id { position }
                → on failure: restore snapshot + toast.error(...)
```

## Backend — New Endpoint

### `PUT /api/columns/:id`

**Request:**
```json
{ "position": 2 }
```

**Logic:** Validate column belongs to user (via board ownership chain), update position, broadcast SSE `column.updated`.

**Router registration:** `protected.PUT("/columns/:id", s.updateColumn)`

## Visual Feedback

| State | Visual |
|-------|--------|
| Card dragging | `DragOverlay` renders card clone: `opacity-90 shadow-xl rotate-1 scale-105` |
| Column dragging | `DragOverlay` renders column clone: `opacity-90 shadow-xl` |
| Column hover target | Column gets `ring-2 ring-blue-400 bg-blue-50` when a card hovers over it |
| Drop indicator | Natural `useSortable` animation — other cards shift to make space |
| Active sortable | Card being dragged in source column becomes invisible (`opacity-0`), creating a gap |

## Error Handling

```
Pattern:
  snapshot = deepClone(state)
  apply optimistic change to state
  try { await apiCall() }
  catch {
    restore state from snapshot
    toast.error("Gagal memindahkan. Klik undo untuk kembali.")
  }
```

**Race condition guard:** `isSaving` flag in KanbanBoard local state — disables pointer sensor while an API call is in flight, preventing rapid-fire drags that could corrupt state.

**SSE reconciliation:** After optimistic update succeeds, the incoming SSE event refetches the board — data is identical so no visual flicker.

## Store Changes (Zustand)

New/updated actions:

- `moveTaskOptimistic(taskId, fromColId, toColId, newPosition)` — refined to handle same-column reorder and specific position insertion
- `moveColumnOptimistic(columnId, newPosition)` — new; snapshot → reorder → PUT → rollback

Both follow the existing snapshot/rollback pattern already established in the codebase.
