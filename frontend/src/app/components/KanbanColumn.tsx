'use client';

import { FormEvent, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Column } from '../../types';
import { useKanbanStore } from '../lib/store';

export default function KanbanColumn({
  column,
  children,
}: {
  column: Column;
  children: React.ReactNode;
}) {
  const { createTask } = useKanbanStore();
  const [taskTitle, setTaskTitle] = useState('');

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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask(column.id, taskTitle.trim());
    setTaskTitle('');
  }

  return (
    <div
      ref={setDroppableRef}
      style={style}
      className={`flex w-[280px] shrink-0 flex-col rounded-lg bg-slate-100 p-3 transition-colors sm:w-auto sm:shrink ${
        isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div ref={setSortableRef} {...attributes} {...listeners}>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600 cursor-grab active:cursor-grabbing">
          {column.title}
          {taskCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-300 px-1.5 text-xs font-medium text-slate-700">
              {taskCount}
            </span>
          )}
        </h2>
      </div>

      <div className="min-h-[4rem] flex-1">
        {children}
        {taskCount === 0 && (
          <div className="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-center">
            <p className="text-xs text-slate-400">No tasks yet</p>
            <p className="text-xs text-slate-300">Drag a card here or add one below</p>
          </div>
        )}
      </div>

      <form onSubmit={onCreate} className="mt-3 flex gap-2">
        <input
          className="w-full rounded border bg-white px-2 py-1.5 text-sm"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="Add a task..."
        />
        <button className="shrink-0 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
          Add
        </button>
      </form>
    </div>
  );
}
