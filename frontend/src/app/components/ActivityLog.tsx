'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
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
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function actionLabel(action: string): { icon: string; text: string } {
  switch (action) {
    case 'task.created':
      return { icon: '➕', text: 'created' };
    case 'task.updated':
      return { icon: '✏️', text: 'updated' };
    case 'task.moved':
      return { icon: '↗️', text: 'moved' };
    case 'task.deleted':
      return { icon: '🗑️', text: 'deleted' };
    default:
      return { icon: '•', text: action };
  }
}

export default function ActivityLog({ boardId }: { boardId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    apiFetch<{ activities: Activity[] }>(`/api/boards/${boardId}/activities`)
      .then((data) => setActivities(data.activities))
      .catch(() => {
        // silent
      });
  }, [open, boardId]);

  return (
    <>
      <button
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 ${
          open
            ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
        }`}
        onClick={() => setOpen(!open)}
      >
        <History className="h-3.5 w-3.5" />
        {open ? 'Hide Activity' : 'Activity'}
      </button>

      {open && (
        <div className="w-full rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          {activities.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400">No activity yet — start moving tasks! 🚀</p>
          )}
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {activities.map((a) => {
              const { icon, text } = actionLabel(a.action);
              return (
                <li key={a.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <span className="shrink-0 text-xs">{icon}</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    <strong className="font-semibold text-slate-800 dark:text-slate-100">{a.detail}</strong>{' '}
                    <span className="text-slate-400">{text}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-slate-400" suppressHydrationWarning>
                    {mounted ? timeAgo(a.created_at) : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
