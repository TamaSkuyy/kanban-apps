'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';

export default function TaskModal({ standalone = false }: { standalone?: boolean }) {
  const params = useParams<{ boardId: string; taskId: string }>();
  const { currentBoard, fetchBoard } = useKanbanStore();

  useEffect(() => {
    if (!currentBoard || currentBoard.id !== params.boardId) {
      void fetchBoard(params.boardId);
    }
  }, [currentBoard, fetchBoard, params.boardId]);

  const task = useMemo(() => {
    const columns = currentBoard?.columns ?? [];
    for (const column of columns) {
      const found = column.tasks.find((t) => t.id === params.taskId);
      if (found) return found;
    }
    return null;
  }, [currentBoard?.columns, params.taskId]);

  if (!task) {
    return <p className="rounded bg-white p-4 text-sm">Task not loaded yet. Kembali ke board dulu.</p>;
  }

  return <TaskModalForm key={task.id} task={task} boardId={params.boardId} standalone={standalone} />;
}

function TaskModalForm({
  task,
  boardId,
  standalone,
}: {
  task: Task;
  boardId: string;
  standalone: boolean;
}) {
  const router = useRouter();
  const { updateTask, deleteTask } = useKanbanStore();
  const [description, setDescription] = useState(task.description);
  const [assignee, setAssignee] = useState(task.assignee);
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? '');

  async function onSave(e: FormEvent) {
    e.preventDefault();
    await updateTask(task.id, {
      description,
      assignee,
      due_date: dueDate ? `${dueDate}T00:00:00Z` : null,
    });
    if (!standalone) router.back();
  }

  async function onDelete() {
    await deleteTask(task.id);
    if (!standalone) router.back();
    else router.push(`/boards/${boardId}`);
  }

  const content = (
    <div className="w-full rounded-xl bg-white p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold">{task.title}</h2>
      <form className="space-y-3" onSubmit={onSave}>
        <textarea className="w-full rounded border p-2 text-sm" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <input className="w-full rounded border p-2 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assignee" />
        <input className="w-full rounded border p-2 text-sm" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div className="flex justify-between gap-2">
          <button type="button" className="rounded border border-red-500 px-3 py-1 text-red-600" onClick={() => void onDelete()}>
            Delete
          </button>
          <div className="flex gap-2">
            {!standalone && (
              <button type="button" className="rounded border px-3 py-1" onClick={() => router.back()}>
                Close
              </button>
            )}
            <button className="rounded bg-slate-900 px-3 py-1 text-white">Save</button>
          </div>
        </div>
      </form>
    </div>
  );

  if (standalone) return content;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">{content}</div>;
}
