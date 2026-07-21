'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tokenExists, setTokenExists] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => setMenuOpen(false)}>
          Login
        </Link>
      )}
      {!tokenExists && pathname !== '/register' && (
        <Link href="/register" className="text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => setMenuOpen(false)}>
          Register
        </Link>
      )}
      {tokenExists && (
        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" onClick={logout}>
          Logout
        </button>
      )}
    </>
  );

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/boards" className="text-lg font-semibold text-slate-900">
          Kanban
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 sm:flex">
          {mounted && navLinks}
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
        <div className="border-t bg-white px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-3">{navLinks}</nav>
        </div>
      )}
    </header>
  );
}
