'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../../components/KanbanBoard';
import { useKanbanStore } from '../../lib/store';
import { useBoardEvents } from '../../lib/useBoardEvents';
import { SkeletonBoardDetail } from '../../components/Skeletons';

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const { currentBoard, loading, error, fetchBoard } = useKanbanStore();

  useEffect(() => {
    fetchBoard(boardId);
  }, [fetchBoard, boardId]);

  useBoardEvents(boardId);

  if (loading && !currentBoard) return <SkeletonBoardDetail />;
  if (error) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>;
  if (!currentBoard) return <p className="text-sm text-slate-500">Board not found.</p>;

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold sm:text-2xl">{currentBoard.title}</h1>
      <KanbanBoard />
    </section>
  );
}
