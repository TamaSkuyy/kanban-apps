'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Columns3,
  Check,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      router.push('/boards');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Top bar — minimal SaaS nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-[56px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
              <Columns3 className="h-4.5 w-4.5 text-white dark:text-slate-900" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Kanban</span>
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex">
              WORKSPACE
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Ganti tema"
              title="Ganti tema"
            >
              <Sun className="hidden h-4 w-4 dark:block" />
              <Moon className="h-4 w-4 dark:hidden" />
            </button>
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">Belum punya akun?</span>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Buat akun <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] lg:grid-cols-[1.08fr_0.92fr]">
        {/* Left — value prop */}
        <div className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 lg:block">
          {/* subtle grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          <div className="relative flex min-h-[calc(100vh-56px)] flex-col px-10 py-10 xl:px-12">
            {/* Headline */}
            <div className="max-w-[520px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-900 dark:bg-emerald-950">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Baru — Timeline & Automations</span>
              </div>

              <h1 className="mt-6 text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-900 dark:text-white xl:text-[36px]">
                Semua pekerjaan
                <br />
                mengalir di satu papan.
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-slate-600 dark:text-slate-400">
                Kanban untuk tim yang butuh kecepatan. Track tugas, kolaborasi real-time, dan lihat progress tanpa meeting tambahan.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  'Drag & drop yang mulus, update antar anggota tim instan via SSE',
                  'Board, kolom, dan task — struktur fleksibel untuk workflow apa pun',
                  'Aman dengan enkripsi & kontrol akses per board',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-white">
                      <Check className="h-3 w-3 text-white dark:text-slate-900" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock preview — SaaS dashboard teaser */}
            <div className="mt-10 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="ml-3 text-xs font-medium text-slate-500 dark:text-slate-400">Q4 Launch — Kanban</span>
                <span className="ml-auto hidden items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 sm:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live • 8 online
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3">
                {[
                  { title: 'To Do', count: 5, color: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
                  { title: 'In Progress', count: 3, color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900' },
                  { title: 'Done', count: 9, color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' },
                ].map((col) => (
                  <div key={col.title} className={`rounded-lg border ${col.color} p-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{col.title}</span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {col.count}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-10 rounded-md bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" />
                      <div className="h-10 rounded-md bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" />
                      {col.title === 'Done' && <div className="h-10 rounded-md bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom — social proof */}
            <div className="mt-auto pt-10">
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  “Pindah dari spreadsheet ke Kanban, cycle time kami turun 40%. Setup-nya 5 menit, semua orang langsung paham.”
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <img
                    src="https://i.pravatar.cc/100?img=33"
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Ayu Lestari</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Ops Lead, Nusantara Labs</div>
                  </div>
                  <div className="ml-auto hidden items-center gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex">
                    <ShieldCheck className="h-3.5 w-3.5" /> SOC 2 ready
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium tracking-wide text-slate-600 dark:text-slate-300">DIGUNAKAN OLEH TIM DI</span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-semibold tracking-tight text-slate-400 dark:text-slate-500">
                <span className="text-sm">BLOOM</span>
                <span className="text-sm">ARCANA</span>
                <span className="text-sm">NORDISK</span>
                <span className="text-sm">KINTA</span>
                <span className="text-sm">LUMEN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-white px-5 py-10 dark:bg-slate-950 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[420px]">
            {/* Mobile badge */}
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                <Columns3 className="h-4.5 w-4.5 text-white dark:text-slate-900" />
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Kanban Workspace</span>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Masuk ke workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Gunakan email kantor. Kami akan mengarahkan kamu ke board terakhir.
              </p>
            </div>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email kerja
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 ring-0 transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-white/10">
                  <Mail className="h-4.5 w-4.5 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
                  <input
                    id="email"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white dark:placeholder-slate-500"
                    type="email"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <Link href="#" className="text-xs font-medium text-slate-600 decoration-slate-300 underline-offset-4 hover:underline dark:text-slate-400 dark:decoration-slate-600">
                    Lupa password?
                  </Link>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-white/10">
                  <Lock className="h-4.5 w-4.5 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
                  <input
                    id="password"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white dark:placeholder-slate-500"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Ingat saya di perangkat ini</span>
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" role="alert">
                  {error}
                </div>
              )}

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm ring-1 ring-slate-900 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">atau</span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={() => setError('SSO Google belum diaktifkan untuk workspace ini.')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 015.06 12c0-.72.13-1.43.36-2.09V7.07H2.18A10.98 10.98 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Lanjutkan dengan Google
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Belum punya akun?{' '}
              <Link href="/register" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-white dark:decoration-slate-600 dark:hover:decoration-white">
                Daftar — gratis 14 hari
              </Link>
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Terenkripsi
              </span>
              <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
              <span>SSO & SCIM</span>
              <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
              <span>Retensi data fleksibel</span>
            </div>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
              Dengan masuk, kamu menyetujui{' '}
              <Link href="#" className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-600">
                Syarat Layanan
              </Link>{' '}
              dan{' '}
              <Link href="#" className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-600">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
