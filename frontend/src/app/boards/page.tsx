'use client';

import { FormEvent, useEffect, useState, useRef, useMemo } from 'react';
import { Plus, Search, LayoutGrid, List, Clock3, ChevronRight, Building2, Check, X } from 'lucide-react';
import BoardCard from '../components/BoardCard';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import { useKanbanStore } from '../lib/store';
import { SkeletonBoardList } from '../components/Skeletons';

export default function BoardsPage() {
  const { boards, loading, error, fetchBoards, createBoard } = useKanbanStore();
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [hasWorkspace, setHasWorkspace] = useState<boolean | null>(null);
  const [pendingInvites, setPendingInvites] = useState<{ id: string; workspace_id: string; workspace_name: string; role: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBoards();
    // check workspaces for warning + pending invites
    import('../lib/api').then(({ apiFetch }) => {
      apiFetch<{ workspaces: unknown[] }>('/api/workspaces')
        .then((d) => setHasWorkspace(d.workspaces.length > 0))
        .catch(() => setHasWorkspace(true));
      apiFetch<{ invites: { id: string; workspace_id: string; workspace_name: string; role: string }[] }>('/api/me/invites')
        .then((d) => setPendingInvites(d.invites))
        .catch(() => {});
    });
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      fetchBoards(id);
    };
    window.addEventListener('workspace-changed', handler as EventListener);
    return () => window.removeEventListener('workspace-changed', handler as EventListener);
  }, [fetchBoards]);

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter((b) => b.title.toLowerCase().includes(q));
  }, [boards, query]);

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
    <div className="-mx-4 -my-6 min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1280px] px-5 py-6 lg:px-8 lg:py-8">
        {/* Page header */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Workspace</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Boards</span>
              </div>
              <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white">
                Boards
              </h1>
              <p className="mt-1 max-w-[520px] text-sm leading-6 text-slate-600 dark:text-slate-400">
                Semua papan kerja tim di satu tempat. Buat board baru, atur kolom, dan pantau progress real-time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="sm:hidden">
                <WorkspaceSwitcher onChange={(id) => fetchBoards(id)} />
              </div>
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-slate-900 transition hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Buat board
              </button>
            </div>
          </div>
          <div className="hidden sm:flex">
            <WorkspaceSwitcher onChange={(id) => fetchBoards(id)} />
          </div>

          {hasWorkspace === false && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Belum ada workspace</p>
              <p className="mt-1 text-sm leading-6 text-amber-700 dark:text-amber-400">Buat workspace dulu sebelum bikin board. Board tanpa workspace tidak akan muncul di daftar workspace.</p>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">Tip: pilih “Buat workspace” di switcher di atas.</p>
            </div>
          )}

          {pendingInvites.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                <Building2 className="h-4 w-4 text-slate-500" /> Undangan workspace ({pendingInvites.length})
              </p>
              <ul className="mt-3 space-y-2">
                {pendingInvites.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-white">{inv.workspace_name}</span> — sebagai {inv.role}
                    </span>
                    <button
                      onClick={async () => {
                        const { apiFetch } = await import('../lib/api');
                        await apiFetch(`/api/invites/by-id/${inv.id}/accept`, { method: 'POST' });
                        setPendingInvites((prev) => prev.filter((p) => p.id !== inv.id));
                        // refresh workspaces
                        window.dispatchEvent(new CustomEvent('workspace-changed', { detail: inv.workspace_id }));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900"
                    >
                      <Check className="h-3.5 w-3.5" /> Terima
                    </button>
                    <button
                      onClick={async () => {
                        const { apiFetch } = await import('../lib/api');
                        await apiFetch(`/api/invites/${inv.id}/decline` as any, { method: 'POST' }).catch(async () => {
                          await apiFetch(`/api/workspaces/${inv.workspace_id}/invites/${inv.id}`, { method: 'DELETE' } as any);
                        });
                        setPendingInvites((prev) => prev.filter((p) => p.id !== inv.id));
                      }}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex w-full max-w-[380px] items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari board..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-white/10"
                />
              </div>
              <span className="hidden whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 sm:inline">
                {loading ? 'Memuat...' : `${filtered.length} board`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-500 dark:text-slate-400 lg:inline">Tampilan</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  aria-label="Grid view"
                  onClick={() => setView('grid')}
                  className={`rounded-md px-2.5 py-1.5 ${view === 'grid' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-white dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  aria-label="List view"
                  onClick={() => setView('list')}
                  className={`rounded-md px-2.5 py-1.5 ${view === 'list' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-white dark:ring-slate-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
              </span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            {(error.toLowerCase().includes('limit') || error.toLowerCase().includes('member')) && (
              <a href="/billing" className="mt-2 inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900">
                Upgrade paket — lihat billing
              </a>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-6">
            <SkeletonBoardList />
          </div>
        )}

        {/* Empty — no boards at all */}
        {!loading && !error && boards.length === 0 && !creating && (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <Clock3 className="h-6 w-6 text-slate-500 dark:text-slate-400" strokeWidth={1.6} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Belum ada board</h2>
            <p className="mx-auto mt-1.5 max-w-[420px] text-sm leading-6 text-slate-600 dark:text-slate-400">
              Buat board pertama untuk mulai atur tugas. Template siap pakai — setup kurang dari 1 menit.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-slate-900 transition hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" /> Buat board pertama
            </button>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Gratis selama trial • Bisa undang tim nanti</p>
          </div>
        )}

        {/* No results for search */}
        {!loading && !error && boards.length > 0 && filtered.length === 0 && !creating && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Tidak ada board yang cocok dengan “{query}”</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Coba kata kunci lain atau buat board baru.</p>
            <button onClick={() => setQuery('')} className="mt-4 text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-white dark:decoration-slate-600 dark:hover:decoration-white">
              Bersihkan pencarian
            </button>
          </div>
        )}

        {/* Grid / List */}
        {!loading && (filtered.length > 0 || creating) && (
          <div className={view === 'grid' ? 'mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'mt-6 grid grid-cols-1 gap-3'}>
            {/* Create card — first */}
            {creating ? (
              <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm ring-2 ring-slate-900/10 dark:border-slate-600 dark:bg-slate-900 dark:ring-white/10">
                <form onSubmit={onCreate}>
                  <label htmlFor="board-title" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nama board
                  </label>
                  <input
                    id="board-title"
                    ref={inputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mis. Q4 Launch, Sprint 12..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-white/10"
                    onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white ring-1 ring-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-100"
                    >
                      Buat
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="group flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:group-hover:border-slate-600">
                  <Plus className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Buat board baru</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Board • kolom • task</span>
              </button>
            )}

            {filtered.map((board) => (
              <BoardCard key={board.id} board={board} variant={view} />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Menampilkan {filtered.length} dari {boards.length} board • Update real-time via SSE
          </p>
        )}
      </div>
    </div>
  );
}
