'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Board } from '../../types';
import { useKanbanStore } from '../lib/store';
import ConfirmModal from './ConfirmModal';

export default function BoardCard({ board }: { board: Board }) {
  const { deleteBoard } = useKanbanStore();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <Link className="block text-lg font-medium hover:text-blue-600" href={`/boards/${board.id}`}>
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
        onConfirm={() => {
          void deleteBoard(board.id);
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
