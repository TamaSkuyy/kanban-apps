'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Trash2, Clock3, Layers } from 'lucide-react';
import { Board } from '../../types';
import { useKanbanStore } from '../lib/store';
import ConfirmModal from './ConfirmModal';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}h lalu`;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BoardCard({
  board,
  variant = 'grid',
}: {
  board: Board;
  variant?: 'grid' | 'list';
}) {
  const { deleteBoard, createBoard } = useKanbanStore();
  const [confirming, setConfirming] = useState(false);

  const stats = useMemo(() => {
    const colCount = board.columns?.length ?? 0;
    const taskCount = board.columns?.reduce((s, c) => s + (c.tasks?.length ?? 0), 0) ?? 0;
    return { colCount, taskCount };
  }, [board.columns]);

  async function handleDelete() {
    setConfirming(false);
    const boardTitle = board.title;
    await deleteBoard(board.id);
    toast.success(`Board "${boardTitle}" dihapus`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void createBoard(boardTitle);
        },
      },
      duration: 5000,
    });
  }

  const isList = variant === 'list';

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 ${
          isList ? 'flex-row items-center gap-4 p-4' : 'p-4'
        }`}
      >
        {/* hover delete */}
        <button
          className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950"
          onClick={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
          title="Hapus board"
          aria-label="Hapus board"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <Link
          href={`/boards/${board.id}`}
          className={`flex flex-1 flex-col ${isList ? 'min-w-0 flex-row items-center gap-4' : ''}`}
        >
          {/* Title row */}
          <div className={isList ? 'min-w-0 flex-1' : 'pr-6'}>
            <div className="flex items-center gap-2">
              {board.theme_color && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: board.theme_color }}
                  aria-hidden
                />
              )}
              <h3 className="truncate text-[15px] font-semibold leading-5 text-slate-900 group-hover:text-slate-900 dark:text-slate-100">
                {board.title}
              </h3>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {stats.colCount} kolom
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
              <span>{stats.taskCount} task</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {timeAgo(board.updated_at)}
              </span>
            </div>
          </div>

          {/* Mini column preview — not identical icon card, subtle bars */}
          <div
            className={`flex gap-1.5 ${isList ? 'hidden shrink-0 sm:flex' : 'mt-4'}`}
            aria-hidden
          >
            {(board.columns?.slice(0, 3) ?? Array.from({ length: 3 })).map((col, i) => {
              const count = typeof col === 'object' && col && 'tasks' in col ? (col as { tasks: unknown[] }).tasks.length : 0;
              const heights = ['h-6', 'h-8', 'h-5'];
              return (
                <div
                  key={i}
                  className={`w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/50 ${isList ? 'w-[96px]' : ''}`}
                >
                  <div className="h-1.5 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-2 space-y-1">
                    <div className={`rounded bg-white dark:bg-slate-800 ${heights[i % 3]}`} />
                    {count > 1 && <div className="h-5 rounded bg-white dark:bg-slate-800" />}
                    {isList ? null : count === 0 && i === 0 && <div className="h-5 rounded border border-dashed border-slate-200 dark:border-slate-700" />}
                  </div>
                </div>
              );
            })}
            {(!board.columns || board.columns.length === 0) && !isList && (
              <span className="sr-only">Pratinjau kolom board</span>
            )}
          </div>
        </Link>
      </div>

      <ConfirmModal
        open={confirming}
        title="Hapus Board"
        message={`Yakin ingin menghapus "${board.title}"? Semua kolom dan task di dalamnya akan terhapus permanen.`}
        confirmLabel="Hapus Board"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
