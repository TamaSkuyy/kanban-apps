'use client';

import Link from 'next/link';
import { KeyboardEvent, useState } from 'react';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';

export default function TaskCard({ boardId, task }: { boardId: string; task: Task }) {
  const { updateTask } = useKanbanStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

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
      <Link href={`/boards/${boardId}/tasks/${task.id}`} className="mt-2 inline-block text-xs text-blue-600">
        Detail
      </Link>
    </div>
  );
}
