# 1. Arsitektur

## Overview

Kanban app menggunakan **two-tier architecture** dengan REST API:

```
Frontend (Next.js) ←── HTTP/REST ──→ Backend (Go/Gin) ←── SQL ──→ PostgreSQL
                      ←── SSE ──────→
```

Komunikasi:
- **REST**: semua operasi CRUD (boards, columns, tasks, auth)
- **SSE**: push real-time events dari backend ke frontend (task dibuat, dipindah, dihapus)

## Kenapa Go + Next.js?

| Pilihan | Alasan |
|---------|--------|
| **Go (Gin)** | Performa tinggi, concurrency model (goroutines) cocok untuk SSE hub, standard library kuat |
| **Next.js 16** | React framework paling mature, SSR/SSG fleksibel, Turbopack build cepat |
| **PostgreSQL** | Relational DB paling solid, JSONB untuk labels, transactional DDL |
| **Zustand** | Lebih ringan dari Redux, API minimal, cocok untuk optimistic updates |
| **@dnd-kit** | Library DnD modern pengganti react-beautiful-dnd (deprecated), accessibility-first |

## Struktur Folder

```
kanban-apps/
├── backend/                    # Go API server
│   ├── main.go                 # Entry: DB pool, router, listen
│   ├── router.go               # Routes + handlers + SSE hub (~800 lines)
│   ├── auth.go                 # JWT generate/parse, password hash
│   ├── db.go                   # PostgreSQL connection pool
│   └── migrations/             # SQL migration files (.up.sql)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root: ThemeProvider, Toaster, ErrorBoundary
│   │   │   ├── boards/         # Board list + board detail (route groups)
│   │   │   ├── login/          # Login page
│   │   │   ├── register/       # Register page
│   │   │   ├── components/     # 25+ reusable components
│   │   │   └── lib/            # Store, hooks, utilities
│   │   ├── test/               # Vitest test files
│   │   └── types/              # TypeScript type definitions
│   └── vitest.config.ts
│
├── shared/
│   └── types.ts                # Shared TypeScript types (Board, Column, Task)
│
├── docker-compose.yml          # Local dev (PostgreSQL only)
├── docker-compose.prod.yml     # Production (all services)
└── .github/workflows/ci.yml    # CI/CD pipeline
```

## Data Flow

### Create Task (contoh flow)

```
1. User types title + clicks "Add"
2. KanbanColumn → store.createTask(columnId, title)
3. Store → apiFetch POST /api/columns/:id/tasks
4. Backend → INSERT INTO tasks → RETURNING *
5. Backend → publishBoardEvent("task.created", task)
6. SSE hub → push ke semua subscriber board itu
7. Frontend SSE → useBoardEvents menerima → store.applyTaskEvent(task)
8. Store → tambahkan task ke column yang tepat (incremental update)
```

### Move Task (Drag & Drop)

```
1. User drag task dari "To Do" ke "In Progress"
2. KanbanBoard.handleDragEnd → deteksi fromColumn + toColumn
3. Store.moveTaskOptimistic(taskId, fromCol, toCol, newPos)
4. Store → clone board, splice+reinsert task (OPTIMISTIC)
5. Store → PUT /api/tasks/:id { column_id, position }
6. Jika API gagal → rollback ke snapshot sebelumnya + toast error
7. Jika sukses → backend publishBoardEvent("task.moved", task)
8. Client lain → SSE menerima → applyTaskEvent (incremental)
```

## Database Schema

```sql
-- 4 tabel utama + 1 activity log

users (id, email, password_hash, created_at)
boards (id, user_id, title, theme_color, created_at, updated_at)
columns (id, board_id, title, position, created_at)
tasks (id, column_id, title, description, assignee, due_date, labels, position, created_at, updated_at)
activities (id, board_id, user_id, action, detail, created_at)
```

**Kenapa LEFT JOIN bukan 2 queries?**  
Awalnya getBoardData pakai 2 query (columns dulu, tasks menyusul). Ada bug: Go `omitempty` menghapus empty array dari JSON. Solusi: satu LEFT JOIN query + nullable pointer scanning. Lihat `router.go:getBoardData()`.

## Shared Types

TypeScript types dishare antara frontend dan backend via `shared/types.ts`. Frontend import dari situ, backend maintain struct sendiri di Go. Ini trade-off yang disengaja — untuk project kecil, duplikasi types lebih simpel daripada code generation.
