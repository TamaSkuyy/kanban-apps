'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import KanbanColumn from '../../components/KanbanColumn';
import { useKanbanStore } from '../../lib/store';

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const { currentBoard, loading, error, fetchBoard } = useKanbanStore();

  useEffect(() => {
    fetchBoard(params.boardId);
  }, [fetchBoard, params.boardId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    const source = new EventSource(`${base}/api/boards/${params.boardId}/events?token=${encodeURIComponent(token)}`);
    source.onmessage = () => {
      void fetchBoard(params.boardId);
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [fetchBoard, params.boardId]);

  if (loading) return <p className="text-sm text-slate-500">Loading board...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!currentBoard) return <p className="text-sm text-slate-500">Board not found.</p>;

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">{currentBoard.title}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {currentBoard.columns?.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
    </section>
  );
}
