'use client';

import { FormEvent, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Mail,
  Lock,
  User,
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

function passwordStrength(pw: string): { label: string; width: string; color: string } {
  if (!pw) return { label: '', width: '0%', color: 'bg-slate-200 dark:bg-slate-700' };
  if (pw.length < 6) return { label: 'Lemah', width: '33%', color: 'bg-red-400' };
  if (pw.length < 10) return { label: 'Cukup', width: '66%', color: 'bg-amber-400' };
  const hasVariety = /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  if (hasVariety) return { label: 'Kuat', width: '100%', color: 'bg-emerald-500' };
  return { label: 'Baik', width: '80%', color: 'bg-emerald-400' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agree) {
      setError('Kamu perlu menyetujui Syarat Layanan & Kebijakan Privasi.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      localStorage.setItem('token', data.token);
      router.push('/boards');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Top bar */}
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
            >
              <Sun className="hidden h-4 w-4 dark:block" />
              <Moon className="h-4 w-4 dark:hidden" />
            </button>
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">Sudah punya akun?</span>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Masuk <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] lg:grid-cols-[1.08fr_0.92fr]">
        {/* Left — value prop for signup */}
        <div className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 lg:block">
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
            <div className="max-w-[520px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-900 dark:bg-emerald-950">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Gratis 14 hari — tanpa kartu kredit</span>
              </div>

              <h1 className="mt-6 text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-900 dark:text-white xl:text-[36px]">
                Buat workspace
                <br />
                untuk tim kamu.
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-slate-600 dark:text-slate-400">
                Daftar 30 detik. Undang anggota tim, impor tugas, dan lihat progress real-time tanpa setup rumit.
              </p>

              <ul className="mt-7 space-y-3">
                {[
                  'Unlimited board & task selama trial — cocok untuk tim 2–50 orang',
                  'Kolaborasi live: cursor, avatars, dan update SSE tanpa refresh',
                  'Ekspor, retensi, dan permission per board untuk kontrol penuh',
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

            {/* Steps / plan teaser */}
            <div className="mt-10 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">CARA MEMULAI</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800">
                  Setup ± 2 menit
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { step: '01', title: 'Buat akun', desc: 'Email kerja & password' },
                  { step: '02', title: 'Undang tim', desc: 'Via email atau link' },
                  { step: '03', title: 'Jalankan board', desc: 'Drag, assign, selesai' },
                ].map((s) => (
                  <div key={s.step} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">{s.step}</div>
                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{s.title}</div>
                    <div className="text-xs leading-4 text-slate-600 dark:text-slate-400">{s.desc}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex -space-x-1.5">
                  <img src="https://i.pravatar.cc/100?img=12" alt="" className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800" />
                  <img src="https://i.pravatar.cc/100?img=14" alt="" className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800" />
                  <img src="https://i.pravatar.cc/100?img=32" alt="" className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800" />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300">1.200+ tim sudah onboard bulan ini</span>
                <span className="ml-auto hidden text-xs font-medium text-emerald-700 dark:text-emerald-400 sm:inline">• Live onboarding</span>
              </div>
            </div>

            {/* Bottom testimonial */}
            <div className="mt-auto pt-10">
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  “Trial 14 hari cukup untuk migrasi semua board kami. Tanpa sales call, tanpa kartu kredit — langsung jalan.”
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <img
                    src="https://i.pravatar.cc/100?img=15"
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Riko Saputra</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Product Manager, Haluan</div>
                  </div>
                  <div className="ml-auto hidden items-center gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex">
                    <ShieldCheck className="h-3.5 w-3.5" /> Data residency ID
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium tracking-wide text-slate-600 dark:text-slate-300">TRIAL DIPERCAYA OLEH</span>
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
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                <Columns3 className="h-4.5 w-4.5 text-white dark:text-slate-900" />
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Kanban Workspace</span>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Buat akun</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Coba gratis 14 hari. Tidak perlu kartu kredit — upgrade kapan pun.
              </p>
            </div>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nama lengkap
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-white/10">
                  <User className="h-4.5 w-4.5 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
                  <input
                    id="name"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white dark:placeholder-slate-500"
                    type="text"
                    placeholder="Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email kerja
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-white/10">
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
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Gunakan email kantor untuk akses SSO nanti.</p>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-white/10">
                  <Lock className="h-4.5 w-4.5 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
                  <input
                    id="password"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white dark:placeholder-slate-500"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
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
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-1.5 rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{strength.label}</span>
                  </div>
                )}
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Gunakan 8+ karakter dengan kombinasi huruf, angka & simbol.</p>
              </div>

              <label className="flex cursor-pointer gap-2.5 py-1">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-slate-600 dark:bg-slate-900"
                />
                <span className="text-sm leading-5 text-slate-600 dark:text-slate-400">
                  Saya menyetujui{' '}
                  <Link href="#" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-white dark:decoration-slate-600 dark:hover:decoration-white">
                    Syarat Layanan
                  </Link>{' '}
                  dan{' '}
                  <Link href="#" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-white dark:decoration-slate-600 dark:hover:decoration-white">
                    Kebijakan Privasi
                  </Link>
                  .
                </span>
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
                    Membuat akun...
                  </>
                ) : (
                  <>
                    Buat akun — gratis <ArrowRight className="h-4 w-4" />
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
                onClick={async () => {
                  try {
                    const data = await apiFetch<{ token: string }>('/api/auth/oauth/google', {
                      method: 'POST',
                      body: JSON.stringify({ email: 'demo@google.com', name: 'Google User' }),
                    });
                    localStorage.setItem('token', data.token);
                    router.push('/boards');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'OAuth gagal');
                  }
                }}
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
              Sudah punya akun?{' '}
              <Link href="/login" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-white dark:decoration-slate-600 dark:hover:decoration-white">
                Masuk
              </Link>
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Terenkripsi
              </span>
              <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
              <span>Tanpa kartu kredit</span>
              <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
              <span>Batalkan kapan pun</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
