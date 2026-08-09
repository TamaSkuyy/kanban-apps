'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import TaskModal from '../../../../components/TaskModal';

export default function TaskStandalonePage() {
  const params = useParams<{ boardId: string }>();

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[640px]">
        <Link
          href={`/boards/${params.boardId}`}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Board
        </Link>

        <TaskModal standalone />
      </div>
    </div>
  );
}
