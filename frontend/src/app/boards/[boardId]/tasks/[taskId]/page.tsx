'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import TaskModal from '../../../../components/TaskModal';

export default function TaskStandalonePage() {
  const params = useParams<{ boardId: string }>();

  return (
    <div className="mx-auto max-w-2xl pt-4">
      {/* Back to board */}
      <Link
        href={`/boards/${params.boardId}`}
        className="mb-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Board
      </Link>

      <TaskModal standalone />
    </div>
  );
}
