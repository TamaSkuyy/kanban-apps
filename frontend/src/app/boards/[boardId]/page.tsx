'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../../components/KanbanBoard';
import { useKanbanStore } from '../../lib/store';
import { useBoardEvents } from '../../lib/useBoardEvents';

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const { currentBoard, loading, error, fetchBoard } = useKanbanStore();

  // Initial board fetch
  useEffect(() => {
    fetchBoard(boardId);
  }, [fetchBoard, boardId]);

  // SSE: incremental real-time updates
  useBoardEvents(boardId);

  if (loading) return <p className="text-sm text-slate-500">Loading board...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!currentBoard) return <p className="text-sm text-slate-500">Board not found.</p>;

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">{currentBoard.title}</h1>
      <KanbanBoard />
    </section>
  );
}
