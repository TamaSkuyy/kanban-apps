'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';
import ConfirmModal from './ConfirmModal';
import { toast } from 'sonner';

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
      const found = (column.tasks || []).find((t) => t.id === params.taskId);
      if (found) return found;
    }
    return null;
  }, [currentBoard?.columns, params.taskId]);

  if (!currentBoard) {
    return (
      <div className="w-full rounded-xl bg-white p-6 shadow-lg">
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-2/3 rounded bg-slate-200" />
          <div className="h-20 w-full rounded bg-slate-100" />
          <div className="h-9 w-full rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!task) {
    return <p className="rounded bg-white p-4 text-sm text-slate-500">Task not found.</p>;
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    await updateTask(task.id, {
      description,
      assignee,
      due_date: dueDate ? `${dueDate}T00:00:00Z` : null,
    });
    toast.success('Task updated');
    if (!standalone) router.back();
  }

  async function onDelete() {
    await deleteTask(task.id);
    setConfirmingDelete(false);
    toast.success('Task deleted');
    if (!standalone) router.back();
    else router.push(`/boards/${boardId}`);
  }

  const hasNoDetail = !task.description && !task.assignee && !task.due_date;

  const content = (
    <div className="w-full rounded-xl bg-white p-4 shadow-lg sm:p-6">
      <h2 className="mb-1 text-lg font-semibold">{task.title}</h2>
      {hasNoDetail && (
        <p className="mb-3 text-xs text-slate-400">Double-click the task title on the board to rename it.</p>
      )}
      <form className="space-y-3" onSubmit={onSave}>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Assignee</label>
            <input
              className="w-full rounded border p-2 text-sm"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g. John"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Due Date</label>
            <input
              className="w-full rounded border p-2 text-sm"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <button
            type="button"
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete Task
          </button>
          <div className="flex gap-2">
            {!standalone && (
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" onClick={() => router.back()}>
                Cancel
              </button>
            )}
            <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {standalone ? (
        content
      ) : (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[10vh] sm:items-center sm:pt-0">
          <div className="w-full max-w-lg">{content}</div>
        </div>
      )}

      <ConfirmModal
        open={confirmingDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        variant="danger"
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
