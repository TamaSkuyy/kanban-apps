# Kanban Task Manager

A full-stack Kanban board application built with **Go** (Gin) and **Next.js 16** (React 19).  
Drag & drop tasks, real-time updates via SSE, dark mode, labels, markdown, and more.

![Tech Stack](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go) ![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql)

---

## ✨ Features

### Core
- **Drag & Drop** — Move tasks between columns, reorder columns. Optimistic updates + rollback via `@dnd-kit`.
- **Real-time Sync** — Server-Sent Events (SSE) push task/column changes to all connected clients.
- **JWT Authentication** — Register, login, protected routes. Token stored in `localStorage`.
- **Rate Limiting** — Per-IP rate limiting on the Go backend.

### UX
- **Dark Mode** — System-aware theme toggle with `next-themes` + Tailwind `dark:` variants.
- **Keyboard Shortcuts** — `N` new task, `E` edit, `Delete` delete, `Esc` deselect, `?` help dialog.
- **Search & Filter** — Client-side task search with highlighted matches and dimmed non-matches (debounced 300ms).
- **Task Labels** — 6 colored labels (bug, feature, urgent, design, improvement, docs). Multi-select in task modal.
- **Markdown Description** — Edit/Preview toggle with `react-markdown` rendering.
- **Activity Log** — Collapsible feed showing recent task events with relative timestamps.
- **Board Themes** — 10 accent colors per board.
- **Loading Skeletons** — Animated placeholder cards during data fetch.
- **Empty States** — Friendly prompts when boards or columns are empty.
- **Delete Confirmation** — Modal confirmation before destructive actions.
- **Undo Toast** — 5-second undo action after deleting boards or tasks.
- **Mobile Responsive** — Horizontal snap-scroll columns, hamburger nav, fullscreen task modal.
- **Offline Banner** — Amber warning bar when the network drops.
- **401 Auto-Redirect** — Expired sessions redirect to `/login` with a toast.

### Engineering
- **CI/CD** — GitHub Actions: Go vet + test + build, Next.js lint + test + build.
- **Testing** — Vitest + React Testing Library (frontend), Go table tests (backend).
- **Docker** — Containerized backend + frontend with Docker Compose for production.
- **Accessibility** — Skip-to-content link, ARIA live regions for drag & drop, focus management.

---

## 🏗️ Architecture

```
kanban-apps/
├── backend/                  # Go API server (Gin)
│   ├── main.go               # Entry point, DB pool, server start
│   ├── router.go             # All routes + handlers + SSE hub
│   ├── auth.go               # JWT generation, password hashing
│   ├── db.go                 # PostgreSQL connection pool
│   ├── *_test.go             # Go unit tests
│   ├── Dockerfile
│   └── migrations/           # SQL migration files
│
├── frontend/                 # Next.js 16 (Turbopack)
│   └── src/
│       └── app/
│           ├── layout.tsx        # Root layout (ThemeProvider, Toaster)
│           ├── boards/           # Board list + board detail pages
│           ├── login/            # Login page
│           ├── register/         # Register page
│           ├── components/       # 20+ React components
│           │   ├── KanbanBoard.tsx       # DndContext wrapper
│           │   ├── KanbanColumn.tsx      # Sortable column + useDroppable
│           │   ├── TaskCard.tsx          # Task display with labels, due date, assignee
│           │   ├── SortableTaskCard.tsx  # useSortable wrapper
│           │   ├── DragOverlayContent.tsx # Ghost during drag
│           │   ├── TaskModal.tsx         # Full task edit form + markdown
│           │   ├── ActivityLog.tsx       # Collapsible activity feed
│           │   ├── Navbar.tsx            # Nav + theme toggle + mobile menu
│           │   ├── ConfirmModal.tsx      # Accessible confirm dialog
│           │   ├── ShortcutsHelp.tsx     # Keyboard shortcuts dialog
│           │   ├── ScreenReaderAnnouncer.tsx # ARIA live region
│           │   └── ...                  # Skeletons, OfflineBanner, etc.
│           └── lib/
│               ├── store.ts             # Zustand store (optimistic updates)
│               ├── api.ts               # fetch wrapper + 401 interceptor
│               ├── useBoardEvents.ts    # SSE hook with reconnection
│               ├── useKeyboardShortcuts.ts # Global hotkey listener
│               ├── useDebounce.ts       # Debounce hook
│               └── dnd-hooks.ts         # DnD utility functions
│
├── shared/
│   └── types.ts              # TypeScript types (Board, Column, Task)
│
├── docker-compose.yml        # Local dev (PostgreSQL)
├── docker-compose.prod.yml   # Production (backend + frontend + PostgreSQL)
├── dev-local.sh              # One-command local dev launcher
├── deploy-production.sh      # Production deploy script
├── .github/workflows/ci.yml  # CI/CD pipeline
└── ROADMAP.md                # Feature roadmap (all done ✅)
```

