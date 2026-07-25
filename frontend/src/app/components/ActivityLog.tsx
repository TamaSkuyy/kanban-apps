'use client';

import { useEffect, useState } from 'react';
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
        className="mb-4 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide Activity' : 'Show Activity'} 📜
      </button>

      {open && (
        <div className="mb-6 max-h-64 overflow-y-auto rounded-lg border bg-white p-3 dark:bg-slate-800 dark:border-slate-700">
          {activities.length === 0 && (
            <p className="py-3 text-center text-xs text-slate-400">No activity yet.</p>
          )}
          <ul className="space-y-1.5">
            {activities.map((a) => {
              const { icon, text } = actionLabel(a.action);
              return (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="shrink-0">{icon}</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    <strong className="font-medium text-slate-800 dark:text-slate-100">{a.detail}</strong>{' '}
                    {text}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-slate-400" suppressHydrationWarning>
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
