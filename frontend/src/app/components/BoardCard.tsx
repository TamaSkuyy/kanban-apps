'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Board } from '../../types';
import { useKanbanStore } from '../lib/store';
import ConfirmModal from './ConfirmModal';

/* Pastel accent palette — deterministic from board id */
const ACCENTS = [
  'bg-teal-400',
  'bg-rose-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-sky-400',
  'bg-emerald-400',
  'bg-pink-400',
  'bg-indigo-400',
];

function accentColor(boardId: string): string {
  let hash = 0;
  for (let i = 0; i < boardId.length; i++) {
    hash = boardId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}

export default function BoardCard({ board }: { board: Board }) {
  const { deleteBoard, createBoard } = useKanbanStore();
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setConfirming(false);
    const boardTitle = board.title;
    await deleteBoard(board.id);
    toast.success(`Board "${boardTitle}" deleted`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void createBoard(boardTitle);
        },
      },
      duration: 5000,
    });
  }

  const barColor = board.theme_color
    ? { backgroundColor: board.theme_color }
    : undefined;

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-800">
        {/* Colored top accent bar */}
        <div
          className={`h-2 w-full ${barColor ? '' : accentColor(board.id)}`}
          style={barColor}
        />

        {/* Delete button — hidden until hover */}
        <button
          className="absolute right-2 top-3 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950"
          onClick={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
          title="Delete board"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Card body */}
        <Link href={`/boards/${board.id}`} className="block p-5 pt-4">
          <h3 className="text-lg font-bold text-slate-800 transition-colors group-hover:text-emerald-600 dark:text-slate-100 dark:group-hover:text-emerald-400">
            {board.title}
          </h3>
          {board.columns && (
            <p className="mt-2 text-xs text-slate-400">
              {board.columns.length} column{board.columns.length !== 1 ? 's' : ''}
            </p>
          )}
        </Link>
      </div>

      <ConfirmModal
        open={confirming}
        title="Delete Board"
        message={`Are you sure you want to delete "${board.title}"? This will permanently delete all columns and tasks in this board.`}
        confirmLabel="Delete Board"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
