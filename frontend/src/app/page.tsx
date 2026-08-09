'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Columns3,
  Check,
  ArrowRight,
  ShieldCheck,
  Users,
  Layers,
  Clock,
  Lock,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

export default function Home() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Header — same system as login/register */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-[56px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                <Columns3 className="h-[18px] w-[18px] text-white dark:text-slate-900" strokeWidth={2.2} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Kanban</span>
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex">
                WORKSPACE
              </span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400 md:flex">
              <a href="#fitur" className="hover:text-slate-900 dark:hover:text-white">Fitur</a>
              <a href="#cara-kerja" className="hover:text-slate-900 dark:hover:text-white">Cara kerja</a>
              <a href="#harga" className="hover:text-slate-900 dark:hover:text-white">Harga</a>
              <a href="#faq" className="hover:text-slate-900 dark:hover:text-white">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Ganti tema"
            >
              <Sun className="hidden h-4 w-4 dark:block" />
              <Moon className="h-4 w-4 dark:hidden" />
            </button>
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-flex"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white ring-1 ring-slate-900 transition hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
            >
              Mulai gratis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — asymmetric, not centered pill+headline */}
      <section className="mx-auto max-w-[1280px] px-5 lg:px-8">
        <div className="grid gap-10 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-14">
          {/* Left copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="inline-flex h-5 items-center rounded-full bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800">Baru</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">Timeline & automations untuk tim operasional</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <h1 className="mt-6 max-w-[560px] text-[30px] font-semibold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-[36px] lg:text-[40px]">
              Kerja mengalir,
              <br className="hidden sm:block" />
              <span className="text-slate-500 dark:text-slate-400"> bukan menumpuk.</span>
            </h1>
            <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-slate-600 dark:text-slate-400">
              Kanban adalah papan kerja untuk tim yang butuh kecepatan tanpa chaos. Atur board, kolom, dan task — semua update real-time via SSE, tanpa refresh.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-slate-900 transition hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
              >
                Mulai gratis 14 hari <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#cara-kerja"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Lihat demo
              </a>
              <span className="text-xs text-slate-500 dark:text-slate-400">Tanpa kartu kredit • Batalkan kapan pun</span>
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
              <div className="flex -space-x-2">
                <img src="https://i.pravatar.cc/100?img=11" alt="" className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-950" />
                <img src="https://i.pravatar.cc/100?img=15" alt="" className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-950" />
                <img src="https://i.pravatar.cc/100?img=32" alt="" className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-950" />
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white ring-2 ring-white dark:bg-white dark:text-slate-900 dark:ring-slate-950">
                  +2k
                </span>
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 font-medium text-slate-900 dark:text-white">
                  <span className="text-amber-500">★★★★★</span> 4.8/5
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">dari 1.200+ tim • Setup rata-rata 4 menit</div>
              </div>
              <div className="ml-auto hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live — 8 online
              </div>
            </div>
          </div>

          {/* Right — product preview */}
          <div className="relative">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="ml-3 text-xs font-medium text-slate-600 dark:text-slate-400">Q4 Launch — Kanban</span>
                <span className="ml-auto hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:inline-flex">
                  <Users className="h-3.5 w-3.5" /> 8 anggota
                  <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                  <ShieldCheck className="h-3.5 w-3.5" /> Terenkripsi
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3">
                {[
                  {
                    title: 'To Do',
                    count: 5,
                    cards: [
                      { t: 'Brief kampanye', m: 'Hari ini • Riko' },
                      { t: 'Audit stok gudang', m: 'Besok • Ayu' },
                    ],
                  },
                  {
                    title: 'In Progress',
                    count: 3,
                    cards: [
                      { t: 'Desain landing', m: 'Review • Budi' },
                      { t: 'Setup SSE realtime', m: 'Live • Tim Dev' },
                    ],
                  },
                  {
                    title: 'Done',
                    count: 9,
                    cards: [
                      { t: 'Migrasi board', m: 'Selesai • 2j lalu' },
                      { t: 'Onboarding tim', m: 'Selesai • Kemarin' },
                    ],
                  },
                ].map((col) => (
                  <div
                    key={col.title}
                    className={`rounded-lg border p-2.5 ${col.title === 'Done' ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900' : col.title === 'In Progress' ? 'bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{col.title}</span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {col.count}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {col.cards.map((c) => (
                        <div key={c.t} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                          <div className="text-xs font-medium leading-4 text-slate-900 dark:text-white">{c.t}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.m}</div>
                        </div>
                      ))}
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 p-2.5 text-center text-xs text-slate-400 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-500">
                        + Tambah task
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300 dark:bg-white dark:text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Sinkron real-time — perubahan Ayu muncul di papan kamu
                </span>
                <span className="hidden font-medium text-white dark:text-slate-900 sm:inline">SSE • Tanpa refresh</span>
              </div>
            </div>

            {/* floating comment */}
            <div className="absolute -bottom-6 -left-4 hidden max-w-[280px] rounded-lg border border-slate-200 bg-white p-3 shadow-md dark:border-slate-700 dark:bg-slate-900 lg:block">
              <div className="flex items-center gap-2">
                <img src="https://i.pravatar.cc/100?img=33" alt="" className="h-6 w-6 rounded-full" />
                <span className="text-xs font-medium text-slate-900 dark:text-white">Ayu</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">menambahkan komentar • 1m lalu</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">Brief sudah revisi, cek kolom In Progress ya. Aku assign ke Budi.</p>
            </div>
          </div>
        </div>

        {/* logos */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-slate-100 py-6 dark:border-slate-800">
          <span className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">DIPERCAYA TIM DI</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-semibold tracking-tight text-slate-400 dark:text-slate-500">
            <span className="text-sm">BLOOM</span>
            <span className="text-sm">ARCANA</span>
            <span className="text-sm">NORDISK</span>
            <span className="text-sm">KINTA</span>
            <span className="text-sm">LUMEN</span>
            <span className="text-sm">HALUAN</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">SOC 2 ready • Data residency ID</span>
        </div>
      </section>

      {/* Fitur — avoid identical 3-card grid: use side-by-side list + visual */}
      <section id="fitur" className="mx-auto max-w-[1280px] px-5 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fitur yang dipakai harian, bukan pajangan
            </div>
            <h2 className="mt-3 max-w-[520px] text-[26px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
              Semua ada di papan.<br />
              <span className="text-slate-500 dark:text-slate-400">Tidak perlu tool tambahan.</span>
            </h2>
            <p className="mt-3 max-w-[520px] text-sm leading-6 text-slate-600 dark:text-slate-400">
              Dibuat untuk operasional, bukan sekadar to-do list. Dari brief sampai rilis, satu alur tanpa lompat tool.
            </p>

            <div className="mt-8 space-y-6">
              {[
                {
                  icon: Sparkles,
                  title: 'Realtime yang terasa hidup',
                  desc: 'SSE untuk update instan, cursor tracking, dan avatars. Lihat siapa kerjakan apa — tanpa refresh atau delay.',
                  bullets: ['Drag & drop 60fps', 'Presence & live cursor', 'Activity log per task'],
                },
                {
                  icon: Layers,
                  title: 'Struktur yang ngikutin kamu',
                  desc: 'Board → Kolom → Task. Tambah custom column, atur urutan, pindah antar board tanpa kehilangan konteks.',
                  bullets: ['Kolom fleksibel', 'Task dengan assignee & due date', 'Template board siap pakai'],
                },
                {
                  icon: Lock,
                  title: 'Kontrol akses yang jelas',
                  desc: 'Undang per board, atur role, dan simpan histori. Data tetap di region pilihan, ekspor kapan pun.',
                  bullets: ['Invite per board', 'Retensi & ekspor', 'Audit trail sederhana'],
                },
              ].map((f) => (
                <div key={f.title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <f.icon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{f.desc}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {f.bullets.map((b) => (
                        <li key={b} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} /> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual panel — not bento, single focused mock */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 lg:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Activity & presence</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                Real-time via SSE
              </span>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <img src="https://i.pravatar.cc/100?img=26" alt="" className="h-6 w-6 rounded-full" />
                <span className="font-medium text-slate-900 dark:text-white">Budi</span> memindahkan <span className="font-medium text-slate-900 dark:text-white">“Setup SSE”</span> → In Progress
                <span className="ml-auto text-slate-500 dark:text-slate-400">barusan</span>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="flex -space-x-1.5">
                  <img src="https://i.pravatar.cc/100?img=12" alt="" className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-950" />
                  <img src="https://i.pravatar.cc/100?img=15" alt="" className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-950" />
                  <img src="https://i.pravatar.cc/100?img=33" alt="" className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-950" />
                </div>
                <span className="text-xs leading-6 text-slate-500 dark:text-slate-400">3 orang melihat board ini sekarang</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">12</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Task aktif</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">4.2j</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Rata-rata cycle</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 text-white dark:bg-white dark:text-slate-900">
                  <div className="text-lg font-semibold">98%</div>
                  <div className="text-xs text-slate-300 dark:text-slate-500">On-time</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5" /> Timeline
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-2 w-5/6 rounded bg-slate-900 dark:bg-white" />
                  <div className="h-2 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Users className="h-3.5 w-3.5" /> Workload
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <div className="h-8 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-12 w-full rounded bg-slate-900 dark:bg-white" />
                  <div className="h-6 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-10 w-full rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">Preview — data contoh, bukan screenshot pelanggan.</p>
          </div>
        </div>
      </section>

      {/* Cara kerja — numbered steps with connector */}
      <section id="cara-kerja" className="border-y border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-[1280px] px-5 py-12 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">Dari daftar berantakan jadi alur yang jalan</h2>
            <a href="/register" className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Coba sekarang <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="relative mt-8 grid gap-4 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-[22px] hidden h-px bg-slate-200 dark:bg-slate-700 md:block" aria-hidden />
            {[
              { n: '01', t: 'Buat board', d: 'Pilih template atau mulai kosong. Tambah kolom sesuai proses kamu.' },
              { n: '02', t: 'Isi & assign', d: 'Tambah task, attach file, set due date, dan assign ke pemilik.' },
              { n: '03', t: 'Jalanin live', d: 'Geser kartu, lihat update SSE, dan pantau progress tanpa meeting.' },
            ].map((s) => (
              <div key={s.n} className="relative rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white ring-4 ring-slate-50 dark:bg-white dark:text-slate-900 dark:ring-slate-900">
                  {s.n}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{s.t}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Harga — differentiated cards */}
      <section id="harga" className="mx-auto max-w-[1280px] px-5 py-12 lg:px-8">
        <div className="max-w-[560px]">
          <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">Harga yang masuk akal untuk tim kecil sampai scale</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Mulai gratis, upgrade saat butuh. Semua paket dapat board unlimited selama trial.</p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {/* Starter */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Starter</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Untuk individu & tim baru</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Gratis</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">/ selamanya</span>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> 3 board aktif</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> Kolaborasi basic</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> 30 hari histori</li>
            </ul>
            <Link href="/register" className="mt-6 inline-flex justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              Mulai gratis
            </Link>
          </div>

          {/* Pro — highlighted */}
          <div className="relative flex flex-col rounded-xl border border-slate-900 bg-slate-900 p-6 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900">
            <div className="absolute -top-3 right-6 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
              Paling dipilih
            </div>
            <h3 className="text-sm font-semibold">Pro</h3>
            <p className="text-xs text-slate-300 dark:text-slate-600">Untuk tim yang butuh kecepatan</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">$12</span>
              <span className="text-sm text-slate-300 dark:text-slate-600">/ user / bulan</span>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-100 dark:text-slate-700">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" /> Board & task unlimited</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" /> Realtime SSE + presence</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" /> Timeline & workload</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" /> Retensi & ekspor</li>
            </ul>
            <Link href="/register" className="mt-6 inline-flex justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:hover:bg-black">
              Coba Pro 14 hari
            </Link>
            <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">Tanpa kartu kredit • Downgrade kapan pun</p>
          </div>

          {/* Scale */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Scale</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Untuk org dengan kontrol lebih</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Custom</span>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> SSO & SCIM</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> Data residency & SLA</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> Onboarding & support prioritas</li>
            </ul>
            <a href="mailto:hello@kanban.local" className="mt-6 inline-flex justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              Hubungi sales
            </a>
          </div>
        </div>
      </section>

      {/* Testimonial + FAQ */}
      <section className="mx-auto max-w-[1280px] grid gap-6 px-5 pb-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">“Kami coba 3 tool sebelum Kanban. Yang ini pertama yang bikin tim ops mau pakai tiap hari. Board-nya ringan, realtime-nya nyata, bukan gimmick.”</p>
          <div className="mt-4 flex items-center gap-3">
            <img src="https://i.pravatar.cc/100?img=15" alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Riko Saputra</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Product Manager, Haluan</div>
            </div>
            <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">★★★★★ 5.0</div>
          </div>
        </div>
        <div id="faq" className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pertanyaan cepat</h3>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-slate-900 dark:text-white">Apakah bisa impor dari Trello / CSV?</dt>
              <dd className="mt-1 leading-6 text-slate-600 dark:text-slate-400">Bisa. Impor board via CSV, dan migrasi Trello JSON akan rilis di Pro bulan depan.</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900 dark:text-white">Data disimpan di mana?</dt>
              <dd className="mt-1 leading-6 text-slate-600 dark:text-slate-400">Default di region ID. Paket Scale bisa pilih residency dan retensi kustom.</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900 dark:text-white">Butuh kartu kredit untuk trial?</dt>
              <dd className="mt-1 leading-6 text-slate-600 dark:text-slate-400">Tidak. Daftar dengan email kerja, trial 14 hari langsung aktif.</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Final CTA — dark band, not gradient */}
      <section className="mx-auto max-w-[1280px] px-5 pb-8 lg:px-8">
        <div className="rounded-xl bg-slate-900 px-6 py-8 text-white dark:bg-white dark:text-slate-900 md:flex md:items-center md:justify-between md:px-8">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Siap rapikan alur kerja besok pagi?</h2>
            <p className="mt-1 text-sm text-slate-300 dark:text-slate-600">Buat workspace gratis — undang tim, impor tugas, dan lihat progress live.</p>
          </div>
          <div className="mt-5 flex gap-3 md:mt-0">
            <Link href="/register" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-black">
              Mulai gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 dark:border-slate-300 dark:text-slate-700 dark:hover:bg-slate-50">
              Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-[1280px] px-5 py-8 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                  <Columns3 className="h-4 w-4 text-white dark:text-slate-900" />
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Kanban</span>
              </div>
              <p className="mt-3 max-w-[320px] text-xs leading-5 text-slate-500 dark:text-slate-400">
                Papan kerja untuk tim operasional. Dibuat ringan, realtime, dan bisa diandalkan tiap hari.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
              <div>
                <div className="font-medium text-slate-900 dark:text-white">Produk</div>
                <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-400">
                  <li><a href="#fitur" className="hover:text-slate-900 dark:hover:text-white">Fitur</a></li>
                  <li><a href="#harga" className="hover:text-slate-900 dark:hover:text-white">Harga</a></li>
                  <li><a href="#cara-kerja" className="hover:text-slate-900 dark:hover:text-white">Cara kerja</a></li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">Perusahaan</div>
                <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-400">
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Tentang</a></li>
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Karier</a></li>
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Kontak</a></li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">Legal</div>
                <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-400">
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Privasi</a></li>
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Syarat</a></li>
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Keamanan</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>© 2026 Kanban Workspace. All rights reserved.</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Terenkripsi • SOC 2 ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
