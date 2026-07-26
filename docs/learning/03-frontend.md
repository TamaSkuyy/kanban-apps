# 3. Frontend (Next.js 16 + React 19)

## Routing

```
/                          → redirect ke /boards atau /login
/login                     → login form
/register                  → register form
/boards                    → daftar board
/boards/[boardId]          → Kanban board detail (DnD context)
/boards/[boardId]/tasks/[taskId]  → task detail (standalone page)
```

**Parallel Routes** untuk task modal:
```
boards/[boardId]/
├── page.tsx              # Board detail (main content)
├── @modal/               # Parallel route slot — render di layout yang sama
│   └── (..)tasks/[taskId]/page.tsx  # Intercepting route: task modal overlay
└── layout.tsx            # Menerima children + modal sebagai props
```

Pattern ini memungkinkan task detail dibuka sebagai **modal overlay** saat diakses dari board (intercepting route), atau sebagai **full page** saat di-refresh langsung (standalone route).

## Zustand Store

### Kenapa Zustand?

- API minimal: `create((set, get) => ({...}))`
- Tidak perlu Provider wrapper
- Support `get()` untuk baca state terbaru tanpa rerender
- Cocok untuk optimistic update pattern (snapshot → mutate → rollback)

### Store Structure

```typescript
// store.ts
type KanbanState = {
  // Data
  boards: Board[]
  currentBoard: Board | null
  loading: boolean
  error: string | null

  // Board actions
  fetchBoards: () => Promise<void>
  createBoard: (title: string) => Promise<void>
  updateBoard: (boardId, title, themeColor?) => Promise<void>
  deleteBoard: (boardId) => Promise<void>

  // Task actions
  createTask: (columnId, title) => Promise<void>
  updateTask: (taskId, patch) => Promise<void>
  deleteTask: (taskId) => Promise<void>

  // Optimistic DnD
  moveTaskOptimistic: (taskId, fromCol, toCol, newPos?) => Promise<void>
  moveColumnOptimistic: (columnId, newPos) => Promise<void>

  // SSE incremental updates
  applyTaskEvent: (task: Task) => void
  removeTaskFromStore: (taskId: string) => void
}
```

### Optimistic Update Pattern

```typescript
moveTaskOptimistic: async (taskId, fromCol, toCol, newPos?) => {
  // 1. AMBIL SNAPSHOT (deep clone)
  const snapshot = cloneBoard(get().currentBoard)

  // 2. MUTASI STATE (optimistic)
  const next = cloneBoard(snapshot)
  // ... splice task dari fromCol, insert ke toCol, reindex positions ...
  set({ currentBoard: next })

  // 3. KIRIM API
  try {
    await apiFetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ column_id: toCol.id, position: newPos })
    })
  } catch (err) {
    // 4. ROLLBACK JIKA GAGAL
    set({ currentBoard: snapshot, error: err.message })
    throw err  // re-throw supaya komponen bisa toast error
  }
}
```

**Kenapa deep clone (JSON.parse+stringify)?**  
Zustand state immutable. Untuk rollback, kita harus simpan state SEBELUM mutasi. Spread operator (`...`) tidak cukup karena nested objects (columns → tasks).

### SSE Incremental Updates

```typescript
applyTaskEvent: (task) => {
  // 1. Clone current board
  const next = cloneBoard(get().currentBoard)

  // 2. Remove task from ALL columns (in case it moved)
  for (const col of next.columns) {
    col.tasks = col.tasks.filter(t => t.id !== task.id)
  }

  // 3. Insert task at target column + position
  const target = next.columns.find(c => c.id === task.column_id)
  target.tasks.splice(task.position, 0, task)
  target.tasks.forEach((t, i) => { t.position = i })

  set({ currentBoard: next })
}
```

**Kenapa remove dari semua column dulu?**  
Task bisa pindah column via client lain. Kita tidak tahu column lama — solusi paling aman: hapus dari semua, insert di column baru.

## Custom Hooks

### useBoardEvents (SSE)

```typescript
// useBoardEvents.ts
export function useBoardEvents(boardId: string) {
  useEffect(() => {
    const token = localStorage.getItem('token')
    const es = new EventSource(`/api/boards/${boardId}/events?token=${token}`)

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)
      // dispatch ke store berdasarkan event.type
      if (event.type === 'task.created') store.applyTaskEvent(event.data)
      if (event.type === 'task.deleted') store.removeTaskFromStore(event.data.task_id)
      // ...
    }

    // Exponential backoff reconnect
    es.onerror = () => { /* close, wait, reconnect with backoff */ }

    // Pause SSE saat tab inactive (Page Visibility API)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => es.close()
  }, [boardId])
}
```

### useKeyboardShortcuts

```typescript
// Global keydown listener — hanya aktif saat tidak di dalam input
export function useKeyboardShortcuts(onAction, enabled = true) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      switch (e.key) {
        case 'n': case 'N': onAction('new-task'); break
        case 'e': case 'E': onAction('edit-task'); break
        case 'Delete':       onAction('delete-task'); break
        case '?':           onAction('show-help'); break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
```

### useDebounce

```typescript
// Sederhana: tunda update value sampai delay selesai
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
```

## Komponen Kunci

### KanbanBoard

Wrapper utama DnD context. State:
- `activeId` — task/column yang sedang di-drag
- `activeType` — `'task'` atau `'column'`
- `selectedTaskId` — task yang diklik (untuk keyboard shortcuts)
- `deletingTask` — task yang akan dihapus (untuk confirm modal)

### TaskCard

Presentasi task dengan fitur:
- Double-click → inline edit title
- Hover → muncul action buttons (edit ✏️, delete 🗑️)
- Klik → selected state (ring biru)
- Due date badge (merah/kuning/hijau)
- Assignee avatar (inisial di lingkaran warna)
- Labels (colored pills)
- Description preview (80 karakter pertama)
- Search highlight (teks matching dikasih `<mark>` kuning)
- Selected state (ring-2 biru)

### TaskModal

Form edit task lengkap:
- Title (inline edit, auto-save on blur)
- Description (textarea + markdown preview toggle)
- Assignee + Due Date (input fields)
- Labels (multi-select pills)
- Delete button → ConfirmModal → toast undo
- Save → toast success → navigasi kembali

### OfflineBanner

```typescript
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    window.addEventListener('offline', () => setOffline(true))
    window.addEventListener('online', () => setOffline(false))
  }, [])

  if (!offline) return null
  return <div className="bg-amber-500 ...">You are offline...</div>
}
```

### ScreenReaderAnnouncer

Live region untuk screen reader. Export fungsi global `announceToScreenReader(msg)` yang bisa dipanggil dari mana saja — dipakai di KanbanBoard untuk mengumumkan operasi drag & drop.

## Error Handling

### apiFetch interceptor

```typescript
// api.ts
export async function apiFetch<T>(path, init?): Promise<T> {
  const response = await fetch(base + path, { ...init, headers })

  // 401 → expired token
  if (response.status === 401) {
    localStorage.removeItem('token')
    toast.error('Session expired. Please log in again.')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  // Error lainnya → extract message dari JSON body
  if (!response.ok) {
    const body = await response.json()
    throw new Error(body.error || `Request failed (${response.status})`)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}
```

### ErrorBoundary

React error boundary di root layout — menangkap crash yang tidak tertangani dan menampilkan fallback UI alih-alih blank page.
