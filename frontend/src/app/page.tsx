'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    router.replace(token ? '/boards' : '/login');
  }, [router]);

  return <p className="text-sm text-slate-500">Redirecting...</p>;
}
