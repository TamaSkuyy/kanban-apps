'use client';

import Link from 'next/link';
import { KeyboardEvent, useMemo, useState } from 'react';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';

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
    return { label: 'Overdue', color: 'bg-red-100 text-red-700' };
  }
  if (diffDays <= 7) {
    return { label: dueDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'bg-yellow-100 text-yellow-700' };
  }
  return { label: dueDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'bg-green-100 text-green-700' };
}

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
      <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function TaskCard({
  boardId,
  task,
  onEdit,
  onDelete,
  isSelected,
  searchQuery,
}: {
  boardId: string;
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  searchQuery?: string;
}) {
  const isSearching = searchQuery && searchQuery.trim().length > 0;
  const matchesSearch = isSearching
    ? task.title.toLowerCase().includes(searchQuery!.toLowerCase())
    : true;
  const { updateTask } = useKanbanStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [hover, setHover] = useState(false);
  const dueInfo = useMemo(() => getDueDateInfo(task.due_date), [task.due_date]);
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
      className={`group relative rounded border bg-white p-2 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
        isSelected ? 'ring-2 ring-blue-400 border-blue-400' : ''
      } ${isSearching && !matchesSearch ? 'opacity-30' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Hover action buttons */}
      {hover && !editing && (
        <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={onEdit}
              title="Edit task"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              onClick={onDelete}
              title="Delete task"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Title */}
      {editing ? (
        <input
          autoFocus
          className="w-full rounded border px-2 py-1 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            void save();
          }}
          onKeyDown={onKeyDown}
        />
      ) : (
        <button className="w-full pr-10 text-left text-sm" onDoubleClick={() => setEditing(true)}>
          {isSearching ? highlightText(task.title, searchQuery!) : task.title}
        </button>
      )}

      {/* Description preview */}
      {descPreview && (
        <p className="mt-1 text-xs leading-relaxed text-slate-400 line-clamp-2">{descPreview}</p>
      )}

      {/* Labels */}
      {(task.labels || []).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {(task.labels || []).map((label) => (
            <span
              key={label}
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: (LABEL_COLORS as Record<string, string>)[label] + '20' || '#e2e8f0',
                color: (LABEL_COLORS as Record<string, string>)[label] || '#64748b',
                border: `1px solid ${(LABEL_COLORS as Record<string, string>)[label] + '40' || '#cbd5e1'}`,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: badges + detail link */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {dueInfo && (
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${dueInfo.color}`}>
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
            <Link href={`/boards/${boardId}/tasks/${task.id}`} className="text-xs text-blue-600 hover:text-blue-800">
              Detail
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
