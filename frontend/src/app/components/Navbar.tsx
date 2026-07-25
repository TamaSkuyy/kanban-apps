'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Columns3, Sun, Moon, LogOut } from 'lucide-react';

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
          Login
        </Link>
      )}
      {!tokenExists && pathname !== '/register' && (
        <Link href="/register" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" onClick={() => setMenuOpen(false)}>
          Register
        </Link>
      )}
      {tokenExists && (
        <button
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        {/* Left: Logo + brand */}
        <Link href="/boards" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Columns3 className="h-6 w-6 text-emerald-500" strokeWidth={2.2} />
          <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
            Kanban
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 sm:flex">
          {mounted && (
            <>
              {navLinks}
              <button
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Toggle theme"
                suppressHydrationWarning
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <div className="sm:hidden">
          <button
            className="rounded p-1 text-slate-600"
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

      {/* Mobile dropdown */}
      {menuOpen && mounted && (
        <div className="border-t bg-white px-4 py-3 sm:hidden dark:bg-slate-900 dark:border-slate-700">
          <nav className="flex flex-col gap-3">{navLinks}</nav>
        </div>
      )}
    </header>
  );
}
