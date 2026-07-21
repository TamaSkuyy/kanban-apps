# Kanban App — Future Plan

## Current Score: 6/10

Yang sudah solid: drag & drop, optimistic update, SSE, auth, store pattern.
Yang kurang: polish, empty states, feedback, mobile, accessibility.

---

## Priority 1: Portfolio Deal-Breakers (kerjakan dulu)

### 1.1 Empty States
| Komponen | Sekarang | Seharusnya |
|----------|---------|------------|
| Boards list kosong | Grid kosong | Ilustrasi + "Create your first board" + CTA button |
| Column kosong | Space kosong | "No tasks yet" text muted + "Add a task" prompt |
| Task detail kosong | "Task not loaded yet" | Skeleton placeholder |

### 1.2 Delete Confirmation
- Board delete: langsung hapus tanpa konfirmasi → tambah modal "Are you sure? This deletes all tasks."
- Task delete: langsung hapus → tambah confirmation atau undo toast ("Task deleted. Undo?")

### 1.3 Loading Skeletons
- Board list: ganti "Loading boards..." text dengan skeleton cards (3 gray rectangles)
- Board detail: ganti "Loading board..." dengan skeleton columns (3 column skeletons)
- Task modal: skeleton form fields saat loading

### 1.4 Error Handling Polish
- API error: toast error sudah ada ✅
- Network offline: tambah banner "You are offline. Changes will sync when reconnected."
- 401 Unauthorized: auto-redirect ke login + toast "Session expired"

### 1.5 Mobile Responsive
- Board columns: `grid-cols-3` → `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Horizontal scroll columns di mobile (Trello-style horizontal swipe)
- Task modal: full screen di mobile, centered modal di desktop
- Navbar: hamburger menu di mobile

---

## Priority 2: UX that Wows

### 2.1 Task Card Enhancement
- Due date badge: warna hijau (jauh), kuning (minggu ini), merah (overdue)
- Assignee avatar/initial di card
- Quick action buttons on hover (edit, delete icon)
- Task description preview (first line truncated)

### 2.2 Board Management
- Rename board (inline edit title di board page)
- Board color/theme (opsional, stretch)

### 2.3 Keyboard Shortcuts
- `N` — new task (focus input di column pertama)
- `Delete` — delete selected task
- `E` — edit selected task
- `Esc` — close modal
- `?` — show shortcuts help dialog

### 2.4 Animasi Mikro
- Task card: `animate-in` slide + fade saat task baru dibuat
- Column: smooth height transition saat task dipindah
- Drag overlay: scale bounce saat drop
- Toast: slide in dari kanan (sonner sudah support)

---

## Priority 3: Fitur Tambahan (portfolio differentiator)

### 3.1 Task Search & Filter
- Search bar di atas board: filter tasks by title (client-side)
- Filter by assignee, due date range
- Hasil: task yang match di-highlight, sisanya opacity rendah

### 3.2 Task Labels / Tags
- Colored labels (bug, feature, urgent, design)
- Backend: `task_labels` table (many-to-many) atau JSON field
- Filter board by label

### 3.3 Markdown di Description
- Render markdown di task detail (gunakan `react-markdown`)
- Preview toggle: edit mode ↔ preview mode

### 3.4 Activity Log
- Backend: `activities` table (board_id, user_id, action, created_at)
- "Task moved from To Do → In Progress" — 2 minutes ago
- "Task 'Fix login' created" — 1 hour ago
- Tampil di sidebar atau drawer

### 3.5 Dark Mode
- Tailwind `dark:` variant + next-themes
- Toggle di Navbar
- System preference detection

---

## Priority 4: Engineering Excellence

### 4.1 Testing
- Backend: Go unit tests untuk handlers (mock DB)
- Frontend: Vitest + React Testing Library untuk komponen
- E2E: Playwright untuk flow critical (login → create board → add task → drag)

### 4.2 Accessibility (a11y)
- ARIA labels di semua interactive elements
- Keyboard navigation untuk drag & drop
- Focus management (trap focus di modal)
- Screen reader announcements untuk task moved/deleted

### 4.3 Performance
- Next.js Image optimization
- Debounce search input
- Virtualized task list (kalau task > 100 per column — stretch)

### 4.4 CI/CD
- GitHub Actions: lint → test → build → deploy
- Docker image push ke registry
- Automated DB migration di deploy

---

## Quick Wins (bisa kerjain sekarang, impact besar)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Delete confirmation modal (board + task) | 30 min | High |
| 2 | Empty states (boards, columns) | 45 min | High |
| 3 | Loading skeletons | 45 min | High |
| 4 | Mobile responsive columns | 30 min | High |
| 5 | Due date badge warna di card | 20 min | Medium |
| 6 | Task count badge di column header | 10 min | Medium |
| 7 | Inline board title edit | 30 min | Medium |
| 8 | Undo toast after delete | 15 min | Medium |

---

Mau kerjakan yang mana dulu? Aku rekomendasi: **Quick Wins 1-4** dulu (delete confirmation, empty states, skeletons, mobile) — 4 task ini langsung naikin portfolio score dari 6 ke 8.
