'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Board } from '../../types';
import { useKanbanStore } from '../lib/store';
import ConfirmModal from './ConfirmModal';

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

  return (
    <>
      <div
        className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-800 dark:border-slate-700"
        style={board.theme_color ? { borderLeftColor: board.theme_color, borderLeftWidth: '4px' } : undefined}
      >
        <Link className="block text-lg font-medium hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400" href={`/boards/${board.id}`}>
          {board.title}
        </Link>
        <button
          className="mt-3 text-sm text-red-600 hover:text-red-800"
          onClick={() => setConfirming(true)}
        >
          Delete
        </button>
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
