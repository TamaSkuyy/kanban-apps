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
    return { label: 'Overdue', color: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' };
  }
  if (diffDays <= 7) {
    return {
      label: dueDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    };
  }
  return {
    label: dueDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
}

/* ── Label colors ─────────────────────────────────────────────── */
const LABEL_COLORS: Record<string, string> = {
  bug: '#ef4444',
  feature: '#22c55e',
  urgent: '#f97316',
  design: '#a855f7',
  improvement: '#3b82f6',
  docs: '#64748b',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
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
      <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-800 dark:text-yellow-100">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/* ── Card accent color from labels ────────────────────────────── */
function cardAccent(labels: string[]): string | undefined {
  const firstLabel = labels.find((l) => l in LABEL_COLORS);
  return firstLabel ? LABEL_COLORS[firstLabel] : undefined;
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
  const accent = cardAccent(task.labels || []);

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
      className={`group relative overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-700 dark:text-slate-100 ${
        isSelected ? 'ring-2 ring-emerald-400' : ''
      } ${isSearching && !matchesSearch ? 'opacity-30' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Colored left accent bar */}
      {accent && (
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: accent }}
        />
      )}

      {/* Hover action buttons */}
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {onEdit && (
          <button
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
            onClick={onEdit}
            title="Edit task"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {onDelete && (
          <button
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
            onClick={onDelete}
            title="Delete task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Title */}
      <div className={accent ? 'pl-2' : ''}>
        {editing ? (
          <input
            autoFocus
            className="w-full rounded-lg border bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-slate-600 dark:border-slate-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            className="w-full pr-10 text-left text-sm font-medium text-slate-700 dark:text-slate-200"
            onDoubleClick={() => { if (!readOnly) setEditing(true); }}
          >
            {isSearching ? highlightText(task.title, searchQuery!) : task.title}
          </button>
        )}

        {/* Description preview */}
        {descPreview && (
          <p className="mt-1 text-xs leading-relaxed text-gray-400 line-clamp-2 dark:text-gray-500">
            {descPreview}
          </p>
        )}

        {/* Labels */}
        {(task.labels || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(task.labels || []).map((label) => (
              <span
                key={label}
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: (LABEL_COLORS as Record<string, string>)[label] + '20' || '#e2e8f0',
                  color: (LABEL_COLORS as Record<string, string>)[label] || '#64748b',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Footer: date + assignee */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {dueInfo && (
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueInfo.color}`}>
                {dueInfo.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {task.assignee ? (
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarColor(task.assignee)}`}
                title={task.assignee}
              >
                {task.assignee.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Link
                href={`/boards/${boardId}/tasks/${task.id}`}
                className="text-[11px] font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
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
