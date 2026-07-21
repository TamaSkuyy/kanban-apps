'use client';

import { FormEvent, useState } from 'react';
import { Column } from '../../types';
import { useKanbanStore } from '../lib/store';
import TaskCard from './TaskCard';

export default function KanbanColumn({ column }: { column: Column }) {
  const { currentBoard, createTask, moveTaskOptimistic } = useKanbanStore();
  const [taskTitle, setTaskTitle] = useState('');

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask(column.id, taskTitle.trim());
    setTaskTitle('');
  }

  return (
    <div
      className="rounded-lg bg-slate-100 p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const taskId = e.dataTransfer.getData('taskId');
        const sourceColumnId = e.dataTransfer.getData('columnId');
        if (!taskId || !sourceColumnId) return;
        void moveTaskOptimistic(taskId, sourceColumnId, column.id);
      }}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">{column.title}</h2>
      <div className="space-y-2">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} boardId={currentBoard?.id ?? ''} task={task} />
        ))}
      </div>
      <form onSubmit={onCreate} className="mt-3 flex gap-2">
        <input className="w-full rounded border bg-white px-2 py-1 text-sm" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Add task" />
        <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white">Add</button>
      </form>
    </div>
  );
}
