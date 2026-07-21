# Kanban Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HTML5 native drag-and-drop with @dnd-kit, add column reordering, visual drag feedback, and optimistic updates with rollback + toast.

**Architecture:** Single `DndContext` at board level wrapping two sortable layers — columns (vertical, `rectSortingStrategy`) and tasks within each column (vertical, cross-column via `closestCorners` collision detection). `DragOverlay` provides ghost rendering. Optimistic updates follow existing snapshot→mutate→PUT→rollback pattern in Zustand.

**Tech Stack:** Next.js 19, React 19, Zustand 5, Tailwind CSS 4, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, sonner

## Global Constraints

- All new frontend components must be `'use client'`
- Zustand store actions follow existing `cloneBoard` snapshot/rollback pattern
- Backend handlers follow existing Gin patterns (user ownership validation, SSE broadcast)
- Toast library: sonner (install via npm)
- Drag library: @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities (install via npm)
- Frontend types re-export from `shared/types.ts`

---

### Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install @dnd-kit packages and sonner**

Run:
```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sonner
```

Expected: packages added to `package.json` and `node_modules`

- [ ] **Step 2: Verify install**

Run:
```bash
cd frontend && node -e "require('@dnd-kit/core'); require('@dnd-kit/sortable'); require('@dnd-kit/utilities'); require('sonner'); console.log('OK')"
```

Expected: prints `OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sonner"
```

---

### Task 2: Backend — Add PUT /api/columns/:id Endpoint

**Files:**
- Modify: `backend/router.go`

**Interfaces:**
- Produces: `PUT /api/columns/:id` — accepts `{"position": number}`, validates column belongs to user, updates position, broadcasts SSE `column.updated`, returns 204

- [ ] **Step 1: Add route registration**

In `NewRouter()`, after the existing column route (`protected.POST("/columns/:colId/tasks", ...)`), add:

```go
protected.PUT("/columns/:id", s.updateColumn)
```

The router function should now have this block:

```go
protected.PUT("/tasks/:id", s.updateTask)
protected.DELETE("/tasks/:id", s.deleteTask)
protected.POST("/columns/:colId/tasks", s.createTask)
protected.PUT("/columns/:id", s.updateColumn)
```

- [ ] **Step 2: Add `updateColumn` handler**

Add the following handler after the existing `createTask` function:

```go
func (s *server) updateColumn(c *gin.Context) {
	var req struct {
		Position *int `json:"position" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var boardID string
	err := s.db.QueryRow(c.Request.Context(), `
		SELECT b.id
		FROM columns c
		JOIN boards b ON b.id = c.board_id
		WHERE c.id = $1 AND b.user_id = $2
	`, c.Param("id"), c.GetString("userID")).Scan(&boardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "column not found"})
		return
	}

	_, err = s.db.Exec(c.Request.Context(), `
		UPDATE columns
		SET position = $1
		WHERE id = $2
	`, *req.Position, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update column"})
		return
	}

	s.publishBoardEvent(boardID, "column.updated")
	c.Status(http.StatusNoContent)
}
```

- [ ] **Step 3: Build backend to verify compile**

Run:
```bash
cd backend && go build -o kanban-backend .
```

Expected: compiles without errors

- [ ] **Step 4: Commit**

```bash
git add backend/router.go
git commit -m "feat: add PUT /api/columns/:id endpoint for column position update"
```

---

### Task 3: Refactor TaskCard — Remove Drag Logic, Become Pure UI

**Files:**
- Modify: `frontend/src/app/components/TaskCard.tsx`

**Interfaces:**
- Produces: `TaskCard({ boardId, task })` — pure presentational component, no `draggable`, no `onDragStart`

- [ ] **Step 1: Remove drag attributes from TaskCard**

Replace the entire file. The component keeps in-place editing and the detail link, but drops `draggable` and `onDragStart`:

```tsx
'use client';

import Link from 'next/link';
import { KeyboardEvent, useState } from 'react';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';

