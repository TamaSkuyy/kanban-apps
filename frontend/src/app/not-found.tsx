import Link from 'next/link';
import { SearchX, ArrowLeft, Columns3, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto flex max-w-[640px] flex-col items-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
            <Columns3 className="h-4 w-4 text-white dark:text-slate-900" />
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Kanban</span>
        </Link>

        <div className="mt-8 w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <SearchX className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </span>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">Halaman tidak ditemukan</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                URL yang kamu buka tidak ada atau sudah dipindahkan. Periksa kembali link atau kembali ke workspace.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400">Kode</p>
            <p className="mt-0.5 font-mono text-sm font-medium text-slate-700 dark:text-slate-300">404 — Not Found</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/boards" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              <Home className="h-4 w-4" /> Ke Boards
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <ArrowLeft className="h-4 w-4" /> Ke landing
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">Butuh bantuan? Hubungi support@kanban.local</p>
      </div>
    </div>
  );
}
