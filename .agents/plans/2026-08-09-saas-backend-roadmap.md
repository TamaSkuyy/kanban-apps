# SaaS Backend Roadmap — Kanban Apps

## Goal
Bawa backend Go dari app single-user sederhana menjadi SaaS yang proper: auth yang aman (email verify, OTP, reset), multi-tenant workspaces, invites & RBAC, billing/entitlements, dan kepatuhan dasar — selaras dengan redesign frontend SaaS (login/register/landing/boards sudah dark-mode).

## Success Criteria
- User baru harus verifikasi email (OTP atau link) sebelum bisa buat board; login bisa password + OTP sebagai fallback.
- Lupa password & reset beres end-to-end dengan token single-use + expiry.
- 1 user bisa punya/member di banyak workspace; semua query board/column/task ter-scope `workspace_id`; tidak ada leak antar workspace.
- Invite member via email → accept/reject → role `owner/editor/viewer` ter-enforce di setiap handler.
- Trial 14 hari + entitlements (board count, member count) di-enforce di API; webhook Stripe mengaktifkan Pro/Scale.
- Semua endpoint terlindungi rate limit per-user/per-workspace + audit log untuk action sensitif.
- Test & observability: handler punya unit test (mock DB), SSE & auth punya integrasi test, log terstruktur + health.

## Context And Current Facts
**Repo saat ini (grounded):**
- `backend/router.go:21-68` types: `Board{id,user_id,title,theme_color}`, `Column`, `Task{labels []string}`, `BoardMember{role}`, `sseClient/hub`, `rateLimiter 5rps burst 15`, `health`, `jwtMiddleware` baca `Bearer [REDACTED]` atau `?token`, `corsMiddleware` single origin `FRONTEND_ORIGIN`.
- `backend/auth.go:27-49` JWT HS256 24h dengan `dev-secret` fallback, `bcrypt.DefaultCost`, tanpa refresh, tanpa verify/reset.
- `backend/db.go:11-24` hanya `DATABASE_URL` → `pgxpool`, tanpa migrasi runner di code.
- `backend/migrations/*.up.sql` — `users(id,email,hash)`, `boards(id,user_id,title)`, `columns`, `tasks(labels JSON)` — tidak ada `workspaces`, `workspace_members`, `email_verifications`, `otps`, `password_resets`, `invites`, `subscriptions`, `activities` sudah dipakai di `router.go:238`.
- `backend/router.go:230-249` protected routes: `/boards`, `/boards/:id`, `/tasks/:id`, `/columns/:colId/tasks` — semua check `bm.user_id = jwt userID` via `board_members`; belum ada `workspace` concept.
- `frontend/src/app/lib/store.ts`, `api.ts`, `useBoardEvents.ts` — semua asumsi satu user = satu workspace.
- `frontend` redesign baru konsisten `max-w-[1280px]`, `bg-white/dark:bg-slate-950`, `rounded-lg/xl`, `Sun/Moon` via `next-themes` (`frontend/src/app/components/ThemeProvider.tsx` attribute `class`).

**Docs:** `ROADMAP.md` masih prioritas portfolio (empty states, skeleton) — belum ada bab SaaS backend.

## Constraints And Non-goals
- **Stack lock:** tetap Go/Gin + pgx + PostgreSQL, Next.js 16; jangan ganti framework auth (tidak pakai Auth0/Clerk di fase awal).
- **No purple-creamed UI debt** di backend — fokus API & data.
- **Non-goals fase ini:** SSO SAML/SCIM, data residency per-region, real in-app billing UI (cukup webhook + entitlements), migrasi zero-downtime kompleks, analytics warehouse.
- **Keamanan:** `JWT_SECRET` harus wajib di prod, rate limit global tetap, tapi tambah per-workspace.

