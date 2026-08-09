# Core Sellable — Board UX untuk Startup/UMKM (2-20 orang)

## Goal
Ubah core Kanban (board/column/task) dari “fungsional” jadi “terasa mahal & hidup” untuk UMKM/startup 2-20 orang, tanpa mengubah stack (Go/Gin + Next.js) dan tanpa melanggar taste (clean slate-900, bukan purple/emoji/glassmorphism). Fokus: board UX kolaborasi yang bikin tim kecil langsung paham value dalam 2 menit.

## Success Criteria
- New user yang baru register bisa lihat **demo board 1-klik** + tour 30 detik, tanpa bingung “kosong harus ngapain”.
- Drag task antar kolom terasa “premium”: 60fps, ghost jelas, drop feedback, undo tanpa takut.
- Kolaborasi terlihat hidup: avatar, live cursor, dan “siapa lagi lihat board ini” tanpa meeting.
- Template UMKM siap pakai (Warung, Agency, Sprint) → time-to-first-task < 1 menit.

## Context And Current Facts
- **Board list** `frontend/src/app/boards/page.tsx` sudah SaaS (grid/list, search, workspace switcher) tapi empty state masih ikon `Clock3` generik.
- **Board detail** `frontend/src/app/boards/[boardId]/page.tsx` header sudah ada workspace select + theme top border, tapi belum demo data / template picker.
- **KanbanBoard** `frontend/src/app/components/KanbanBoard.tsx` pakai `@dnd-kit` `horizontalListSortingStrategy` untuk kolom, `verticalListSortingStrategy` untuk task, `PointerSensor distance 5`. `KanbanColumn` masih `rounded-xl border-slate-200 bg-slate-50`, `TaskCard` `rounded-lg border-slate-200` dengan label/due date, tapi belum ada quick add yang “cepat” (harus klik `Tambah task` → input → Enter).
- **Invite & billing** sudah jalan (workspace, `/invite/[token]`, `/billing`), tapi board UX sendiri belum “menjual” — belum ada social proof di dalam board.
- **Taste constraints** `bundled:taste` melarang: purple gradient, `bg-clip-text`, `rounded-2xl` seragam, `hover:scale`, emoji, left-border accent, glassmorphism di semua surface.

## Constraints And Non-goals
- Tetap `slate-900` primary + `emerald` accent, `rounded-lg/xl` varian, `dark:` support. Jangan ganti font system atau tambah ilustrasi scribbly.
- Tidak sentuh billing logic atau migrasi DB baru di fase ini (cukup tambah `board_templates` JSON di frontend).
- Tidak buat editor WYSIWYG berat; markdown preview yang sudah ada cukup.
- No-go: bento grid untuk board, 3-card feature grid identik di dalam board.

## Key Decisions
| Pilihan | Rekomendasi | Ditolak & alasan |
|---|---|---|
| Demo data | **Seed 1 board “Contoh: Warung Kopi”** dengan 3 kolom + 5 task nyata (ada assignee & due date) + tombol “Coba drag task ini →” | Board kosong total — UMKM bingung, bounce tinggi |
| Template | **3 template UMKM** di create-board modal (Kosong / Warung / Sprint) — JSON inline, tanpa DB baru | DB `board_templates` — over-engineering untuk 2-20 orang |
| Quick capture | **Inline “Tekan N” + `+` di header kolom yang fokus langsung** + `Cmd+Enter` save | Modal terpisah — lambat |
| Kolaborasi signal | **Perkuat existing** `OnlineAvatars` + `RemoteCursors` + `ActivityLog` drawer: tambah “2 orang lihat board ini • Rina sedang drag” di header | Chat komentar real-time — scope besar, belum perlu |
| Visual premium | **Subtle motion** `prefers-reduced-motion` aware: `task-enter 0.2s`, `drop-bounce 0.25s`, ghost `shadow-lg` (bukan `scale-105`) | `hover:scale-105` & `glassmorphism` — AI-slop |

## Recommended Approach
Pakai pola existing, tinggal poles:
1. **Onboarding di board kosong** — jika `boards.length===0` tampilkan card `Coba template` (Warung/Agency/Sprint) + tombol `Buat dari template` yang panggil `createBoard` + `createTask` batch. Jika `columns.length===3 && tasks.length===0` di board detail, banner `Board ini kosong — tambah task pertama atau coba drag contoh`.
2. **Create-board modal** — ubah `boards/page.tsx` `creating` card dari input polos jadi modal `rounded-xl border-slate-200 bg-white` dengan 3 template pill (`Kosong`, `Warung: Pesanan → Proses → Selesai`, `Sprint: Backlog → Doing → Done`) — pilih template → buat board + kolom + task contoh.
3. **Board header kolaborasi** — di `boards/[boardId]/page.tsx` tambah bar kecil di bawah title: `OnlineAvatars` + `Live • 2` + `ActivityLog` ringkas “Rina memindahkan ‘Kirim invoice’ 2j lalu” (ambil dari `activities` yang sudah ada).
4. **Column & Task polish** — `KanbanColumn` header `Add task` jadi `+` sticky di bawah, input `rounded-lg` + `Enter` langsung, `TaskCard` hover `Pencil/Trash` sudah ada, tambah `assignee` avatar kecil + `due date` amber jika H-3 (sudah ada `getDueDateInfo`).
5. **Demo & tour** — tombol `?` → `ShortcutsHelp` sudah ada, tambah 3-step spotlight (pakai `focus` tanpa overlay gelap berat) yang highlight `drag handle` → `Add task` → `Invite`.

## Work Plan
1. **Template + empty state** — `frontend/src/app/boards/page.tsx` (create modal), `frontend/src/app/boards/[boardId]/page.tsx` (empty banner), `shared/types.ts` tidak perlu DB. Dep: tidak ada. 
2. **Header kolaborasi** — `boards/[boardId]/page.tsx` bar online + activity snippet, `frontend/src/app/components/OnlineAvatars.tsx` styling slate (sudah). Dep: 1.
3. **Column quick capture** — `KanbanColumn.tsx` input auto-focus + `N` shortcut sudah ada di `KanbanBoard.tsx` (`useKeyboardShortcuts`), poles `Plus` button hover `border-slate-300`. Dep: 1.
4. **Motion premium** — `globals.css` cek `prefers-reduced-motion`, `TaskCard` `animate-task-enter` sudah ada, pastikan tidak `hover:scale`. Dep: 3.

## Validation Plan
- `GOCACHE=/tmp/go-cache go vet ./...` + `npm run build` (8/8 pages) harus hijau.
- Manual: register → lihat “Coba template Warung” → klik → board terisi 3 kolom 5 task → drag 1 task `To Do → In Progress` → cek `column_count/task_count` di card update, `ActivityLog` muncul `dipindahkan`, `OnlineAvatars` muncul 1.
- E2E (headless `docker compose exec`): `POST /api/boards {title, workspace_id, template:'warung'}` → `GET /api/boards/:id` cek `columns.length===3`.
- Non-goal check: tidak ada `bg-clip-text`, `rounded-2xl` seragam, `hover:scale`.

## Risks / Rollback
- Template JSON inline bisa salah `position` → rollback hapus template, fallback `Kosong`.
- Motion 60fps di low-end → `prefers-reduced-motion` matikan `animate-task-enter`.
- Invite/board inherit tetap `workspace_members` — tidak ubah.

## Open Questions
- Template UMKM mau pakai bahasa ID penuh atau mix ID/EN? Asumsi ID (Warung) sesuai landing yang sudah ID.
- Perlu `board_templates` di DB untuk analytics? Untuk sekarang hardcode, next bisa DB jika traction bagus.

