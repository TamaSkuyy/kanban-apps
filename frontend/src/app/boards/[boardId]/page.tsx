'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../../components/KanbanBoard';
import { useKanbanStore } from '../../lib/store';
import { useBoardEvents } from '../../lib/useBoardEvents';
import { SkeletonBoardDetail } from '../../components/Skeletons';

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const { currentBoard, loading, error, fetchBoard, updateBoard } = useKanbanStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

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
      {editingTitle ? (
        <input
          autoFocus
          className="mb-4 w-full rounded border px-2 py-1 text-xl font-semibold sm:text-2xl"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => void saveTitle()}
          onKeyDown={onTitleKeyDown}
        />
      ) : (
        <h1
          className="mb-4 cursor-pointer text-xl font-semibold hover:text-blue-600 sm:text-2xl"
          onDoubleClick={() => setEditingTitle(true)}
        >
          {currentBoard.title}
        </h1>
      )}
      <KanbanBoard />
    </section>
  );
}
