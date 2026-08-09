# Kanban SaaS — Workspace Task Manager

A **SaaS-ready** Kanban board built with **Go** (Gin) + **Next.js 16** (React 19). Drag & drop, real-time SSE, workspaces, invites, billing (Stripe stub), OAuth Google, API keys/webhooks — plus dark mode & full audit.

![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go) ![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss) ![Postgres](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql) ![SaaS](https://img.shields.io/badge/SaaS-ready-0f172a)

---

## ✨ Features

### Core Kanban
- **Drag & Drop** — columns (`horizontalListSortingStrategy`) + tasks (`vertical`), optimistic + rollback via `@dnd-kit`.
- **Real-time** — SSE `boardEvents` + presence `OnlineAvatars` + `RemoteCursors`.
- **Board card counts** — `column_count`/`task_count` via subquery (bukan `0` lagi).

### SaaS (baru)
- **Workspaces** — `workspaces` + `workspace_members (owner/admin/member/viewer)` + `ensurePersonalWorkspace` (auto backfill legacy boards). Switcher di `Navbar` + `/boards` (`WorkspaceSwitcher`), detail di `/workspaces/[id]` (edit/hapus, region `id-jakarta-1/sg-singapore-1/us-west-1`).
- **Invites** — `POST /workspaces/:id/invites` (token SHA256, 7d, `mailInvite`), `GET /invites/:token`, `POST /invites/:token/accept|decline`, `POST /invites/by-id/:id/accept`, `GET /me/invites` banner di boards, halaman `/invite/[token]`.
- **Billing** — `subscriptions` + `entitlements` (starter 3/3, pro 100/50, scale 1000/1000), `POST /billing/checkout` (dev stub langsung upgrade, prod Stripe), `GET /billing/subscription`, `POST /billing/portal`, `POST /webhooks/stripe` + `checkEntitlements` (403 `limit_reached`/`member_limit`), UI `/billing` + banner di boards.
- **Auth proper** — `register {name,email,password}` → OTP verify (`otps` 5/15m +60s cooldown), `POST /auth/verify|otp/*|forgot|reset|refresh`, `SKIP_VERIFY=1` dev, `email_verified_at`/`last_login_at`.
- **OAuth Google** — `POST /auth/oauth/google` stub (`demo@google.com` di dev), tombol `Lanjutkan dengan Google` di login/register sudah wiring.
- **API Keys / Webhooks** — `workspace_api_keys (kanban_...)` + `workspace_webhooks (url,events)` CRUD di `/workspaces/[id]` (Key, Webhook), `dispatchWebhooks` via `http.Post` on `publishBoardEvent`.
- **Data residency** — `workspaces.region` editable via `PUT /workspaces/:id`.
- **GDPR** — `DELETE /api/me` anon, `GET /api/me/export` dump.
- **Rate limit per-workspace** — `workspaceRateLimitMiddleware` key `ip:userID:workspace_id`, `loggingMiddleware` tambah `workspace_id`/`board_id`.
- **Audit** — `activities.workspace_id`, `slog audit` untuk `workspace.created/invite.sent/accepted/board.created`, `GET /health` cek `db/mailer/stripe`.

### UX
- **SaaS theme** — slate-900 primary, emerald accent, `rounded-lg/xl` varian, `border-slate-200` + `shadow-sm`, dark `dark:bg-slate-900`, tanpa purple/cream/aurora/`hover:scale`/emoji.
- **Pages** — landing (`/`), `login`/`register` split-screen, `boards` (grid/list + search + workspace warning + pending invites), `boards/[boardId]` (header 3px theme top border + workspace select sinkron), `tasks/[taskId]` modal, `workspaces/[id]` (boards+members+billing+keys+webhooks), `invite/[token]`, `billing`, `error`/`not-found` pro.
- **Dark mode** — `next-themes` + `dark:` di semua surface, toggle di `Navbar`/login/register/landing.
- **History & Invite modals** — `ActivityLog` drawer timeline + filter, `MemberPanel` modal workspace-aware (inherit).

---

## 🏗️ Architecture
```
kanban-apps/
├── backend/                  # Go Gin
│   ├── main.go               # DB pool + RUN_MIGRATIONS + router
│   ├── router.go             # routes + SSE hub + boards/columns/tasks
│   ├── auth.go               # JWT, OTP, HashToken
│   ├── mailer.go             # logMailer (dev) / Resend stub
│   ├── saas.go               # workspaces, invites, billing, GDPR, webhooks
│   ├── db.go
│   └── migrations/ 001..010  # users, boards, columns, tasks, board_members, saas_auth, workspaces, billing, theme_color, nice_to_have
├── frontend/                 # Next.js 16
│   └── src/app/
│       ├── page.tsx              # landing pricing CTA → checkout jika login
│       ├── login|register        # split-screen + OTP + Google OAuth
│       ├── boards/               # list + [boardId] detail (KanbanBoard)
│       ├── workspaces/[id]       # detail + billing/keys/webhooks
│       ├── invite/[token]        # accept/decline
│       ├── billing/              # plan + entitlements
│       ├── components/           # WorkspaceSwitcher, ActivityLog, MemberPanel, etc.
│       └── lib/store.ts          # zustand + workspace_id support
├── shared/types.ts           # Board + workspace_id + column/task counts
├── docker-compose.yml        # postgres
├── dev-local.sh              # launcher + migrations
└── TODO_SAAS.md
```

---

## 🚀 Quick Start
```bash
cp .env.example .env  # isi JWT_SECRET, APP_URL, dll
# dev dengan OTP di log:
LOG_MAIL_BODY=1 SKIP_VERIFY=1 ./dev-local.sh
# atau manual:
docker compose up -d postgres
# migrasi otomatis via dev-local.sh, atau:
RUN_MIGRATIONS=1 go run ./backend
```

**Env (.env.example):** `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `FRONTEND_ORIGIN`, `RESEND_API_KEY`, `STRIPE_SECRET/WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `RUN_MIGRATIONS`, `SKIP_VERIFY`, `NEXT_PUBLIC_API_URL`.

---

## 🔌 API (SaaS)
| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/register {name,email,pass}` | no |
| `POST` | `/api/auth/verify {email,code}` | no |
| `POST` | `/api/auth/otp/request|verify` | no |
| `POST` | `/api/auth/forgot|reset` | no |
| `POST` | `/api/auth/oauth/google {email,name,id_token}` | no |
| `DELETE` | `/api/me` | yes |
| `GET` | `/api/me/export` | yes |
| `GET/POST` | `/api/workspaces` | yes |
| `GET/PUT/DELETE` | `/api/workspaces/:id` | yes (owner/admin) |
| `GET` | `/api/workspaces/:id/boards` | yes |
| `GET/POST` | `/api/workspaces/:id/members` | yes |
| `POST` | `/api/workspaces/:id/invites` | yes |
| `GET` | `/api/invites/:token` | no |
| `POST` | `/api/invites/:token/accept|decline` | yes |
| `GET` | `/api/me/invites` | yes |
| `GET/POST/DELETE` | `/api/workspaces/:id/api-keys|webhooks` | yes |
| `GET` | `/api/billing/subscription?workspace_id=` | yes |
| `POST` | `/api/billing/checkout` | yes |
| `POST` | `/api/webhooks/stripe` | no |

Board/column/task SSE tetap: `GET /api/boards/:id/events`, `PUT /api/tasks/:id` (drag drop fixed: `labels::jsonb`).

---

## 🧪 Testing
```bash
GOCACHE=/tmp/go-cache go vet ./... && GOCACHE=/tmp/go-cache go test ./... # backend
npm run build # frontend (8/8 pages)
```
