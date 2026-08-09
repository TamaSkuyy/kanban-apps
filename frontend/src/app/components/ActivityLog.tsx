'use client';

import { useEffect, useState, useMemo } from 'react';
import { History, X, Clock, Plus, Pencil, ArrowRight, Trash2, FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Activity {
  id: string;
  board_id: string;
  user_id: string;
  action: string;
  detail: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Baru saja';
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}h lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

type Filter = 'all' | 'created' | 'moved' | 'updated' | 'deleted';

function meta(action: string): { label: string; icon: React.ElementType; dot: string } {
  if (action.includes('created')) return { label: 'Dibuat', icon: Plus, dot: 'bg-emerald-500' };
  if (action.includes('moved')) return { label: 'Dipindahkan', icon: ArrowRight, dot: 'bg-amber-500' };
  if (action.includes('deleted')) return { label: 'Dihapus', icon: Trash2, dot: 'bg-red-500' };
  if (action.includes('updated')) return { label: 'Diperbarui', icon: Pencil, dot: 'bg-slate-500' };
  return { label: action, icon: FileText, dot: 'bg-slate-400' };
}

export default function ActivityLog({ boardId }: { boardId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<{ activities: Activity[] }>(`/api/boards/${boardId}/activities`)
      .then((d) => setActivities(d.activities))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, boardId]);

  const filtered = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter((a) => a.action.includes(filter));
  }, [activities, filter]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <History className="h-4 w-4" />
        Aktivitas
        {activities.length > 0 && <span className="ml-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white dark:bg-white dark:text-slate-900">{activities.length}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] dark:bg-slate-950/40" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <History className="h-4 w-4 text-slate-500" /> Aktivitas board
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{filtered.length} kejadian • sinkron real-time</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              {(['all', 'created', 'moved', 'updated', 'deleted'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                >
                  {f === 'all' ? 'Semua' : f === 'created' ? 'Dibuat' : f === 'moved' ? 'Pindah' : f === 'updated' ? 'Ubah' : 'Hapus'}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto px-5 py-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-50 dark:bg-slate-800/50" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <Clock className="h-6 w-6 text-slate-400" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">Belum ada aktivitas</p>
                  <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-500 dark:text-slate-400">Mulai pindahkan task antar kolom — riwayat akan muncul di sini dengan cap waktu.</p>
                </div>
              ) : (
                <ul className="relative">
                  <div className="absolute bottom-0 left-[11px] top-0 w-px bg-slate-100 dark:bg-slate-800" aria-hidden />
                  {filtered.map((a) => {
                    const { label, icon: Icon, dot } = meta(a.action);
                    return (
                      <li key={a.id} className="relative flex gap-3 py-3">
                        <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white dark:border-slate-900 dark:bg-slate-900`}>
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${dot} text-white`}>
                            <Icon className="h-3 w-3" />
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-5 text-slate-700 dark:text-slate-300">
                            <span className="font-medium text-slate-900 dark:text-white">{a.detail}</span>
                            <span className="mx-1 text-slate-400">•</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" /> {timeAgo(a.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Update via SSE • Auto-refresh saat board berubah
            </div>
          </div>
        </div>
      )}
    </>
  );
}
