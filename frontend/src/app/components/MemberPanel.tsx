'use client';

import { useEffect, useState } from 'react';
import { Users, X, Shield, Mail, Link2, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
import type { BoardMember } from '../../types';

function getCurrentUserId(): string | undefined {
  try {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id || payload.sub;
  } catch {
    return undefined;
  }
}

export default function MemberPanel({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentUserId = getCurrentUserId();
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isOwner = currentMember?.role === 'owner';
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/boards/${boardId}` : '';

  useEffect(() => {
    if (!open) return;
    apiFetch<{ members: BoardMember[] }>(`/api/boards/${boardId}/members`)
      .then((d) => setMembers(d.members))
      .catch(() => {});
  }, [open, boardId]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      await apiFetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteEmail('');
      toast.success(`Mengundang ${inviteEmail.trim()} sebagai ${inviteRole}`);
      const d = await apiFetch<{ members: BoardMember[] }>(`/api/boards/${boardId}/members`);
      setMembers(d.members);
    } catch {
      toast.error('Gagal mengundang anggota');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(userId: string, email: string) {
    try {
      await apiFetch(`/api/boards/${boardId}/members/${userId}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success(`Menghapus ${email}`);
    } catch {
      toast.error('Gagal menghapus');
    }
  }

  async function handleRoleChange(userId: string, role: 'editor' | 'viewer') {
    try {
      await apiFetch(`/api/boards/${boardId}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role } : m)));
    } catch {
      toast.error('Gagal ubah peran');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <Users className="h-4 w-4" />
        Anggota
        <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white dark:bg-white dark:text-slate-900">{members.length || '—'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] dark:bg-slate-950/50" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Users className="h-4 w-4 text-slate-500" /> Undang anggota
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Kelola akses board — owner bisa ubah peran & hapus anggota.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {/* Invite */}
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30">
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Undang via email</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="nama@perusahaan.com"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                      disabled={!isOwner}
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    disabled={!isOwner}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={loading || !isOwner}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {loading ? '...' : 'Undang'}
                  </button>
                </div>
                {!isOwner && <p className="mt-1.5 text-xs text-slate-500">Hanya owner yang bisa mengundang.</p>}

                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400">{inviteLink}</span>
                  <button onClick={copyLink} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {copied ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="px-5 py-4">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Anggota <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{members.length}</span>
                </h4>
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.user_id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                        {m.email[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{m.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{m.user_id === currentUserId ? 'Kamu' : m.user_id.slice(0, 8)}</p>
                      </div>
                      {isOwner && m.role !== 'owner' ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user_id, e.target.value as 'editor' | 'viewer')}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${m.role === 'owner' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300' : m.role === 'editor' ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {m.role === 'owner' && <Crown className="h-3 w-3" />}
                          {m.role === 'owner' && <Shield className="h-3 w-3" />}
                          {m.role}
                        </span>
                      )}
                      {isOwner && m.role !== 'owner' && (
                        <button onClick={() => handleRemove(m.user_id, m.email)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {members.length === 0 && <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada anggota.</p>}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
