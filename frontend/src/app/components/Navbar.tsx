'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Columns3, Sun, Moon, LogOut, ArrowRight } from 'lucide-react';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tokenExists, setTokenExists] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setTokenExists(!!localStorage.getItem('token'));
    setMounted(true);
  }, []);

  function logout() {
    localStorage.removeItem('token');
    setTokenExists(false);
    setMenuOpen(false);
    router.push('/login');
  }

  const navLinks = (
    <>
      {!tokenExists && pathname !== '/login' && (
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" onClick={() => setMenuOpen(false)}>
          Masuk
        </Link>
      )}
      {!tokenExists && pathname !== '/register' && (
        <Link href="/register" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" onClick={() => setMenuOpen(false)}>
          Daftar
        </Link>
      )}
      {!tokenExists && pathname !== '/login' && pathname !== '/register' && (
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white"
          onClick={() => setMenuOpen(false)}
        >
          Mulai gratis <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {tokenExists && (
        <>
          <Link href="/boards" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Boards
          </Link>
          <Link href="/billing" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Billing
          </Link>
          <div className="hidden sm:block">
            <WorkspaceSwitcher />
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex h-[56px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
        <Link href={tokenExists ? '/boards' : '/'} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
            <Columns3 className="h-[18px] w-[18px] text-white dark:text-slate-900" strokeWidth={2.2} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Kanban</span>
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline-flex">
            WORKSPACE
          </span>
        </Link>

        <nav className="hidden items-center gap-5 sm:flex">
          {mounted && navLinks}
          {mounted && (
            <button
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Ganti tema"
              suppressHydrationWarning
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:hidden">
          {mounted && (
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <button
            className="rounded p-1 text-slate-600 dark:text-slate-300"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && mounted && (
        <div className="border-t border-slate-200 bg-white px-5 py-3 sm:hidden dark:border-slate-700 dark:bg-slate-900">
          <nav className="flex flex-col gap-3">{navLinks}</nav>
        </div>
      )}
    </header>
  );
}
