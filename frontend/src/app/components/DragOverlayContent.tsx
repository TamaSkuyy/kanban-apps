'use client';

import { useKanbanStore } from '../lib/store';
import TaskCard from './TaskCard';
import { Column } from '../../types';

export default function DragOverlayContent({
  activeId,
  activeType,
}: {
  activeId: string;
  activeType: 'task' | 'column';
}) {
  const currentBoard = useKanbanStore((s) => s.currentBoard);

  if (!currentBoard?.columns) return null;

  if (activeType === 'task') {
    for (const col of currentBoard.columns) {
      const task = col.tasks.find((t) => t.id === activeId);
      if (task) {
        return (
          <div className="rotate-1 scale-105 opacity-90 shadow-xl">
            <TaskCard boardId={currentBoard.id} task={task} />
          </div>
        );
      }
    }
  }

  if (activeType === 'column') {
    const column: Column | undefined = currentBoard.columns.find((c) => c.id === activeId);
    if (column) {
      return (
        <div className="w-72 rounded-lg bg-slate-100 p-3 opacity-90 shadow-xl">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
            {column.title}
          </h2>
          <div className="space-y-2">
            {column.tasks.map((task) => (
              <TaskCard key={task.id} boardId={currentBoard.id} task={task} />
            ))}
          </div>
        </div>
      );
    }
  }

  return null;
}
