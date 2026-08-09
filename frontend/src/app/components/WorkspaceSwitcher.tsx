'use client';

import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

type Workspace = { id: string; slug: string; name: string };

export default function WorkspaceSwitcher({ onChange }: { onChange?: (id: string) => void }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('workspace_id') || '';
    setSelected(saved);
    apiFetch<{ workspaces: Workspace[] }>('/api/workspaces')
      .then((d) => {
        setWorkspaces(d.workspaces);
        if (!saved && d.workspaces.length > 0) {
          setSelected(d.workspaces[0].id);
          localStorage.setItem('workspace_id', d.workspaces[0].id);
          onChange?.(d.workspaces[0].id);
        }
      })
      .catch(() => {});
  }, [onChange]);

  function select(id: string) {
    setSelected(id);
    localStorage.setItem('workspace_id', id);
    setOpen(false);
    onChange?.(id);
    window.dispatchEvent(new CustomEvent('workspace-changed', { detail: id }));
  }

  async function create() {
    if (!name.trim()) return;
    try {
      const data = await apiFetch<{ id: string; name: string }>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      const ws = { id: data.id, slug: '', name: data.name };
      setWorkspaces((prev) => [ws, ...prev]);
      select(ws.id);
      setName('');
      setCreating(false);
    } catch {}
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await apiFetch(`/api/workspaces/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim() }),
      });
      setWorkspaces((prev) => prev.map((w) => (w.id === editingId ? { ...w, name: editName.trim() } : w)));
      setEditingId(null);
    } catch {}
  }

  async function remove(id: string) {
    if (!confirm('Hapus workspace ini? Board di dalamnya juga akan terhapus.')) return;
    try {
      await apiFetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      if (selected === id) {
        const next = workspaces.find((w) => w.id !== id);
        if (next) select(next.id);
        else {
          setSelected('');
          localStorage.removeItem('workspace_id');
          window.dispatchEvent(new CustomEvent('workspace-changed', { detail: '' }));
        }
      }
    } catch {}
  }

  const current = workspaces.find((w) => w.id === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Building2 className="h-4 w-4 text-slate-400" />
        <span className="max-w-[120px] truncate">{current?.name ?? 'Pilih workspace'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setEditingId(null); }} />
          <div className="absolute left-0 top-9 z-20 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="max-h-64 overflow-auto">
              {workspaces.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  Belum ada workspace. Buat workspace dulu sebelum bikin board.
                </div>
              )}
              {workspaces.map((w) => (
                <div key={w.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 ${selected === w.id ? 'bg-slate-50 dark:bg-slate-800' : ''}`}>
                  {editingId === w.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                      />
                      <button onClick={saveEdit} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-white dark:bg-white dark:text-slate-900">Simpan</button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:text-slate-300">Batal</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => select(w.id)} className="flex flex-1 items-center gap-2 truncate py-1.5 text-left">
                        <span className="flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">{w.name}</span>
                        {selected === w.id && <Check className="h-4 w-4 text-slate-700 dark:text-slate-300" />}
                      </button>
                      <button onClick={() => { setEditingId(w.id); setEditName(w.name); }} className="rounded p-1 text-slate-400 opacity-0 hover:bg-white hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(w.id)} className="rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950" title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              {creating ? (
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama workspace"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    onKeyDown={(e) => e.key === 'Enter' && create()}
                    autoFocus
                  />
                  <button onClick={create} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900">Buat</button>
                  <button onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:text-slate-300">Batal</button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" /> Buat workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
