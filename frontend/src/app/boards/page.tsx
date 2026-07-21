'use client';

import { FormEvent, useEffect, useState } from 'react';
import BoardCard from '../components/BoardCard';
import { useKanbanStore } from '../lib/store';

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
        <input className="w-full rounded border bg-white px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New board title" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Create</button>
      </form>
      {loading && <p className="text-sm text-slate-500">Loading boards...</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>
    </section>
  );
}
