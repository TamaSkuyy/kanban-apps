# 6. Design Patterns & Best Practices

## 1. Optimistic Update (Zustand)

**Pola**: Update UI sebelum API call, rollback jika gagal.

```typescript
// Pattern: Snapshot → Mutate → API → Rollback?
const snapshot = clone(get().data)     // simpan state sebelum
set({ data: optimisticData })          // update UI sekarang
try {
  await apiFetch(...)                  // validasi di server
} catch {
  set({ data: snapshot, error: ... }) // kembalikan jika gagal
}
```

**Kapan dipakai**: Operasi yang hampir selalu berhasil (>95%) dan butuh feedback instant (drag & drop, inline edit).

**Kapan TIDAK**: Operasi yang sering gagal (payment, validation kompleks) — gunakan loading state.

**Deep clone** via `JSON.parse(JSON.stringify(obj))` diperlukan karena Zustand state immutable. Hindari di objek sangat besar (pertimbangan performa) — untuk Kanban board dengan <100 task per column, ini aman.

## 2. Toast + Undo (sonner)

```typescript
await deleteBoard(board.id)
toast.success(`Board "${title}" deleted`, {
  action: {
    label: 'Undo',
    onClick: () => createBoard(title)  // recreate
  },
  duration: 5000  // 5 detik untuk undo
})
```

**Pola**: Delete → toast success dengan Undo button → recreate jika diklik.

Ini lebih baik dari confirm modal dobel karena:
- Tidak interrupt flow user
- Masih bisa recover jika salah pencet
- Lebih modern UX pattern (Gmail-style)

## 3. Confirm Modal (untuk destructive actions)

```typescript
<ConfirmModal
  open={confirming}
  title="Delete Board"
  message="Are you sure? This deletes all tasks."
  confirmLabel="Delete Board"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => setConfirming(false)}
/>
```

Accessibility features:
- `role="alertdialog"` + `aria-modal="true"`
- Auto-focus cancel button saat dibuka
- Escape key → close
- Click backdrop → close
- Focus trap (tidak bisa tab ke luar modal)

## 4. Empty State (UX)

```tsx
// Board list kosong
{boards.length === 0 && !loading && (
  <div className="flex flex-col items-center">
    <div className="text-5xl">📋</div>
    <h2>No boards yet</h2>
    <p>Create your first board to get started.</p>
  </div>
)}

// Column kosong
{taskCount === 0 && (
  <div className="border-dashed border-slate-300 p-4 text-center">
    <p>No tasks yet</p>
    <p>Drag a card here or add one below</p>
  </div>
)}
```

**Prinsip**: Jangan tampilkan halaman kosong. Beri konteks + call to action.

## 5. Loading Skeleton (UX)

```tsx
// Board list loading
<div className="animate-pulse grid gap-3 sm:grid-cols-3">
  {[1,2,3].map(i => (
    <div key={i} className="rounded-lg bg-slate-200 h-24" />
  ))}
</div>
```

`animate-pulse` dari Tailwind memberikan efek shimmer. Gunakan skeleton BUKAN spinner untuk konten yang strukturnya sudah diketahui.

## 6. Dark Mode (Tailwind v4 + next-themes)

```css
/* globals.css — Tailwind v4 class-based dark mode */
@custom-variant dark (&:where(.dark, .dark *));
```

```tsx
// ThemeProvider dari next-themes
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
```

```tsx
// Komponen
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
```

**3 layer**: CSS variable (`@custom-variant`), Provider (`next-themes`), utility class (`dark:`). System preference detection via `defaultTheme="system"`.

## 7. API Client Pattern (apiFetch)

```typescript
// Single entry point untuk semua API calls
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // 1. Baca base URL dari env
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

  // 2. Attach JWT token
  const token = localStorage.getItem('token')
  if (token) headers.set('Authorization', 'Bearer ' + token)

  // 3. 401 → clear token + redirect login
  if (response.status === 401) { /* ... */ }

  // 4. Parse error dari JSON body
  if (!response.ok) {
    const body = await response.json()
    throw new Error(body.error)
  }

  // 5. 204 No Content → undefined
  if (response.status === 204) return undefined as T

  return response.json()
}
```

Semua API call lewat fungsi ini → konsisten untuk error handling, auth, dan type safety (generic `<T>`).

## 8. Defensive Data Handling

```typescript
// Store: normalisasi data setelah fetch
if (board.columns) {
  for (const col of board.columns) {
    if (!col.tasks) col.tasks = []  // handle omitempty
  }
}

// Komponen: defensive access
const tasks = column.tasks || []
(col.tasks || []).map(task => ...)
```

**Masalah**: Go `encoding/json` dengan `omitempty` menghapus empty slice dari JSON. Frontend terima `undefined` bukan `[]`.

**Solusi berlapis**:
1. Store normalization (`fetchBoard`)
2. Defensive operators di semua akses (`|| []`)
3. Defensive di dnd-hooks (`(col.tasks || []).length`)

## 9. Keyboard Shortcuts

```typescript
// Hindari trigger shortcut saat user mengetik
if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
  if (e.key !== 'Escape') return
}
```

Pola penting: shortcut global harus di-skip saat user di dalam input field. Hanya Escape yang tetap jalan (untuk menutup modal/membatalkan edit).

## 10. Accessibility (a11y)

| Fitur | Implementasi |
|-------|-------------|
| Skip to content | `<a href="#main-content" className="sr-only focus:not-sr-only ...">` |
| Screen reader DnD | `announceToScreenReader("Task moved to Done")` via `aria-live="assertive"` |
| Focus trap | ConfirmModal auto-focus cancel button |
| Keyboard nav | DnD items focusable, keyboard shortcuts |
| Color contrast | Tailwind color scale, dark mode consideration |
| Semantics | `<header>`, `<main>`, `<nav>`, `role="alertdialog"` |

## 11. Testing Strategy

```
Frontend:  Vitest + React Testing Library
  - Unit test untuk dnd-hooks (findColumnByTaskId, getTaskPosition)
  - Unit test untuk utilities (time formatting)

Backend:   Go stdlib testing
  - Unit test untuk scanLabels (JSONB parsing)
  - Unit test untuk SSE hub (subscribe/unsubscribe/publish)
  - Unit test untuk auth (password hash, JWT)
```

**Apa yang DI-test**: Pure logic, parsing, state transitions.  
**Apa yang TIDAK**: UI rendering, integration dengan API, E2E flow (akan butuh Playwright/Cypress).

## 12. CI/CD

```yaml
# GitHub Actions — .github/workflows/ci.yml
on: [push, pull_request, workflow_dispatch]

jobs:
  backend:   # go vet + go test + go build
  frontend:  # npm ci + lint + test + build
  docker:    # manual trigger only (workflow_dispatch)
```

Docker build dipisah ke manual trigger karena:
1. Tidak perlu di setiap push
2. Registry access (`docker.io`) bisa timeout di environment tertentu
3. Build image lebih lambat (~2-3 menit)

## 13. Environment Variables

```
# .env (tidak di-commit)
DATABASE_URL=postgres://kanban:kanban@localhost:5432/kanban?sslmode=disable

# .env.example (di-commit, nilai placeholder kosong)
DATABASE_URL=

# Frontend (Next.js public env)
NEXT_PUBLIC_API_URL=http://localhost:8080
```

`NEXT_PUBLIC_` prefix → expose ke browser. Tanpa prefix → server-side only.
