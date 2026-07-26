'use client';

import { FormEvent, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { Column } from '../../types';
import { useKanbanStore } from '../lib/store';

/* Column dot colors — cycle based on position */
const DOT_COLORS = ['bg-blue-400', 'bg-amber-400', 'bg-green-400', 'bg-violet-400', 'bg-rose-400'];

export default function KanbanColumn({
  column,
  children,
  readOnly,
}: {
  column: Column;
  children: React.ReactNode;
  readOnly?: boolean;
}) {
  const { createTask } = useKanbanStore();
  const [taskTitle, setTaskTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tasks = column.tasks || [];
  const taskCount = tasks.length;
  const dotColor = DOT_COLORS[tasks.length > 0 ? 0 : 0]; // position-based fallback

  function startAdding() {
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelAdding() {
    setTaskTitle('');
    setAdding(false);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) {
      cancelAdding();
      return;
    }
    await createTask(column.id, taskTitle.trim());
    setTaskTitle('');
    setAdding(false);
  }

  return (
    <div
      ref={setDroppableRef}
      style={style}
      data-kanban-column
      className={`flex w-72 shrink-0 flex-col rounded-2xl bg-slate-100/80 p-4 backdrop-blur-sm transition-all dark:bg-slate-800/80 ${
        isOver ? 'ring-2 ring-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* ── Column header ─────────────────── */}
      <div ref={setSortableRef} {...attributes} {...listeners} className="mb-4 flex items-center gap-2.5">
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {column.title}
        </h2>
        {taskCount > 0 && (
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-gray-500 shadow-sm dark:bg-slate-700 dark:text-slate-300">
            {taskCount}
          </span>
        )}
      </div>

      {/* ── Task list ──────────────────────── */}
      <div className="min-h-[4rem] flex-1">
        {children}
        {taskCount === 0 && !adding && (
          <div className="rounded-xl border-2 border-dashed border-slate-300/80 p-5 text-center dark:border-slate-600/80">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No tasks yet</p>
            <p className="mt-0.5 text-xs text-slate-300 dark:text-slate-600">Add one below ✨</p>
          </div>
        )}
      </div>

      {/* ── Add task ──────────────────────── */}
      {!readOnly && (
      <div className="mt-3">
        {adding ? (
          <form onSubmit={onCreate} className="space-y-2">
            <input
              ref={inputRef}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-700 placeholder-gray-400 shadow-sm outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-emerald-400 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task title..."
              onKeyDown={(e) => e.key === 'Escape' && cancelAdding()}
            />
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-200 transition-all hover:scale-[1.03] hover:bg-emerald-600 active:scale-95 dark:shadow-none"
                type="submit"
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
                Add
              </button>
              <button
                className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700"
                type="button"
                onClick={cancelAdding}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="flex w-full items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300/80 px-3 py-2.5 text-xs font-medium text-slate-400 transition-all hover:border-emerald-300 hover:text-emerald-500 dark:border-slate-600/80 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
            onClick={startAdding}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add a task...
          </button>
        )}
      </div>
      )}
    </div>
  );
}
