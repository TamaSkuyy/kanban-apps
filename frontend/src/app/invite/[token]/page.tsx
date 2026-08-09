'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Clock, Check, X, ArrowRight, Shield } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Invite = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: string;
  expires_at: string;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    apiFetch<Invite>(`/api/invites/${token}`)
      .then(setInvite)
      .catch((e) => setError(e instanceof Error ? e.message : 'Undangan tidak ditemukan'))
      .finally(() => setLoading(false));
  }, [token]);

  async function accept() {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push(`/login?next=/invite/${token}`);
      return;
    }
    setActionLoading(true);
    try {
      await apiFetch(`/api/invites/${token}/accept`, { method: 'POST' });
      router.push('/boards');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menerima undangan');
    } finally {
      setActionLoading(false);
    }
  }

  async function decline() {
    try {
      await apiFetch(`/api/invites/${token}/decline`, { method: 'POST' });
      router.push('/boards');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menolak');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-[440px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <X className="h-5 w-5 text-red-600" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Undangan tidak valid</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{error || 'Link sudah kadaluarsa atau dibatalkan.'}</p>
          <Link href="/boards" className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900">
            Ke Boards <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Undangan workspace</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{invite.workspace_name}</h1>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Shield className="h-3 w-3" /> {invite.role}
          </span>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Mail className="h-4 w-4 text-slate-400" /> {invite.email}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" /> Kadaluarsa {new Date(invite.expires_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Kamu diundang sebagai <span className="font-medium text-slate-900 dark:text-white">{invite.role}</span> ke workspace <span className="font-medium text-slate-900 dark:text-white">{invite.workspace_name}</span>. Terima untuk bergabung dan lihat board di dalamnya.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={accept}
            disabled={actionLoading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Check className="h-4 w-4" /> {actionLoading ? 'Memproses...' : 'Terima undangan'}
          </button>
          <button
            onClick={decline}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Tolak
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Belum punya akun? <Link href={`/register?email=${encodeURIComponent(invite.email)}`} className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 dark:text-white dark:decoration-slate-600">Daftar dengan email ini</Link> — undangan tetap berlaku.
        </p>
      </div>
    </div>
  );
}
