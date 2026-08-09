# Kanban SaaS — Technical TODO & Roadmap

> **Status:** Frontend SaaS redesign selesai (login, register, landing, boards, board detail, task detail + dark mode). Backend SaaS foundation sudah dibuat (migrasi + OTP/verify/billing stubs) — lanjut eksekusi bertahap.

Dokumen ini adalah **checklist teknis** supaya app jadi SaaS beneran, bukan cuma landing. Centang sesuai prioritas.

---

## 0) Fondasi (Sudah Dikerjakan)
- [x] Migrasi `005_create_board_members_and_activities` — `board_members` + `activities` (RBAC + audit)
- [x] Migrasi `006_saas_auth` — `users.name`, `email_verified_at`, `labels JSONB`, `otps`, `password_resets`, `email_logs`
- [x] Migrasi `007_create_workspaces` — `workspaces`, `workspace_members`, `boards.workspace_id`, `invites`
- [x] Migrasi `008_create_billing` — `subscriptions`, `entitlements`, `stripe_events`
- [x] `backend/mailer.go` — `Mailer` interface + `logMailer` (dev) + template OTP/reset/invite
- [x] `backend/auth.go` — `GenerateResetToken`, `GenerateOTP`, `HashToken`
- [x] `backend/saas.go` — `createOTP`, `verifyOTP`, `verifyEmail`, `requestOTP`, `verifyOTPLogin`, `forgotPassword`, `resetPassword`, `createWorkspace`, `listWorkspaces`, `checkEntitlements`, `billingCheckout/Portal`, `stripeWebhook`
- [x] `backend/router.go` — routes: `/auth/verify`, `/auth/otp/*`, `/auth/forgot|reset`, `/webhooks/stripe`, `/workspaces`, `/billing/*`; `register` terima `name` + kirim OTP verify
- [x] Frontend dark mode full: login, register, landing, boards, detail board, detail task
- [x] `TODO_SAAS.md` ini

## 1) Auth Proper (Next)
- [ ] **Enforce email_verified** — middleware atau check di `login`/`me` → 403 jika belum verify (dengan bypass dev flag `SKIP_VERIFY=1`)
- [ ] **Rate limit OTP** — 5 percobaan/15m per email + cooldown 60s; simpan `attempts` sudah ada, tambah check di `createOTP`
- [ ] **Password reset email real** — ganti `logMailer` → `Resend`/`SES` saat `RESEND_API_KEY` ada; template HTML proper
- [ ] **Refresh token** — `POST /auth/refresh` dengan `refresh_token` httpOnly cookie (akses 15m, refresh 7d)
- [ ] **Tests** — `auth_test.go` tambah `TestGenerateOTP`, `TestVerifyOTP Flow` dengan `pgxmock`

## 2) Workspaces & RBAC (Multi-tenant)
- [ ] **Board scoping** — ubah `listBoards`, `createBoard`, `getBoardData` filter `workspace_id`; tambah `GET /workspaces/:id/boards`
- [ ] **Workspace CRUD** — `PUT /workspaces/:id`, `DELETE` + `requireWorkspaceRole` middleware
- [ ] **Backfill** — job satu kali: tiap user dapat workspace `personal` slug `user-{id}` + pindahkan boards `workspace_id=NULL` → personal
- [ ] **Frontend switcher** — `Navbar` + `boards/page` tampilkan workspace selector + `POST /workspaces` modal
- [ ] **Member panel scope** — `MemberPanel` baca/tulis `workspace_members` bukan `board_members` (board inherit workspace)

## 3) Invites & Sharing
- [ ] **Invite CRUD** — `POST /workspaces/:id/invites`, `GET /invites/:token`, `POST /invites/:token/accept|decline`, `DELETE revoke`; hash token SHA256, expiry 7d
- [ ] **Email invite** — `mailInvite` dengan link `APP_URL/invite/:token`
- [ ] **Accept flow** — jika user belum ada → redirect register + auto-accept setelah verify
- [ ] **Frontend** — halaman `/invite/:token` + banner pending invites di boards

## 4) Billing & Entitlements (Stripe)
- [ ] **Env & keys** — `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_SCALE`
- [ ] **Checkout** — `POST /billing/checkout {workspace_id, plan}` buat `stripe.CheckoutSession` → return `url`
- [ ] **Portal** — `POST /billing/portal` buat `stripe.BillingPortalSession`
- [ ] **Webhook** — verifikasi `Stripe-Signature`, handle `checkout.session.completed`, `customer.subscription.updated|deleted` → upsert `subscriptions` + `entitlements` (starter 3/3, pro 100/50, scale unlimited)
- [ ] **Enforcement** — `checkEntitlements` di `createBoard` & `addMember` → `403 {code:"limit_reached", upgrade_url:"/#harga"}`
- [ ] **Frontend** — `app/page.tsx` pricing CTA → checkout, `boards/page` limit banner, billing page `GET /billing/subscription`

## 5) Kepatuhan & Hardening
- [ ] **GDPR** — `DELETE /api/me` anon email → `deleted_user_{id}@example.com`, `GET /api/me/export` JSON dump
- [ ] **Rate limit per-workspace** — `rate.Limit` key = `ip + userID + workspaceID`
- [ ] **Audit lengkap** — `activities.workspace_id` wajib; tulis untuk `workspace.created`, `invite.sent/accepted`, `board.created`, `member.role_changed`
- [ ] **Observability** — `slog` tambah `workspace_id`, `board_id`; `GET /health` cek DB + mailer + stripe
- [ ] **Backup & migrasi prod** — `golang-migrate` atau `tern` runner di `main.go`; `Caddyfile` prod sudah ada

## 6) Nice-to-have (Setelah SaaS inti jalan)
- [ ] OAuth Google (`POST /auth/oauth/google`) — toggle `Lanjutkan dengan Google` sudah ada di login/register
- [ ] API keys per workspace (`workspace_api_keys`)
- [ ] Webhooks user-defined (`workspace_webhooks` → POST event task/board)
- [ ] Data residency pilihan (kolom `workspaces.region`)
- [ ] Audit log UI drawer di board detail (komponen `ActivityLog` sudah ada, tinggal scope workspace)

---

### Cara Pakai
1. Jalankan migrasi (Docker dev otomatis mount `backend/migrations` — pakai `migrate -path migrations -database $DATABASE_URL up`)
2. Set env dev: `APP_URL=http://localhost:3000` `LOG_MAIL_BODY=1` untuk lihat OTP di log
3. `GOCACHE=/tmp/go-cache go test ./...` harus hijau sebelum merge
4. Frontend sudah siap toggle billing: ganti stub `billingCheckout` → Stripe real, landing `#harga` akan langsung jalan

---

### Checklist Cepat untuk Demo
- [ ] Register → cek log OTP → `POST /api/auth/verify` → login sukses
- [ ] Lupa password → `POST /api/auth/forgot` → `POST /api/auth/reset`
- [ ] Buat workspace → buat board → melebihi limit starter → 403 limit
- [ ] Invite member → accept → role viewer tidak bisa `PUT /boards/:id`

_File ini adalah source of truth SaaS; update tiap fase selesai._
