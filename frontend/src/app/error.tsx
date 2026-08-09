'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft, Mail, Columns3 } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto flex max-w-[640px] flex-col items-center">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
            <Columns3 className="h-4 w-4 text-white dark:text-slate-900" />
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Kanban</span>
        </Link>

        <div className="mt-8 w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">Ada yang tidak beres</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Kami menemui kesalahan saat memuat halaman ini. Coba muat ulang, atau kembali ke workspace.
              </p>
            </div>
          </div>

          {/* Error detail */}
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Detail kesalahan</p>
            <p className="mt-1 break-words font-mono text-xs text-slate-700 dark:text-slate-300">{error.message || 'Unknown error'}</p>
            {error.digest && <p className="mt-1 font-mono text-[11px] text-slate-500">ID: {error.digest}</p>}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" /> Coba lagi
            </button>
            <Link
              href="/boards"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Boards
            </Link>
            <a
              href="mailto:support@kanban.local"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Mail className="h-4 w-4" /> Hubungi support
            </a>
          </div>

          <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Jika masalah berlanjut, salin ID di atas dan kirim ke tim. Data board kamu tetap aman — kesalahan ini tidak menghapus task.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Kanban Workspace • Status: <a href="/api/health" className="underline decoration-slate-300 hover:decoration-slate-500">api/health</a>
        </p>
      </div>
    </div>
  );
}
