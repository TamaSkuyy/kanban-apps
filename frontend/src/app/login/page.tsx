'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import { apiFetch } from '../lib/api';
import AuthCard from '../components/AuthCard';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      router.push('/boards');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title={<>Login <span className="inline-block animate-wave">👋</span></>}
      rightLinkHref="/register"
      rightLinkText="Register"
      bottomText="Belum punya akun?"
      bottomLinkHref="/register"
      bottomLinkText="Register"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="group flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3.5 ring-1 ring-gray-200 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400">
          <Mail className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.8} />
          <input className="w-full bg-transparent text-sm text-slate-700 placeholder-gray-400 outline-none"
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="group flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3.5 ring-1 ring-gray-200 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400">
          <Lock className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.8} />
          <input className="w-full bg-transparent text-sm text-slate-700 placeholder-gray-400 outline-none"
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <button
          className="w-full rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition-all duration-200 hover:scale-[1.03] hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          disabled={submitting} type="submit">
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Logging in...
            </span>
          ) : 'Login'}
        </button>
      </form>
    </AuthCard>
  );
}
