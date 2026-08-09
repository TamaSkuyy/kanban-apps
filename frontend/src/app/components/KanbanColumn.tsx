'use client';

import { FormEvent, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { Column } from '../../types';
import { useKanbanStore } from '../lib/store';

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
      className={`flex w-[296px] shrink-0 flex-col rounded-xl border bg-slate-50 p-3 transition dark:border-slate-800 dark:bg-slate-900 ${
        isOver ? 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800' : 'border-slate-200'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* ── Column header ─────────────────── */}
      <div ref={setSortableRef} {...attributes} {...listeners} className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
        <h2 className="truncate text-[13px] font-semibold text-slate-700 dark:text-slate-300">
          {column.title}
        </h2>
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {taskCount}
        </span>
      </div>

      {/* ── Task list ──────────────────────── */}
      <div className="min-h-[4rem] flex-1">
        {children}
        {taskCount === 0 && !adding && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Belum ada task</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Tambah di bawah</p>
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
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-white/10"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Judul task..."
              onKeyDown={(e) => e.key === 'Escape' && cancelAdding()}
            />
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
                type="submit"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Tambah
              </button>
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                type="button"
                onClick={cancelAdding}
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <button
            className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            onClick={startAdding}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Tambah task
          </button>
        )}
      </div>
      )}
    </div>
  );
}
