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

export default function TaskCard({ boardId, task }: { boardId: string; task: Task }) {
  const { updateTask } = useKanbanStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const dueInfo = useMemo(() => getDueDateInfo(task.due_date), [task.due_date]);

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
    <div className="rounded border bg-white p-2 shadow-sm">
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
        <button className="w-full text-left text-sm" onDoubleClick={() => setEditing(true)}>
          {task.title}
        </button>
      )}
      <div className="mt-2 flex items-center gap-2">
        {dueInfo && (
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${dueInfo.color}`}>
            {dueInfo.label}
          </span>
        )}
        <Link href={`/boards/${boardId}/tasks/${task.id}`} className="text-xs text-blue-600 hover:text-blue-800">
          Detail
        </Link>
      </div>
    </div>
  );
}
