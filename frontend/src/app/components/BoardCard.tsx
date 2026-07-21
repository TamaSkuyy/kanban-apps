'use client';

import Link from 'next/link';
import { Board } from '../../types';
import { useKanbanStore } from '../lib/store';

export default function BoardCard({ board }: { board: Board }) {
  const { deleteBoard } = useKanbanStore();

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <Link className="block text-lg font-medium" href={`/boards/${board.id}`}>
        {board.title}
      </Link>
      <button className="mt-3 text-sm text-red-600" onClick={() => deleteBoard(board.id)}>
        Delete
      </button>
    </div>
  );
}
