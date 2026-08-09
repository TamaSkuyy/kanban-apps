'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, CreditCard, Layers, Users, Check, Zap } from 'lucide-react';
import { apiFetch } from '../lib/api';

type Sub = {
  plan: string;
  status: string;
  trial_ends_at: string | null;
  entitlements: { max_boards: number; max_members: number; features: string };
};

export default function BillingPage() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    const ws = localStorage.getItem('workspace_id') || '';
    setWorkspaceId(ws);
    apiFetch<{ workspaces: { id: string; name: string }[] }>('/api/workspaces')
      .then((d) => {
        setWorkspaces(d.workspaces);
        if (!ws && d.workspaces[0]) {
          setWorkspaceId(d.workspaces[0].id);
          localStorage.setItem('workspace_id', d.workspaces[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    apiFetch<Sub>(`/api/billing/subscription?workspace_id=${workspaceId}`)
      .then(setSub)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal load'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function checkout(plan: string) {
    if (!workspaceId) return;
    setUpgrading(plan);
    try {
      const res = await apiFetch<{ url: string; stub?: boolean }>(`/api/billing/checkout`, {
        method: 'POST',
        body: JSON.stringify({ workspace_id: workspaceId, plan }),
      });
      if (res.stub) {
        // dev stub directly upgraded
        const s = await apiFetch<Sub>(`/api/billing/subscription?workspace_id=${workspaceId}`);
        setSub(s);
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout gagal');
    } finally {
      setUpgrading(null);
    }
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[960px] px-5 py-6 lg:px-8">
        <Link href="/boards" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
          <ArrowLeft className="h-3.5 w-3.5" /> Boards
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Billing & Paket</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Kelola paket workspace dan batasan.</p>
          </div>
          <select
            value={workspaceId}
            onChange={(e) => {
              setWorkspaceId(e.target.value);
              localStorage.setItem('workspace_id', e.target.value);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Memuat...</p>
        ) : sub ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Paket saat ini: <span className="capitalize">{sub.plan}</span> <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-xs dark:border-slate-700">{sub.status}</span></h2>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"><Layers className="h-3.5 w-3.5" /> Boards</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{sub.entitlements.max_boards} max</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"><Users className="h-3.5 w-3.5" /> Anggota</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{sub.entitlements.max_members} max</p>
              </div>
            </div>
            {sub.trial_ends_at && <p className="mt-3 text-xs text-slate-500">Trial hingga {new Date(sub.trial_ends_at).toLocaleDateString('id-ID')}</p>}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { plan: 'starter', price: 'Gratis', feat: ['3 board', '3 anggota', 'Histori 30 hari'], cta: 'Downgrade' },
            { plan: 'pro', price: '$12 /user/bulan', feat: ['100 board', '50 anggota', 'Timeline & workload'], cta: 'Upgrade ke Pro', popular: true },
            { plan: 'scale', price: 'Custom', feat: ['1000 board', '1000 anggota', 'SSO & SLA'], cta: 'Hubungi sales' },
          ].map((p) => (
            <div key={p.plan} className={`flex flex-col rounded-xl border p-5 ${p.popular ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
              <h3 className={`text-sm font-semibold ${p.popular ? '' : 'text-slate-900 dark:text-white'}`}>{p.plan.toUpperCase()}</h3>
              <p className={`mt-1 text-xs ${p.popular ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500'}`}>{p.price}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.feat.map((f) => (
                  <li key={f} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> {f}</li>
                ))}
              </ul>
              <button
                onClick={() => (p.plan === 'scale' ? (window.location.href = 'mailto:hello@kanban.local') : checkout(p.plan))}
                disabled={!!upgrading}
                className={`mt-5 rounded-lg px-4 py-2 text-sm font-medium ${p.popular ? 'bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-white' : 'bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900'}`}
              >
                {upgrading === p.plan ? 'Memproses...' : p.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <Shield className="h-4 w-4" /> Pembayaran via Stripe (stub di dev). Tanpa kartu untuk trial. <Zap className="ml-auto h-4 w-4" /> Upgrade langsung aktif di dev.
        </div>
      </div>
    </div>
  );
}
