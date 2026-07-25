'use client';

import { FormEvent, useEffect, useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import BoardCard from '../components/BoardCard';
import { useKanbanStore } from '../lib/store';
import { SkeletonBoardList } from '../components/Skeletons';

export default function BoardsPage() {
  const { boards, loading, error, fetchBoards, createBoard } = useKanbanStore();
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creating]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setCreating(false);
      return;
    }
    await createBoard(title.trim());
    setTitle('');
    setCreating(false);
  }

  function handleCancel() {
    setTitle('');
    setCreating(false);
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-57px)] bg-blue-50/50 px-4 py-8 dark:bg-slate-950/50">
      <div className="mx-auto max-w-7xl">
        {/* Page title */}
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
          Your Boards
        </h1>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-5 py-4 text-sm font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <SkeletonBoardList />}

        {/* Empty state */}
        {!loading && !error && boards.length === 0 && !creating && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-5 text-6xl">📋</div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">No boards yet</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create your first board to get started.
            </p>
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition-all duration-200 hover:scale-[1.03] hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-300 active:scale-95"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Create New Board
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && (boards.length > 0 || creating) && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* Create Board card — always first */}
            {creating ? (
              <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-md dark:border-emerald-700 dark:bg-slate-800">
                <form onSubmit={onCreate}>
                  <input
                    ref={inputRef}
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-slate-700 placeholder-gray-400 outline-none ring-1 ring-gray-200 transition-all focus:ring-2 focus:ring-emerald-400 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Board name..."
                    onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all hover:scale-[1.03] hover:bg-emerald-600 active:scale-95"
                      type="submit"
                    >
                      Create
                    </button>
                    <button
                      className="rounded-full px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      type="button"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-slate-400 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:text-emerald-500 hover:shadow-lg dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                onClick={() => setCreating(true)}
              >
                <Plus className="h-10 w-10" strokeWidth={1.5} />
                <span className="text-sm font-semibold">Create New Board</span>
              </button>
            )}

            {/* Board cards */}
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
