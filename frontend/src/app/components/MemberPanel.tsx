'use client';

import { useEffect, useState } from 'react';
import { Users, X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
import type { BoardMember } from '../../types';

function getCurrentUserId(): string | undefined {
  try {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    // JWT payload is the second part (base64url encoded JSON)
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

  const currentUserId = getCurrentUserId();
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isOwner = currentMember?.role === 'owner';

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
      toast.success(`Invited ${inviteEmail.trim()} as ${inviteRole}`);
      // Refresh
      const d = await apiFetch<{ members: BoardMember[] }>(`/api/boards/${boardId}/members`);
      setMembers(d.members);
    } catch {
      toast.error('Failed to invite member');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(userId: string, email: string) {
    try {
      await apiFetch(`/api/boards/${boardId}/members/${userId}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success(`Removed ${email}`);
    } catch {
      toast.error('Failed to remove member');
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
      toast.error('Failed to update role');
    }
  }

  return (
    <>
      <button
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800"
        onClick={() => setOpen(!open)}
      >
        <Users className="h-3.5 w-3.5" />
        Members ({members.length})
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-80 rounded-xl border bg-white p-4 shadow-xl dark:bg-slate-800 dark:border-slate-700">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Board Members</h3>

          {/* Member list */}
          <ul className="mb-3 space-y-1.5">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  {m.email.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{m.email}</span>

                {/* Role badge / selector */}
                {isOwner && m.role !== 'owner' ? (
                  <select
                    className="rounded border bg-slate-50 px-1.5 py-0.5 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user_id, e.target.value as 'editor' | 'viewer')}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.role === 'owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                    m.role === 'editor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                    'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {m.role === 'owner' && <Shield className="mr-0.5 inline-block h-3 w-3" />}
                    {m.role}
                  </span>
                )}

                {/* Remove button */}
                {isOwner && m.role !== 'owner' && (
                  <button
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:text-red-500"
                    onClick={() => handleRemove(m.user_id, m.email)}
                    title="Remove member"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Invite form (owner only) */}
          {isOwner && (
            <div className="border-t pt-3 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
                <select
                  className="rounded-lg border bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button
                className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
                onClick={handleInvite}
                disabled={loading}
              >
                {loading ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