---

## 🚀 Quick Start

### Prerequisites
- **Go** ≥ 1.25
- **Node.js** ≥ 20
- **Docker** (for PostgreSQL)

### 1. Clone & start PostgreSQL

```bash
git clone <repo-url> && cd kanban-apps
docker compose up -d    # starts PostgreSQL on localhost:5432
```

### 2. Backend

```bash
cd backend
cp ../.env.example ../.env   # edit DATABASE_URL if needed
go run .
# API running on http://localhost:8080
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App running on http://localhost:3000
```

### 4. Or use the launcher script

```bash
chmod +x dev-local.sh
./dev-local.sh
```

---

## 🧪 Testing

```bash
# Backend
cd backend && go test ./...

# Frontend
cd frontend && npm test
```

---

## 🐳 Docker (Production)

```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

This builds Docker images and starts the full stack:
- **Backend** — `:8080`
- **Frontend** — `:3000`
- **PostgreSQL** — `:5432`

---

## 🔌 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register (email + password) |
| `POST` | `/api/auth/login` | Login → JWT token |
| `GET` | `/api/auth/me` | Get current user |

### Boards
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/boards` | List user's boards |
| `POST` | `/api/boards` | Create board (+ default columns) |
| `GET` | `/api/boards/:id` | Get board with columns + tasks |
| `PUT` | `/api/boards/:id` | Update board (title, theme_color) |
| `DELETE` | `/api/boards/:id` | Delete board + cascade |
| `GET` | `/api/boards/:id/events` | SSE event stream |
| `GET` | `/api/boards/:id/activities` | Activity log |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/columns/:colId/tasks` | Create task in column |
| `PUT` | `/api/tasks/:id` | Update task (title, description, labels, due_date, position, column) |
| `DELETE` | `/api/tasks/:id` | Delete task |

### Columns
| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/api/columns/:id` | Update column position |

---

## 🎹 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Focus "Add a task" input in first column |
| `E` | Edit selected task |
| `Delete` | Delete selected task (with confirmation) |
| `Esc` | Deselect task / close modal |
| `?` | Show shortcuts help dialog |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript 5 |
| **State** | Zustand 5 (optimistic updates) |
| **Styling** | Tailwind CSS 4, `dark:` variants |
| **Drag & Drop** | @dnd-kit/core + @dnd-kit/sortable |
| **Real-time** | Server-Sent Events (SSE) |
| **Icons** | lucide-react |
| **Toast** | sonner |
| **Markdown** | react-markdown |
| **Theme** | next-themes |
| **Backend** | Go 1.25, Gin, pgx v5 |
| **Auth** | JWT (golang-jwt), bcrypt |
| **Database** | PostgreSQL 17 |
| **Testing** | Vitest + React Testing Library, Go stdlib testing |
| **CI/CD** | GitHub Actions |
| **Container** | Docker + Docker Compose |

---

## 📄 License

MIT — built as a portfolio project.
