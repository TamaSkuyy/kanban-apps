'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Palette } from 'lucide-react';
import KanbanBoard from '../../components/KanbanBoard';
import { useKanbanStore } from '../../lib/store';
import { useBoardEvents } from '../../lib/useBoardEvents';
import { SkeletonBoardDetail } from '../../components/Skeletons';
import ActivityLog from '../../components/ActivityLog';

const THEME_COLORS = [
  { label: 'None', value: null },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Slate', value: '#64748b' },
];

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const { currentBoard, loading, error, fetchBoard, updateBoard } = useKanbanStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBoard(boardId);
  }, [fetchBoard, boardId]);

  useBoardEvents(boardId);

  useEffect(() => {
    if (currentBoard) setTitleDraft(currentBoard.title);
  }, [currentBoard?.title]);

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === currentBoard?.title) {
      setTitleDraft(currentBoard?.title ?? '');
      setEditingTitle(false);
      return;
    }
    await updateBoard(boardId, trimmed);
    setEditingTitle(false);
  }

  function onTitleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void saveTitle();
    if (e.key === 'Escape') {
      setTitleDraft(currentBoard?.title ?? '');
      setEditingTitle(false);
    }
  }

  if (loading && !currentBoard) return <SkeletonBoardDetail />;
  if (error) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="rounded-xl bg-red-50 px-5 py-4 text-sm font-medium text-red-600">{error}</p>
    </div>
  );
  if (!currentBoard) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-slate-500">Board not found.</p>
    </div>
  );

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-57px)] bg-blue-50/30 px-4 py-6 dark:bg-slate-950/30">
      {/* ── Board header ──────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Board title */}
        <div className="flex items-center gap-3">
          {editingTitle ? (
            <input
              autoFocus
              className="rounded-xl border-2 border-emerald-300 bg-white px-4 py-2 text-2xl font-bold text-slate-800 outline-none dark:bg-slate-800 dark:text-white dark:border-emerald-700"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={onTitleKeyDown}
            />
          ) : (
            <h1
              className="cursor-pointer text-3xl font-bold tracking-tight text-slate-800 transition hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400"
              onDoubleClick={() => setEditingTitle(true)}
            >
              {currentBoard.title}
            </h1>
          )}

          {/* Color picker */}
          <div className="relative">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Change board color"
              style={
                currentBoard.theme_color
                  ? { backgroundColor: currentBoard.theme_color + '15', ringColor: currentBoard.theme_color }
                  : undefined
              }
            >
              <Palette
                className="h-4 w-4"
                style={currentBoard.theme_color ? { color: currentBoard.theme_color } : undefined}
              />
            </button>

            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                <div className="absolute left-0 top-11 z-20 rounded-xl border bg-white p-3 shadow-lg dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex flex-wrap gap-1.5">
                    {THEME_COLORS.map((c) => (
                      <button
                        key={c.label}
                        className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c.value ?? '#e2e8f0',
                          borderColor: c.value ? c.value : '#cbd5e1',
                        }}
                        title={c.label}
                        onClick={() => {
                          void updateBoard(boardId, currentBoard.title, c.value);
                          setShowColorPicker(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200 transition-all focus-within:ring-2 focus-within:ring-emerald-400 dark:bg-slate-800 dark:ring-slate-700 sm:max-w-sm">
          <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.8} />
          <input
            className="w-full bg-transparent text-sm text-slate-700 placeholder-gray-400 outline-none dark:text-slate-200 dark:placeholder-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
          />
        </div>
        <ActivityLog boardId={boardId} />
      </div>

      {/* ── Board ─────────────────────────────────── */}
      <KanbanBoard searchQuery={searchQuery} />
    </div>
  );
}
