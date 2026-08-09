'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Users, Trash2, Pencil, Shield, Mail, Layers, Plus, CreditCard } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Workspace = { id: string; slug: string; name: string; owner_id: string };
type Member = { user_id: string; email: string; role: string };
type Board = { id: string; title: string; workspace_id: string | null };

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const wsId = params.id;
  const [ws, setWs] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [billing, setBilling] = useState<{ plan: string; status: string; entitlements: { max_boards: number; max_members: number } } | null>(null);

  async function load() {
    try {
      const w = await apiFetch<Workspace>(`/api/workspaces/${wsId}`);
      setWs(w);
      setNameDraft(w.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal load workspace');
      return;
    }
    try {
      const m = await apiFetch<{ members: Member[] }>(`/api/workspaces/${wsId}/members`);
      setMembers(m.members);
    } catch {}
    try {
      const b = await apiFetch<{ boards: Board[] }>(`/api/workspaces/${wsId}/boards`);
      setBoards(b.boards);
    } catch {}
    try {
      const s = await apiFetch<{ plan: string; status: string; entitlements: { max_boards: number; max_members: number } }>(`/api/billing/subscription?workspace_id=${wsId}`);
      setBilling(s as any);
    } catch {}
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId]);

  async function save() {
    if (!nameDraft.trim()) return;
    try {
      await apiFetch(`/api/workspaces/${wsId}`, { method: 'PUT', body: JSON.stringify({ name: nameDraft.trim() }) });
      setWs((prev) => (prev ? { ...prev, name: nameDraft.trim() } : prev));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal update');
    }
  }

  async function del() {
    if (!confirm(`Hapus workspace "${ws?.name}"? Semua board di workspace ini akan hilang.`)) return;
    try {
      await apiFetch(`/api/workspaces/${wsId}`, { method: 'DELETE' });
      router.push('/boards');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal hapus');
    }
  }

  async function invite() {
    if (!inviteEmail.trim()) return;
    try {
      await apiFetch(`/api/workspaces/${wsId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteEmail('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal invite');
    }
  }

  if (error && !ws) {
    return (
      <div className="-mx-4 -my-6 flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50 px-4 py-6 dark:bg-slate-950">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>
        <Link href="/boards" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Boards
        </Link>
      </div>
    );
  }

  if (!ws) return <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Memuat workspace...</p>;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1280px] px-5 py-6 lg:px-8">
        <Link href="/boards" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Boards
        </Link>

        {/* Header */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <Building2 className="h-5 w-5 text-slate-500" />
              </span>
              <div>
                {editing ? (
                  <div className="flex gap-2">
                    <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-base font-semibold dark:border-slate-600 dark:bg-slate-800 dark:text-white" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
                    <button onClick={save} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-slate-900">Simpan</button>
                    <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:text-slate-300">Batal</button>
                  </div>
                ) : (
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{ws.name}</h1>
                )}
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>/{ws.slug}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{boards.length} board</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{members.length || '—'} anggota</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button onClick={del} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400">
                <Trash2 className="h-4 w-4" /> Hapus
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Boards */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Layers className="h-4 w-4" /> Board di workspace ini
            </h2>
            {boards.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">Belum ada board. Buat board dan pilih workspace ini saat create.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {boards.map((b) => (
                  <li key={b.id}>
                    <Link href={`/boards/${b.id}`} className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{b.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">/{b.id.slice(0, 8)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/boards" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400">
              <Plus className="h-3.5 w-3.5" /> Buat board di workspace ini
            </Link>
          </div>

          {/* Members */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Users className="h-4 w-4" /> Anggota
            </h2>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@contoh.com" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button onClick={invite} className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900">
              Undang
            </button>
            <ul className="mt-4 space-y-2">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs text-white">{m.email[0]?.toUpperCase()}</span>
                  <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{m.email}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <Shield className="mr-1 inline h-3 w-3" />{m.role}
                  </span>
                </li>
              ))}
              {members.length === 0 && <p className="py-4 text-center text-xs text-slate-500">Belum ada anggota selain kamu.</p>}
            </ul>
          </div>
        </div>

        {/* Billing */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <CreditCard className="h-4 w-4" /> Billing
          </h2>
          {billing ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-800">Plan: <span className="font-medium capitalize">{billing.plan}</span> ({billing.status})</span>
              <span className="text-xs text-slate-500">{billing.entitlements.max_boards} boards • {billing.entitlements.max_members} anggota max</span>
              <a href="/billing" className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Kelola billing</a>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Memuat paket...</p>
          )}
          <div className="mt-4 flex gap-2">
            <button onClick={async () => { await apiFetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ workspace_id: wsId, plan: 'pro' }) }); location.reload(); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900">Upgrade ke Pro</button>
            <a href="/billing" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Lihat semua paket</a>
          </div>
        </div>
      </div>
    </div>
  );
}