export default function TaskCard({ boardId, task }: { boardId: string; task: Task }) {
  const { updateTask } = useKanbanStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  async function save() {
    if (!title.trim() || title === task.title) {
      setTitle(task.title);
      setEditing(false);
      return;
    }
    await updateTask(task.id, { title: title.trim() });
    setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void save();
    if (e.key === 'Escape') {
      setTitle(task.title);
      setEditing(false);
    }
  }

  return (
    <div className="rounded border bg-white p-2 shadow-sm">
      {editing ? (
        <input
          autoFocus
          className="w-full rounded border px-2 py-1 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { void save(); }}
          onKeyDown={onKeyDown}
        />
      ) : (
        <button className="w-full text-left text-sm" onDoubleClick={() => setEditing(true)}>
          {task.title}
        </button>
      )}
      <Link href={`/boards/${boardId}/tasks/${task.id}`} className="mt-2 inline-block text-xs text-blue-600">
        Detail
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors (TaskCard is still consumed by KanbanColumn which still renders it)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/components/TaskCard.tsx
git commit -m "refactor: remove native drag attributes from TaskCard"
```

---

### Task 4: Create SortableTaskCard — Drag Wrapper Around TaskCard

**Files:**
- Create: `frontend/src/app/components/SortableTaskCard.tsx`

**Interfaces:**
- Consumes: `TaskCard` component, `useSortable` from `@dnd-kit/sortable`, `CSS` from `@dnd-kit/utilities`
- Produces: `SortableTaskCard({ boardId, task })` — wraps TaskCard with `useSortable`, renders invisible when being dragged (gap preserved)

- [ ] **Step 1: Create SortableTaskCard**

```tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import TaskCard from './TaskCard';

export default function SortableTaskCard({ boardId, task }: { boardId: string; task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task, columnId: task.column_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard boardId={boardId} task={task} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors (SortableTaskCard is not yet consumed by anything, but should type-check)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/components/SortableTaskCard.tsx
git commit -m "feat: add SortableTaskCard — useSortable wrapper around TaskCard"
```

---

### Task 5: Create DragOverlayContent — Ghost Rendering During Drag

**Files:**
- Create: `frontend/src/app/components/DragOverlayContent.tsx`

**Interfaces:**
- Consumes: `useKanbanStore` (to read board data), `TaskCard` component
- Produces: `DragOverlayContent({ activeId, activeType })` — renders card or column ghost

- [ ] **Step 1: Create DragOverlayContent**

```tsx
'use client';

import { useKanbanStore } from '../lib/store';
import TaskCard from './TaskCard';
import { Column } from '../../types';

export default function DragOverlayContent({
  activeId,
  activeType,
}: {
  activeId: string;
  activeType: 'task' | 'column';
}) {
  const currentBoard = useKanbanStore((s) => s.currentBoard);

  if (!currentBoard?.columns) return null;

  if (activeType === 'task') {
    // Find the task across all columns
    for (const col of currentBoard.columns) {
      const task = col.tasks.find((t) => t.id === activeId);
      if (task) {
        return (
          <div className="rotate-1 scale-105 opacity-90 shadow-xl">
            <TaskCard boardId={currentBoard.id} task={task} />
          </div>
        );
      }
    }
  }

  if (activeType === 'column') {
    const column: Column | undefined = currentBoard.columns.find((c) => c.id === activeId);
    if (column) {
      return (
        <div className="rounded-lg bg-slate-100 p-3 opacity-90 shadow-xl w-72">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
            {column.title}
          </h2>
          <div className="space-y-2">
            {column.tasks.map((task) => (
              <TaskCard key={task.id} boardId={currentBoard.id} task={task} />
            ))}
          </div>
        </div>
      );
    }
  }

  return null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/components/DragOverlayContent.tsx
git commit -m "feat: add DragOverlayContent for drag ghost rendering"
```

---

### Task 6: Create dnd-hooks.ts — Collision Detection & Utilities

**Files:**
- Create: `frontend/src/app/lib/dnd-hooks.ts`

**Interfaces:**
- Produces: `findColumnByTaskId(board, taskId)` → Column | undefined; `getTaskPosition(column, overTaskId)` → number

- [ ] **Step 1: Create dnd-hooks.ts**

```tsx
import { Board, Column, Task } from '../types';

/**
 * Find which column contains a given task ID.
 */
export function findColumnByTaskId(board: Board, taskId: string): Column | undefined {
  for (const col of board.columns ?? []) {
    if (col.tasks.some((t) => t.id === taskId)) return col;
  }
  return undefined;
}

/**
 * Find a task by ID across all columns.
 */
export function findTaskById(board: Board, taskId: string): Task | undefined {
  for (const col of board.columns ?? []) {
    const found = col.tasks.find((t) => t.id === taskId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Calculate the insertion position for a task dropped into a column.
 * If overTaskId is provided, insert after that task; otherwise append to end.
 */
export function getTaskPosition(column: Column, overTaskId?: string): number {
  if (!overTaskId) return column.tasks.length;
  const overIndex = column.tasks.findIndex((t) => t.id === overTaskId);
  if (overIndex < 0) return column.tasks.length;
  return overIndex + 1;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/lib/dnd-hooks.ts
git commit -m "feat: add dnd utility functions for collision detection"
```

---

### Task 7: Update Zustand Store — Refine moveTask + Add moveColumn

**Files:**
- Modify: `frontend/src/app/lib/store.ts`

**Interfaces:**
- Modifies: `moveTaskOptimistic(taskId, fromColumnId, toColumnId, newPosition?)` — now supports same-column reorder + specific position
- Produces: `moveColumnOptimistic(columnId, newPosition)` — snapshot → reorder → PUT → rollback

- [ ] **Step 1: Update TaskPatch type and add import**

Add `TaskPatch` type already exists, no change needed. Add the new action signatures to the `KanbanState` type.

Replace the type definition section: add `moveColumnOptimistic`:

```ts
type KanbanState = {
  boards: Board[];
  currentBoard: Board | null;
  loading: boolean;
  error: string | null;
  fetchBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createTask: (columnId: string, title: string) => Promise<void>;
  updateTask: (taskId: string, patch: TaskPatch) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTaskOptimistic: (taskId: string, fromColumnId: string, toColumnId: string, newPosition?: number) => Promise<void>;
  moveColumnOptimistic: (columnId: string, newPosition: number) => Promise<void>;
};
```

- [ ] **Step 2: Refine `moveTaskOptimistic` to support same-column + position**

Replace the existing `moveTaskOptimistic` implementation:

```ts
moveTaskOptimistic: async (taskId, fromColumnId, toColumnId, newPosition?) => {
  const snapshot = cloneBoard(get().currentBoard);
  if (!snapshot) return;

  const next = cloneBoard(snapshot);
  if (!next?.columns) return;

  const fromColumn = next.columns.find((column) => column.id === fromColumnId);
  const toColumn = next.columns.find((column) => column.id === toColumnId);
  if (!fromColumn || !toColumn) return;

  const taskIndex = fromColumn.tasks.findIndex((task) => task.id === taskId);
  if (taskIndex < 0) return;

  // Remove task from source column
  const [task] = fromColumn.tasks.splice(taskIndex, 1);
  task.column_id = toColumn.id;

  // Insert at correct position in destination column
  const pos = newPosition ?? toColumn.tasks.length;
  toColumn.tasks.splice(pos, 0, task);

  // Reindex positions in destination column
  toColumn.tasks.forEach((t, i) => { t.position = i; });
  // If source != dest, reindex source column too
  if (fromColumnId !== toColumnId) {
    fromColumn.tasks.forEach((t, i) => { t.position = i; });
  }

  set({ currentBoard: next, error: null });

  try {
    await apiFetch<void>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ column_id: toColumn.id, position: task.position }),
    });
  } catch (err) {
    set({
      currentBoard: snapshot,
      error: err instanceof Error ? err.message : 'Failed to move task',
    });
    throw err;
  }
},
```

- [ ] **Step 3: Add `moveColumnOptimistic`**

Insert after the `moveTaskOptimistic` closing `},`:

```ts
moveColumnOptimistic: async (columnId, newPosition) => {
  const snapshot = cloneBoard(get().currentBoard);
  if (!snapshot?.columns) return;

  const next = cloneBoard(snapshot);
  if (!next?.columns) return;

  // Remove column from its current position
  const oldIndex = next.columns.findIndex((c) => c.id === columnId);
  if (oldIndex < 0) return;

  const [col] = next.columns.splice(oldIndex, 1);

  // Insert at new position
  next.columns.splice(newPosition, 0, col);

  // Reindex all columns
  next.columns.forEach((c, i) => { c.position = i; });

  set({ currentBoard: next, error: null });

  try {
    await apiFetch<void>(`/api/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ position: col.position }),
    });
  } catch (err) {
    set({
      currentBoard: snapshot,
      error: err instanceof Error ? err.message : 'Failed to move column',
    });
    throw err;
  }
},
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/lib/store.ts
git commit -m "feat: refine moveTaskOptimistic for reorder, add moveColumnOptimistic"
```

---

### Task 8: Create KanbanBoard — DndContext Wrapper

**Files:**
- Create: `frontend/src/app/components/KanbanBoard.tsx`

**Interfaces:**
- Consumes: `KanbanColumn`, `SortableTaskCard`, `DragOverlayContent`, `useKanbanStore`, `@dnd-kit` packages, `sonner`, `dnd-hooks` utils
- Produces: `KanbanBoard()` — full DndContext + DragOverlay + column/task sortable contexts

- [ ] **Step 1: Create KanbanBoard**

```tsx
'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useKanbanStore } from '../lib/store';
import { findColumnByTaskId, getTaskPosition } from '../lib/dnd-hooks';
import KanbanColumn from './KanbanColumn';
import SortableTaskCard from './SortableTaskCard';
import DragOverlayContent from './DragOverlayContent';

export default function KanbanBoard() {
  const { currentBoard, moveTaskOptimistic, moveColumnOptimistic } = useKanbanStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'task' | 'column' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));

    const type = active.data.current?.type;
    setActiveType(type === 'column' ? 'column' : 'task');
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Column highlight is handled inside KanbanColumn via useDroppable isOver
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over || !currentBoard?.columns) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeDataType = active.data.current?.type;

    // --- Column reorder ---
    if (activeDataType === 'column') {
      if (activeIdStr === overIdStr) return;

      const newIndex = currentBoard.columns.findIndex((c) => c.id === overIdStr);
      if (newIndex < 0) return;

      try {
        await moveColumnOptimistic(activeIdStr, newIndex);
      } catch {
        toast.error('Gagal mengurutkan ulang kolom. Silakan coba lagi.');
      }
      return;
    }

    // --- Task drag ---
    const activeColumn = findColumnByTaskId(currentBoard, activeIdStr);
    if (!activeColumn) return;

    // Determine destination column
    let overColumnId: string;
    const overData = over.data.current;
    if (overData?.type === 'task') {
      overColumnId = overData.columnId as string;
    } else if (overData?.type === 'column') {
      // Dropped directly on a column (empty column or column header)
      overColumnId = overIdStr;
    } else {
      return;
    }

    if (activeIdStr === overIdStr) return;

    const toColumn = currentBoard.columns.find((c) => c.id === overColumnId);
    if (!toColumn) return;

    const newPosition = overData?.type === 'task'
      ? getTaskPosition(toColumn, overIdStr)
      : toColumn.tasks.length;

    try {
      await moveTaskOptimistic(activeIdStr, activeColumn.id, overColumnId, newPosition);
    } catch {
      toast.error('Gagal memindahkan task. Silakan coba lagi.');
    }
  }, [currentBoard, moveTaskOptimistic, moveColumnOptimistic]);

  if (!currentBoard?.columns) return null;

  const columnIds = currentBoard.columns.map((c) => c.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-3">
          {currentBoard.columns.map((column) => (
            <KanbanColumn key={column.id} column={column}>
              <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {column.tasks.map((task) => (
                    <SortableTaskCard key={task.id} boardId={currentBoard.id} task={task} />
                  ))}
                </div>
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && activeType ? (
          <DragOverlayContent activeId={activeId} activeType={activeType} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors (may warn about KanbanColumn not accepting children yet — that's done in Task 9)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/components/KanbanBoard.tsx
git commit -m "feat: add KanbanBoard — DndContext wrapper with sortable columns and tasks"
```

---

### Task 9: Update KanbanColumn — useSortable + Drop Target Highlight

**Files:**
- Modify: `frontend/src/app/components/KanbanColumn.tsx`

**Interfaces:**
- Consumes: `useSortable`, `useDroppable` from `@dnd-kit`, children prop
- Produces: `KanbanColumn({ column, children })` — sortable column with drop highlight

- [ ] **Step 1: Rewrite KanbanColumn with useSortable + useDroppable**

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Column } from '../../types';
import { useKanbanStore } from '../lib/store';

export default function KanbanColumn({
  column,
  children,
}: {
  column: Column;
  children: React.ReactNode;
}) {
  const { createTask } = useKanbanStore();
  const [taskTitle, setTaskTitle] = useState('');

  // Sortable for column reordering
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  });

  // Droppable for task drop detection (column highlight)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask(column.id, taskTitle.trim());
    setTaskTitle('');
  }

  return (
    <div
      ref={setDroppableRef}
      style={style}
      className={`rounded-lg bg-slate-100 p-3 transition-colors ${
        isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div ref={setSortableRef} {...attributes} {...listeners}>
        <h2 className="mb-3 cursor-grab text-sm font-semibold uppercase tracking-wide text-slate-600 active:cursor-grabbing">
          {column.title}
        </h2>
      </div>

      {children}

      <form onSubmit={onCreate} className="mt-3 flex gap-2">
        <input
          className="w-full rounded border bg-white px-2 py-1 text-sm"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="Add task"
        />
        <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white">Add</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors (KanbanBoard imports KanbanColumn with children prop)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/components/KanbanColumn.tsx
git commit -m "feat: add sortable column with drop target highlight"
```

---

### Task 10: Update Board Page — Use KanbanBoard + Add Sonner Toaster

**Files:**
- Modify: `frontend/src/app/boards/[boardId]/page.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Update board detail page to use KanbanBoard**

Replace the `BoardDetailPage` content. The key change: replace the manual `.map()` over columns with `<KanbanBoard />`:

```tsx
'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../../components/KanbanBoard';
import { useKanbanStore } from '../../lib/store';

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const { currentBoard, loading, error, fetchBoard } = useKanbanStore();

  useEffect(() => {
    fetchBoard(params.boardId);
  }, [fetchBoard, params.boardId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    const source = new EventSource(
      `${base}/api/boards/${params.boardId}/events?token=${encodeURIComponent(token)}`
    );
    source.onmessage = () => {
      void fetchBoard(params.boardId);
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [fetchBoard, params.boardId]);

  if (loading) return <p className="text-sm text-slate-500">Loading board...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!currentBoard) return <p className="text-sm text-slate-500">Board not found.</p>;

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">{currentBoard.title}</h1>
      <KanbanBoard />
    </section>
  );
}
```

- [ ] **Step 2: Add Sonner Toaster to layout**

Add `<Toaster />` import and component to `layout.tsx`:

In `layout.tsx`, add the import:
```tsx
import { Toaster } from 'sonner';
```

And add `<Toaster />` just inside `<body>`, before `<ErrorBoundary>`:

```tsx
<body className="bg-slate-50 text-slate-900">
  <Toaster position="bottom-right" richColors />
  <ErrorBoundary>
    ...
```

The full layout.tsx becomes:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Kanban Task Manager',
  description: 'Simple Trello-like Kanban app',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <Toaster position="bottom-right" richColors />
        <ErrorBoundary>
          <Navbar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/boards/[boardId]/page.tsx frontend/src/app/layout.tsx
git commit -m "feat: wire KanbanBoard into board page, add Sonner toaster"
```

---

### Task 11: Final Verification — Build & Type Check

**Files:** (none — verification only)

- [ ] **Step 1: Full TypeScript check**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors across all files

- [ ] **Step 2: Backend compiles**

Run:
```bash
cd backend && go build -o kanban-backend .
```

Expected: compiles without errors

- [ ] **Step 3: Frontend builds**

Run:
```bash
cd frontend && npm run build
```

Expected: successful production build

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore: final fixes from build verification"
```
