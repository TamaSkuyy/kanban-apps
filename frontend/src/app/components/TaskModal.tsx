'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { X, User, Calendar, Eye, EyeOff, Layers, Clock3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Task } from '../../types';
import { useKanbanStore } from '../lib/store';
import ConfirmModal from './ConfirmModal';

const AVAILABLE_LABELS = [
  { name: 'bug', color: '#ef4444' },
  { name: 'feature', color: '#16a34a' },
  { name: 'urgent', color: '#f97316' },
  { name: 'design', color: '#9333ea' },
  { name: 'improvement', color: '#2563eb' },
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
        <div className="space-y-4 p-6">
          <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </ModalShell>
    );
  }

  if (!task) {
    return (
      <ModalShell standalone={standalone} boardId={params.boardId}>
        <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Task tidak ditemukan.</p>
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
      <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">{children}</div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[6vh] backdrop-blur-[2px] sm:items-center sm:pt-0">
      <div className="animate-modal-in w-full max-w-[640px] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
      <style>{`@media (prefers-reduced-motion: reduce) { .animate-modal-in { animation: none !important; } } @keyframes modal-in { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } } .animate-modal-in { animation: modal-in 0.2s ease-out; }`}</style>
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
  const { updateTask, deleteTask, createTask, currentBoard } = useKanbanStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignee, setAssignee] = useState(task.assignee);
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [previewDesc, setPreviewDesc] = useState(false);
  const [labels, setLabels] = useState<string[]>(task.labels || []);
  const [addingLabel, setAddingLabel] = useState(false);

  const column = useMemo(() => {
    return currentBoard?.columns?.find((c) => c.id === task.column_id);
  }, [currentBoard?.columns, task.column_id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    await updateTask(task.id, {
      title: title.trim() || task.title,
      description,
      assignee,
      due_date: dueDate ? `${dueDate}T00:00:00Z` : null,
      labels,
    });
    toast.success('Task diperbarui');
    if (standalone) router.push(`/boards/${boardId}`);
    else router.back();
  }

  async function onDelete() {
    const taskTitle = task.title;
    const columnId = task.column_id;
    await deleteTask(task.id);
    setConfirmingDelete(false);
    toast.success(`Task "${taskTitle}" dihapus`, {
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
    <div className="p-6">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          <Layers className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{column?.title ?? 'Kolom'}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {new Date(task.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
          </div>
          <input
            className="mt-1 w-full border-0 bg-transparent p-0 text-[18px] font-semibold leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-white dark:placeholder:text-slate-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul task..."
          />
        </div>
        {!standalone && (
          <button
            className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            onClick={() => router.back()}
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <form className="mt-6 space-y-5" onSubmit={onSave}>
        {/* ── Description ──────────────────────── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Deskripsi
            </label>
            {description && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
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
            <div className="prose prose-sm max-w-none min-h-[6rem] rounded-lg border border-slate-200 bg-white p-4 text-sm dark:prose-invert dark:border-slate-700 dark:bg-slate-900">
              <ReactMarkdown>{description || '*Tidak ada deskripsi*'}</ReactMarkdown>
            </div>
          ) : (
            <div>
              <textarea
                className="min-h-[110px] w-full rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-white/10"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tambah deskripsi..."
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Mendukung <span className="font-medium text-slate-700 dark:text-slate-300">Markdown</span> — **bold**, *italic*, list
              </p>
            </div>
          )}
        </div>

        {/* ── Properties grid ──────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Assignee */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Assignee
            </label>
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-white/10">
              <User className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Nama assignee"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tenggat
            </label>
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-white/10">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Labels ───────────────────────────── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Label
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {/* Active labels */}
            {labels.map((label) => {
              const meta = AVAILABLE_LABELS.find((l) => l.name === label);
              const color = meta?.color ?? '#64748b';
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: color + '14', borderColor: color + '30', color }}
                >
                  {label}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-black/10"
                    onClick={() => toggleLabel(label)}
                    style={{ color }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Add label */}
            {addingLabel ? (
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
                {AVAILABLE_LABELS.filter((l) => !labels.includes(l.name)).map((lbl) => (
                  <button
                    key={lbl.name}
                    type="button"
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
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
                  className="rounded-full px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setAddingLabel(false)}
                >
                  batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() => setAddingLabel(true)}
              >
                + Tambah label
              </button>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────── */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </button>

          <div className="flex gap-2">
            {!standalone && (
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => router.back()}
              >
                Batal
              </button>
            )}
            <button
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white ring-1 ring-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
              type="submit"
            >
              Simpan
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
        title="Hapus Task"
        message={`Yakin ingin menghapus "${task.title}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus Task"
        variant="danger"
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
