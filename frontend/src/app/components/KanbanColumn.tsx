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

  // Sortable for column reordering
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

  // Droppable for task drop detection (column highlight)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      className={`rounded-lg bg-slate-100 p-3 transition-colors ${
        isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div ref={setSortableRef} {...attributes} {...listeners}>
        <h2 className="mb-3 cursor-grab text-sm font-semibold uppercase tracking-wide text-slate-600 active:cursor-grabbing">
          {column.title}
        </h2>
      </div>

      {children}

      <form onSubmit={onCreate} className="mt-3 flex gap-2">
        <input
          className="w-full rounded border bg-white px-2 py-1 text-sm"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="Add task"
        />
        <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white">Add</button>
      </form>
    </div>
  );
}
