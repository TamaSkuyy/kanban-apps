# 4. Drag & Drop (@dnd-kit)

## Kenapa @dnd-kit?

| Library | Status | Masalah |
|---------|--------|---------|
| react-beautiful-dnd | Deprecated | Tidak di-maintain, ga support React 18+ |
| HTML5 native DnD | - | Sulit untuk nested lists (task dalam column), ga ada animasi |
| **@dnd-kit** | Aktif | Accessibility-first, modular, custom sensors |

## Arsitektur DnD

```
DndContext (satu untuk seluruh board)
├── SortableContext (columns) — vertical list
│   ├── KanbanColumn (useSortable header + useDroppable body)
│   │   └── SortableContext (tasks) — vertical list
│   │       ├── SortableTaskCard (useSortable wrapper)
│   │       └── SortableTaskCard
│   ├── KanbanColumn
│   └── KanbanColumn
└── DragOverlay (portal — render di luar flow dokumen)
    └── DragOverlayContent (task ghost atau column ghost)
```

**Single DndContext**: Satu context untuk task drag DAN column reorder. @dnd-kit bisa bedakan lewat `data.type` di draggable item.

## Setup Sensor

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }  // 5px dulu baru mulai drag
  })
)
```

**Kenapa 5px distance?** Mencegah accidental drag saat user klik task card. Tanpa ini, setiap klik bisa trigger drag start.

## Collision Detection

```typescript
<DndContext collisionDetection={closestCorners}>
```

- `closestCorners`: mendeteksi overlap berdasarkan sudut terdekat — paling cocok untuk grid/column layout
- Alternatif: `closestCenter` (cocok untuk single list), `rectIntersection`

## Drag Events

### handleDragStart

```typescript
const handleDragStart = (event: DragStartEvent) => {
  setActiveId(String(active.id))
  setActiveType(active.data.current?.type)  // 'task' | 'column'

  // Announce ke screen reader
  announceToScreenReader(`Picked up task: ${task.title}`)
}
```

### handleDragEnd

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event
  setActiveId(null)
  setActiveType(null)

  if (!over) return  // dropped outside any droppable

  if (activeDataType === 'column') {
    // Column reorder: cari index target, panggil moveColumnOptimistic
    const newIndex = columns.findIndex(c => c.id === overId)
    await moveColumnOptimistic(activeId, newIndex)
  }

  if (activeDataType === 'task') {
    // Task move: tentukan target column (bisa dari task atau column droppable)
    const toColumn = findTargetColumn(over)
    const toPosition = getTaskPosition(toColumn, overTaskId)
    await moveTaskOptimistic(taskId, fromCol, toCol, toPosition)
  }
}
```

## Optimistic Move: Detail

```typescript
moveTaskOptimistic: async (taskId, fromColId, toColId, newPos) => {
  // 1. Deep clone snapshot untuk rollback
  const snapshot = cloneBoard(get().currentBoard)

  // 2. Clone lagi untuk mutasi
  const next = cloneBoard(snapshot)
  const fromCol = next.columns.find(c => c.id === fromColId)
  const toCol = next.columns.find(c => c.id === toColId)

  // 3. Hapus task dari source column
  const taskIndex = fromCol.tasks.findIndex(t => t.id === taskId)
  const [task] = fromCol.tasks.splice(taskIndex, 1)

  // 4. Update task.column_id ke column tujuan
  task.column_id = toCol.id

  // 5. Insert di posisi yang tepat
  const pos = newPosition ?? toCol.tasks.length
  toCol.tasks.splice(pos, 0, task)

  // 6. Reindex SEMUA task di column yang terpengaruh
  toCol.tasks.forEach((t, i) => { t.position = i })
  if (fromColId !== toColId) {
    fromCol.tasks.forEach((t, i) => { t.position = i })
  }

  // 7. Update UI sekarang juga
  set({ currentBoard: next })

  // 8. Kirim ke backend
  try {
    await apiFetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ column_id: toCol.id, position: task.position })
    })
  } catch (err) {
    // 9. Rollback jika gagal
    set({ currentBoard: snapshot, error: err.message })
    throw err  // re-throw → toast di komponen
  }
}
```

## Column Reorder: Detail

```typescript
moveColumnOptimistic: async (columnId, newPosition) => {
  const snapshot = cloneBoard(get().currentBoard)
  const next = cloneBoard(snapshot)

  // Hapus dari posisi lama
  const oldIndex = next.columns.findIndex(c => c.id === columnId)
  const [col] = next.columns.splice(oldIndex, 1)

  // Insert di posisi baru
  next.columns.splice(newPosition, 0, col)

  // Reindex semua column
  next.columns.forEach((c, i) => { c.position = i })

  set({ currentBoard: next })

  try {
    await apiFetch(`/api/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ position: col.position })
    })
  } catch (err) {
    set({ currentBoard: snapshot, error: err.message })
    throw err
  }
}
```

## DragOverlay

Overlay dirender di luar flow DOM (React portal via `DragOverlay` dari @dnd-kit). Ini penting supaya item yang di-drag:
1. Tidak terbatas oleh parent container (overflow: hidden, z-index)
2. Bisa diberi style khusus (rotate, scale, shadow)
3. Tidak memicu layout shift

```typescript
<DragOverlay>
  {activeId && activeType ? (
    <DragOverlayContent activeId={activeId} activeType={activeType} />
  ) : null}
</DragOverlay>
```

Untuk task: render ulang TaskCard dengan `rotate-1 scale-105 opacity-90 shadow-xl`.
Untuk column: render ulang seluruh column dengan semua tasknya.

## useSortable & useDroppable

### KanbanColumn — dua hook sekaligus

```typescript
// Column header bisa di-drag (reorder column)
const { setNodeRef: setSortableRef, ... } = useSortable({
  id: column.id,
  data: { type: 'column', column }
})

// Column body menerima task drop
const { setNodeRef: setDroppableRef, isOver } = useDroppable({
  id: column.id,
  data: { type: 'column', column }
})
```

`isOver` dipakai untuk visual feedback: `ring-2 ring-blue-400 bg-blue-50`.

### SortableTaskCard

```typescript
const { setNodeRef, transform, transition, isDragging } = useSortable({
  id: task.id,
  data: { type: 'task', task, columnId: task.column_id }
})

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0 : 1  // item asli hilang saat di-drag
}
```

**Kenapa opacity 0 saat dragging?** DragOverlay yang render ghost — item asli tetap di tempat supaya space tidak collapse.

## getTaskPosition — insertion logic

```typescript
// dnd-hooks.ts
export function getTaskPosition(column, overTaskId?) {
  if (!overTaskId) return (column.tasks || []).length  // akhir column

  const overIndex = column.tasks.findIndex(t => t.id === overTaskId)
  return overIndex  // insert BEFORE overTask
}
```

Ini menentukan di index mana task yang di-drop akan disisipkan. Jika drop di atas task lain → insert di index task itu.
