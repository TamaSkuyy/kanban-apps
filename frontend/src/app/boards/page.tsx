'use client';

import { FormEvent, useEffect, useState } from 'react';
import BoardCard from '../components/BoardCard';
import { useKanbanStore } from '../lib/store';
import { SkeletonBoardList } from '../components/Skeletons';

export default function BoardsPage() {
  const { boards, loading, error, fetchBoards, createBoard } = useKanbanStore();
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createBoard(title.trim());
    setTitle('');
  }

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Your Boards</h1>
      <form className="mb-6 flex gap-2" onSubmit={onCreate}>
        <input
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm sm:w-80"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New board title"
        />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Create
        </button>
      </form>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {loading && <SkeletonBoardList />}

      {!loading && !error && boards.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="mb-4 text-5xl">📋</div>
          <h2 className="text-lg font-semibold text-slate-700">No boards yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create your first board to get started.</p>
        </div>
      )}

      {!loading && boards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </section>
  );
}