## Key Decisions
| Pilihan | Rekomendasi | Alternatif ditolak & alasan |
|---|---|---|
| Email delivery | `Resend` atau `AWS SES` + `gomail` abstraction `Mailer` interface | SMTP raw — susah observability & bounce handling |
| OTP vs Magic Link | **OTP 6-digit (5 menit) untuk verify & login fallback** + magic link opsional | Hanya magic link — UX mobile OTP lebih cepat |
| Token reset | JWT short-lived `reset_token` (15m) + table `password_resets(token_hash, expires, used)` | Random string plain — susah revoke |
| Multi-tenant model | **Workspaces** (`workspaces`, `workspace_members` role owner/admin/member) + `boards.workspace_id` (FK) | Hanya `boards.user_id` — tidak bisa share workspace, tidak SaaS |
| RBAC lokasi | Middleware `requireWorkspaceRole` + `requireBoardRole` | Check di tiap handler — duplikasi, mudah miss |
| Billing | Stripe Checkout + Customer Portal + webhook `subscriptions(entitlement, status, trial_ends_at)` | Build billing sendiri — PCI risk |
| Invite | `invites(email, workspace_id, role, token_hash, expires, status)` + email → `POST /invites/:token/accept` | Invite via langsung insert `board_members` — tidak auditable, tidak bisa revoke |
| Audit | Tabel `activities(workspace_id, board_id, actor, action, detail)` sudah ada parsial — formalkan | Hanya log `slog` — tidak queryable di UI |

## Recommended Approach
**Urutan:** Hardening auth dulu → workspaces → invites/RBAC → entitlements/billing → kepatuhan/observability. Setiap fase punya migrasi, handler, test, dan update frontend minimal.

- **Auth proper** jadi fondasi karena register sekarang `INSERT users` tanpa name/verify dan langsung return JWT (`router.go:319-351`) — harus pecah jadi `register → verify → login` dan tambah `name`, `email_verified_at`, `last_login`.
- **Workspace scoping** harus sebelum billing karena entitlements ditempel ke workspace, bukan user.
- **Mailer abstraction** dari awal agar OTP/verify/reset/invite pakai jalur sama (retriable, log `email_logs`).
- **Entitlements di middleware** (`checkEntitlements`) agar frontend tidak bisa bypass board-limit dengan direct API.

## Work Plan

### Fase 0 — Hardening & Foundations (1-2 hari)
1. **Config & secrets** — wajibkan `JWT_SECRET`, tambah `APP_URL`, `MAILER_DSN`, `STRIPE_SECRET` via env; tambah `migrate` runner (golang-migrate atau `tern`).
2. **Migrasi 005-006** — `users(name, email_verified_at, last_login)` + `email_verifications`, `otps`, `password_resets`; index `email`, `expires_at`.
3. **Mailer interface** — `type Mailer interface { Send(to, subject, html string) error }`, impl `LogMailer` (dev) + `ResendMailer` (prod), + `email_logs` table.

