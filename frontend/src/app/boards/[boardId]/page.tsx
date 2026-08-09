'use client';

import { KeyboardEvent, useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Palette, ArrowLeft, ChevronRight, Layers, CheckCircle2, Shield, Building2 } from 'lucide-react';
import KanbanBoard from '../../components/KanbanBoard';
import { useKanbanStore } from '../../lib/store';
import { useBoardEvents } from '../../lib/useBoardEvents';
import { useDebounce } from '../../lib/useDebounce';
import { SkeletonBoardDetail } from '../../components/Skeletons';
import ActivityLog from '../../components/ActivityLog';
import OnlineAvatars from '../../components/OnlineAvatars';
import MemberPanel from '../../components/MemberPanel';
import { apiFetch } from '../../lib/api';
import type { OnlineUser } from '../../../types';

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
  const { currentBoard, loading, error, fetchBoard, updateBoard, myRole } = useKanbanStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [presenceEvent, setPresenceEvent] = useState<{ data: OnlineUser[] } | null>(null);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; slug: string }[]>([]);
  const userRole = myRole;

  useEffect(() => {
    fetchBoard(boardId);
  }, [fetchBoard, boardId]);

  useEffect(() => {
    apiFetch<{ workspaces: { id: string; name: string; slug: string }[] }>('/api/workspaces')
      .then((d) => setWorkspaces(d.workspaces))
      .catch(() => {});
  }, []);

  const handlePresence = useCallback((users: OnlineUser[]) => {
    setPresenceEvent({ data: users });
  }, []);

  useBoardEvents(boardId, handlePresence);

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

  if (loading && !currentBoard) return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1280px]"><SkeletonBoardDetail /></div>
    </div>
  );
  if (error) return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>
      <Link href="/boards" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Boards
      </Link>
    </div>
  );
  if (!currentBoard) return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">Board tidak ditemukan.</p>
      <Link href="/boards" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Boards
      </Link>
    </div>
  );

  const colCount = currentBoard.columns?.length ?? 0;
  const taskCount = currentBoard.columns?.reduce((s, c) => s + (c.tasks?.length ?? 0), 0) ?? 0;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1280px] px-5 py-6 lg:px-8">
        {/* Back + breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/boards" className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Boards
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium text-slate-700 dark:text-slate-300">{currentBoard.title}</span>
        </div>

        {/* Board header card */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" style={currentBoard.theme_color ? { borderTopColor: currentBoard.theme_color, borderTopWidth: "3px" } as React.CSSProperties : undefined}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                {editingTitle ? (
                  <input
                    autoFocus
                    className="w-full max-w-[420px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl font-semibold text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-white/10"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => void saveTitle()}
                    onKeyDown={onTitleKeyDown}
                  />
                ) : (
                  <h1
                    className="cursor-text truncate text-xl font-semibold tracking-tight text-slate-900 hover:text-slate-700 dark:text-white dark:hover:text-slate-200"
                    onClick={() => setEditingTitle(true)}
                    title="Klik untuk ubah judul"
                  >
                    {currentBoard.title}
                  </h1>
                )}
                {currentBoard.theme_color && (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentBoard.theme_color }} aria-hidden />
                )}
                {/* Color picker */}
                <div className="relative">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    title="Ubah warna board"
                    aria-label="Ubah warna board"
                  >
                    <Palette className="h-4 w-4" />
                  </button>
                  {showColorPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                      <div className="absolute left-0 top-10 z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex flex-wrap gap-2">
                          {THEME_COLORS.map((c) => (
                            <button
                              key={c.label}
                              className="h-7 w-7 rounded-full border-2 transition hover:opacity-80"
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
                {userRole && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${userRole === 'owner' ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : userRole === 'editor' ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                    <Shield className="h-3 w-3" /> {userRole}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {colCount} kolom</span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {taskCount} task</span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span>Diperbarui {new Date(currentBoard.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 md:inline" />
                <span className="hidden text-slate-400 dark:text-slate-500 md:inline">Klik judul untuk edit • SSE live</span>
              </div>
              {/* Workspace sync */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Workspace:
                </span>
                <select
                  value={currentBoard.workspace_id ?? ''}
                  onChange={async (e) => {
                    const newWs = e.target.value;
                    if (!newWs || newWs === currentBoard.workspace_id) return;
                    try {
                      await apiFetch(`/api/boards/${boardId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ title: currentBoard.title, workspace_id: newWs }),
                      });
                      localStorage.setItem('workspace_id', newWs);
                      fetchBoard(boardId);
                      // refresh workspaces for navbar
                      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: newWs }));
                    } catch {}
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="">Tanpa workspace</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 dark:text-slate-500">sinkron dengan switcher di Boards</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <OnlineAvatars boardId={boardId} presenceEvent={presenceEvent} />
              <MemberPanel boardId={boardId} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex w-full max-w-[380px] items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-white/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari task..."
            />
          </div>
          <div className="flex items-center gap-2">
            <ActivityLog boardId={boardId} />
          </div>
        </div>

        {/* Board */}
        <div className="mt-6">
          <KanbanBoard searchQuery={debouncedSearch} readOnly={userRole !== 'editor' && userRole !== 'owner'} />
        </div>
      </div>
    </div>
  );
}
