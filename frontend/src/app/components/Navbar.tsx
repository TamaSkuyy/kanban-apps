'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const tokenExists = typeof window !== 'undefined' && !!localStorage.getItem('token');

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/boards" className="font-semibold">
          Kanban
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {!tokenExists && pathname !== '/login' && <Link href="/login">Login</Link>}
          {!tokenExists && pathname !== '/register' && <Link href="/register">Register</Link>}
          {tokenExists && (
            <button className="rounded bg-slate-900 px-3 py-1 text-white" onClick={logout}>
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