### Fase 1 — Auth Proper (3-5 hari)
4. **Register v2** — `POST /api/auth/register {name,email,password}` → buat user `verified=false`, generate OTP 6-digit, kirim email, return `{requires_verification:true}` (tidak langsung JWT). Update `router.go:register`.
5. **Verify & OTP** — `POST /api/auth/verify {email,code}`, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify` (login tanpa password), `POST /api/auth/login` tetap tapi cek `email_verified_at` + `last_login`. JWT tetap 24h + tambah `POST /api/auth/refresh` (rotasi).
6. **Password reset** — `POST /api/auth/forgot {email}` → buat `password_resets` + email link `APP_URL/reset?token=`, `POST /api/auth/reset {token,new_password}` single-use.
7. **Frontend wiring** — update `login/page.tsx` & `register/page.tsx` tambah step OTP/verify + link lupa password (sudah ada placeholder `href="#"`).
   - *Depends: 2,3*

### Fase 2 — Workspaces & RBAC (4-6 hari)
8. **Migrasi 007-008** — `workspaces(id, slug, name, owner_id, created_at)`, `workspace_members(workspace_id,user_id,role)`, `boards.workspace_id` + backfill `workspace per user`, `invites`.
9. **API workspaces** — `POST /api/workspaces`, `GET /api/workspaces`, `GET /api/workspaces/:id`, `PUT /api/workspaces/:id`, `DELETE`, + `GET /api/workspaces/:id/boards`.
10. **RBAC middleware** — `requireWorkspaceRole(minRole)` dipakai di semua `/workspaces/:id/*` dan `requireBoardRole` di board/task/column; update `router.go:listBoards` dari `WHERE bm.user_id` → `WHERE w.id IN (member workspaces)`.
11. **Frontend** — workspace switcher di `Navbar.tsx` & `boards/page.tsx`, `MemberPanel.tsx` pindah scope workspace.

### Fase 3 — Invites (2-3 hari)
12. **Invite flow** — `POST /api/workspaces/:id/invites {email,role}` → buat token hash + email, `GET /api/invites/:token`, `POST /api/invites/:token/accept|decline`, `DELETE` revoke, `GET /api/workspaces/:id/members`.
13. **Audit** — formalkan `activities` (`workspace_id`, `actor_id`, `action ∈ {workspace.created,member.invited,invite.accepted,board.created,...}`) tulis di setiap mutasi.

### Fase 4 — Billing & Entitlements (4-5 hari)
14. **Migrasi 009** — `subscriptions(workspace_id, stripe_customer_id, stripe_sub_id, plan, status, trial_ends_at, current_period_end)`, `entitlements(workspace_id, max_boards, max_members, features JSON)`.
15. **Stripe** — `POST /api/billing/checkout {workspace_id, plan}`, `POST /api/billing/portal`, `POST /api/webhooks/stripe` (verify signature) → upsert subscription + entitlements.
16. **Enforcement** — middleware `checkEntitlements` di `createBoard`, `addMember` → `403 {code:"limit_reached", limit, upgrade_url}`; homepage pricing `href` ke checkout.

### Fase 5 — Kepatuhan & Observability (2 hari)
17. **GDPR & security** — `DELETE /api/me` (soft delete + anon), `GET /api/me/export`, `password_hash` upgrade path, `rateLimiter` per-workspace (IP + userID + workspaceID), `loggingMiddleware` tambah `workspace_id`.
18. **Tests & CI** — Go unit test per handler dengan `pgxmock`/`testcontainers`, `router_test.go` tambah case OTP/verify/workspace scope; `HEALTH` tambah mailer & stripe ping.

## Validation Plan
- **Fase 0:** `go test ./...`, `go run ./backend --dry-run migrate`, `curl /api/health` → `{"status":"ok"}`.
- **Fase 1:** E2E — register → cek `email_logs` → verify dengan OTP salah (401) → benar (200 + JWT) → login tanpa verify (403) → forgot → reset → login baru sukses. `vitest` login flow.
- **Fase 2:** `listBoards` user A tidak melihat board workspace B; `PUT /boards/:id` dengan role `viewer` → 403; `pgx` query harus ada `workspace_id` predicate (review `router.go`).
- **Fase 3:** invite email ter-kirim (log), accept dengan token expired → 410, accept sukses → `workspace_members` bertambah, revoke → 404.
- **Fase 4:** Stripe CLI `stripe trigger checkout.session.completed` → webhook → `subscriptions.status=active`; `createBoard` melebihi `max_boards` → 403 dengan `upgrade_url`.
- **Fase 5:** `DELETE /api/me` → `SELECT email` anon; rate limit `429` setelah burst; CI `/.github/workflows/ci.yml` hijau.

## Risks / Rollback
- **OTP brute force** — batasi 5 percobaan / 15 menit per email + hash OTP di DB (bukan plain). Rollback: feature flag `AUTH_OTP_ENABLED`.
- **Workspace backfill** — migrasi `boards.workspace_id` bisa lama; gunakan `DEFAULT` + backfill batch + `NOT NULL` di akhir; rollback via `DOWN` migration.
- **Stripe webhook retry** — idempotency key `stripe_event_id` unique; duplikat diabaikan.
- **JWT churn** — tambah refresh endpoint sebelum ubah expiry 24h → tidak invalidate sesi aktif mendadak.

## Open Questions
- Email provider final — Resend vs SES? (butuh domain verifikasi & batas kirim).
- Trial length tetap 14 hari? Pricing di `app/page.tsx` hardcoded `$12` — apakah mau 3 tier `Starter/Pro/Scale` seperti landing?
- Apakah OTP login wajib untuk semua user atau hanya fallback saat password lupa?
- Retention workspaces yang dihapus — soft delete atau hard delete + 30 hari grace?
