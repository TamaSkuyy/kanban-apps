'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { X, User, Calendar, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';
import ConfirmModal from './ConfirmModal';

const AVAILABLE_LABELS = [
  { name: 'bug', color: '#ef4444' },
  { name: 'feature', color: '#22c55e' },
  { name: 'urgent', color: '#f97316' },
  { name: 'design', color: '#a855f7' },
  { name: 'improvement', color: '#3b82f6' },
  { name: 'docs', color: '#64748b' },
];

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
      <ModalShell standalone={standalone} boardId={params.boardId}>
        <div className="space-y-4 animate-pulse p-6">
          <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
          <div className="h-24 w-full rounded-xl bg-slate-100" />
          <div className="h-10 w-full rounded-xl bg-slate-100" />
        </div>
      </ModalShell>
    );
  }

  if (!task) {
    return (
      <ModalShell standalone={standalone} boardId={params.boardId}>
        <p className="p-6 text-sm text-slate-500">Task not found.</p>
      </ModalShell>
    );
  }

  return <TaskModalForm key={task.id} task={task} boardId={params.boardId} standalone={standalone} />;
}

/* ── Modal shell wrapper ──────────────────────────────────────── */
function ModalShell({
  standalone,
  children,
  boardId,
}: {
  standalone: boolean;
  children: React.ReactNode;
  boardId?: string;
}) {
  const router = useRouter();

  if (standalone) {
    return (
      <div className="w-full rounded-3xl bg-white p-6 shadow-2xl md:p-8">{children}</div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh] backdrop-blur-sm sm:items-center sm:pt-0">
      <div className="w-full max-w-2xl animate-card-in rounded-3xl bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/* ── Main form ────────────────────────────────────────────────── */
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
  const { updateTask, deleteTask, createTask } = useKanbanStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignee, setAssignee] = useState(task.assignee);
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [previewDesc, setPreviewDesc] = useState(false);
  const [labels, setLabels] = useState<string[]>(task.labels || []);
  const [addingLabel, setAddingLabel] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    await updateTask(task.id, {
      title: title.trim() || task.title,
      description,
      assignee,
      due_date: dueDate ? `${dueDate}T00:00:00Z` : null,
      labels,
    });
    toast.success('Task updated');
    if (standalone) router.push(`/boards/${boardId}`);
    else router.back();
  }

  async function onDelete() {
    const taskTitle = task.title;
    const columnId = task.column_id;
    await deleteTask(task.id);
    setConfirmingDelete(false);
    toast.success(`Task "${taskTitle}" deleted`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void createTask(columnId, taskTitle);
        },
      },
      duration: 5000,
    });
    if (!standalone) router.back();
    else router.push(`/boards/${boardId}`);
  }

  function toggleLabel(name: string) {
    setLabels((prev) =>
      prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]
    );
  }

  const content = (
    <div className="p-6 md:p-8">
      {/* ── Header ─────────────────────────────── */}
      <div className="mb-6 flex items-start gap-4">
        <input
          className="flex-1 border-0 bg-transparent text-2xl font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:ring-0 dark:text-white dark:placeholder:text-slate-600"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
        />
        {!standalone && (
          <button
            className="shrink-0 rounded-full bg-gray-100 p-2 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            onClick={() => router.back()}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <form className="space-y-5" onSubmit={onSave}>
        {/* ── Description ──────────────────────── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </label>
            {description && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-gray-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                onClick={() => setPreviewDesc(!previewDesc)}
              >
                {previewDesc ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> Preview
                  </>
                )}
              </button>
            )}
          </div>

          {previewDesc ? (
            <div className="prose prose-sm max-w-none min-h-[6rem] rounded-xl border border-gray-200 bg-white p-4 text-sm dark:prose-invert dark:border-slate-600 dark:bg-slate-800">
              <ReactMarkdown>{description || '*No description*'}</ReactMarkdown>
            </div>
          ) : (
            <div>
              <textarea
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-slate-700 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
              />
              <p className="mt-1 text-[11px] text-slate-400">
                <span className="font-medium">Markdown</span> supported — **bold**, *italic*, lists, etc.
              </p>
            </div>
          )}
        </div>

        {/* ── Properties grid ──────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Assignee */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Assignee
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-emerald-500">
              <User className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.8} />
              <input
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-gray-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="e.g. John"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Due Date
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-emerald-500">
              <Calendar className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.8} />
              <input
                className="w-full bg-transparent text-sm text-slate-700 outline-none dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark]"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Labels ───────────────────────────── */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Labels
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Active labels */}
            {labels.map((label) => {
              const meta = AVAILABLE_LABELS.find((l) => l.name === label);
              const color = meta?.color ?? '#94a3b8';
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: color + '18', color }}
                >
                  {label}
                  <button
                    type="button"
                    className="ml-0.5 rounded-full p-0.5 transition hover:bg-black/10"
                    onClick={() => toggleLabel(label)}
                    style={{ color }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Add label dropdown */}
            {addingLabel ? (
              <div className="flex flex-wrap gap-1.5 rounded-xl border-2 border-emerald-300 bg-white p-2 dark:border-emerald-700 dark:bg-slate-800">
                {AVAILABLE_LABELS.filter((l) => !labels.includes(l.name)).map((lbl) => (
                  <button
                    key={lbl.name}
                    type="button"
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-transform hover:scale-105"
                    style={{ backgroundColor: lbl.color }}
                    onClick={() => {
                      toggleLabel(lbl.name);
                      setAddingLabel(false);
                    }}
                  >
                    {lbl.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-xs text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  onClick={() => setAddingLabel(false)}
                >
                  cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-gray-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                onClick={() => setAddingLabel(true)}
              >
                + Add label
              </button>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-5 dark:border-slate-700">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 active:scale-95 dark:border-red-800 dark:hover:bg-red-950 dark:text-red-400"
            onClick={() => setConfirmingDelete(true)}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Task
          </button>

          <div className="flex gap-2">
            {!standalone && (
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => router.back()}
              >
                Cancel
              </button>
            )}
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition-all duration-200 hover:scale-[1.03] hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-300 active:scale-95 dark:shadow-none"
              type="submit"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <ModalShell standalone={standalone} boardId={boardId}>{content}</ModalShell>

      <ConfirmModal
        open={confirmingDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        variant="danger"
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />

      {/* Card-in animation for modal */}
      {!standalone && (
        <style jsx>{`
          @keyframes card-in {
            from { opacity: 0; transform: translateY(20px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-card-in { animation: card-in 0.3s ease-out; }
        `}</style>
      )}
    </>
  );
}
