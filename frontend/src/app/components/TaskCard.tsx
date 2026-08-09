'use client';

import Link from 'next/link';
import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';

/* ── Due date helpers ─────────────────────────────────────────── */
function getDueDateInfo(dueDate: string | null): { label: string; color: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Terlambat', color: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800' };
  }
  if (diffDays <= 7) {
    return {
      label: dueDay.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      color: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800',
    };
  }
  return {
    label: dueDay.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
    color: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
  };
}

/* ── Label colors — muted SaaS ─────────────────────────────────────── */
const LABEL_COLORS: Record<string, string> = {
  bug: '#ef4444',
  feature: '#16a34a',
  urgent: '#f97316',
  design: '#9333ea',
  improvement: '#2563eb',
  docs: '#64748b',
};

const AVATAR_COLORS = [
  'bg-slate-700', 'bg-slate-600', 'bg-zinc-600', 'bg-stone-600',
  'bg-neutral-600', 'bg-slate-500', 'bg-zinc-500', 'bg-stone-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-yellow-100 px-0.5 text-inherit dark:bg-yellow-900 dark:text-yellow-100">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function TaskCard({
  boardId,
  task,
  onEdit,
  onDelete,
  isSelected,
  searchQuery,
  readOnly,
}: {
  boardId: string;
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  searchQuery?: string;
  readOnly?: boolean;
}) {
  const isSearching = searchQuery && searchQuery.trim().length > 0;
  const matchesSearch = isSearching
    ? task.title.toLowerCase().includes(searchQuery!.toLowerCase())
    : true;
  const { updateTask } = useKanbanStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [hover, setHover] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dueInfo = useMemo(() => (mounted ? getDueDateInfo(task.due_date) : null), [mounted, task.due_date]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const descPreview = task.description
    ? task.description.length > 80
      ? task.description.slice(0, 80) + '…'
      : task.description
    : null;

  async function save() {
    if (!title.trim() || title === task.title) {
      setTitle(task.title);
      setEditing(false);
      return;
    }
    await updateTask(task.id, { title: title.trim() });
    setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void save();
    if (e.key === 'Escape') {
      setTitle(task.title);
      setEditing(false);
    }
  }

  return (
    <div
      className={`group relative rounded-lg border bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 ${
        isSelected ? 'ring-2 ring-slate-900 dark:ring-white' : 'ring-0'
      } ${isSearching && !matchesSearch ? 'opacity-30' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Hover action buttons */}
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {onEdit && (
          <button
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            onClick={onEdit}
            title="Edit task"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {onDelete && (
          <button
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            onClick={onDelete}
            title="Hapus task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Title */}
      <div className="pr-8">
        {editing ? (
          <input
            autoFocus
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            className="w-full text-left text-[13px] font-medium leading-5 text-slate-900 dark:text-slate-100"
            onClick={() => { if (!readOnly) setEditing(true); }}
            onDoubleClick={() => { if (!readOnly) setEditing(true); }}
          >
            {isSearching ? highlightText(task.title, searchQuery!) : task.title}
          </button>
        )}

        {/* Description preview */}
        {descPreview && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {descPreview}
          </p>
        )}

        {/* Labels */}
        {(task.labels || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(task.labels || []).map((label) => {
              const col = LABEL_COLORS[label] || '#64748b';
              return (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: col + '14',
                    borderColor: col + '30',
                    color: col,
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* Footer: date + assignee */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {dueInfo && (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${dueInfo.color}`}>
                {dueInfo.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {task.assignee ? (
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium text-white ${avatarColor(task.assignee)}`}
                title={task.assignee}
              >
                {task.assignee.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Link
                href={`/boards/${boardId}/tasks/${task.id}`}
                className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 hover:decoration-slate-900 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-white"
              >
                Detail
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
