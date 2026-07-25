'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../../components/KanbanBoard';
import { useKanbanStore } from '../../lib/store';
import { useBoardEvents } from '../../lib/useBoardEvents';
import { SkeletonBoardDetail } from '../../components/Skeletons';
import ActivityLog from '../../components/ActivityLog';

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const { currentBoard, loading, error, fetchBoard, updateBoard } = useKanbanStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  if (error) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>;
  if (!currentBoard) return <p className="text-sm text-slate-500">Board not found.</p>;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {editingTitle ? (
          <input
            autoFocus
            className="w-full rounded border px-2 py-1 text-xl font-semibold sm:w-auto sm:text-2xl"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={onTitleKeyDown}
          />
        ) : (
          <h1
            className="cursor-pointer text-xl font-semibold hover:text-blue-600 sm:text-2xl"
            onDoubleClick={() => setEditingTitle(true)}
          >
            {currentBoard.title}
          </h1>
        )}

        {/* Color picker toggle */}
        <div className="relative">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs text-slate-500 hover:border-slate-400"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Change board color"
            style={
              currentBoard.theme_color
                ? { borderColor: currentBoard.theme_color, backgroundColor: currentBoard.theme_color + '20' }
                : undefined
            }
          >
            {currentBoard.theme_color ? '' : '🎨'}
          </button>

          {showColorPicker && (
            <div className="absolute left-0 top-9 z-10 rounded-lg border bg-white p-2 shadow-lg">
              <div className="flex flex-wrap gap-1">
                {THEME_COLORS.map((c) => (
                  <button
                    key={c.label}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
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
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm sm:w-72"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
        />
      </div>

      <ActivityLog boardId={boardId} />

      <KanbanBoard searchQuery={searchQuery} />
    </section>
  );
}
