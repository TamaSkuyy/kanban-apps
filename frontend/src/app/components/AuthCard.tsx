'use client';

import Link from 'next/link';
import { Columns3 } from 'lucide-react';

/* ── Floating background decorations ─────────────────────────── */
function FloatingDecorations({ extra = false }: { extra?: boolean }) {
  const cards = [
    { top: '10%', left: '5%', rotate: '6deg', w: 72, h: 96, delay: '0s' },
    { top: '20%', right: '8%', rotate: '-8deg', w: 64, h: 80, delay: '1.2s' },
    { top: '60%', left: '3%', rotate: '12deg', w: 56, h: 72, delay: '0.6s' },
    { top: '75%', right: '12%', rotate: '-4deg', w: 80, h: 100, delay: '2.1s' },
    { top: '40%', left: '90%', rotate: '-10deg', w: 60, h: 80, delay: '1.8s' },
    { bottom: '15%', left: '15%', rotate: '3deg', w: 68, h: 88, delay: '0.3s' },
    { top: '8%', left: '45%', rotate: '-6deg', w: 56, h: 72, delay: '1.5s' },
    { bottom: '25%', right: '25%', rotate: '8deg', w: 48, h: 64, delay: '2.4s' },
  ];

  const checks = [
    { top: '15%', left: '30%', delay: '0.8s' },
    { top: '50%', right: '18%', delay: '1.0s' },
    { top: '35%', left: '12%', delay: '1.6s' },
    { bottom: '35%', right: '8%', delay: '0.2s' },
    { top: '70%', left: '80%', delay: '2.0s' },
    { top: '25%', right: '35%', delay: '1.4s' },
  ];

  const pluses = [
    { top: '30%', left: '22%', delay: '0.5s' },
    { top: '55%', right: '28%', delay: '1.7s' },
    { top: '80%', left: '75%', delay: '1.1s' },
    { top: '12%', right: '22%', delay: '2.3s' },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {cards.map((c, i) => (
        <div
          key={`card-${i}`}
          className="animate-float-card absolute rounded-lg border border-blue-200/30 bg-blue-200/20"
          style={{ top: c.top, left: c.left, right: c.right, bottom: c.bottom, width: c.w, height: c.h, rotate: c.rotate, animationDelay: c.delay }}
        />
      ))}
      {checks.map((c, i) => (
        <svg key={`check-${i}`} className="animate-float-check absolute h-6 w-6 text-emerald-300/30"
          style={{ top: c.top, left: c.left, right: c.right, bottom: c.bottom, animationDelay: c.delay }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ))}
      {extra && pluses.map((p, i) => (
        <svg key={`plus-${i}`} className="animate-float-check absolute h-6 w-6 text-blue-300/25"
          style={{ top: p.top, left: p.left, right: p.right, animationDelay: p.delay } as React.CSSProperties}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      ))}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/5" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-400/5" />
    </div>
  );
}

/* ── Props ────────────────────────────────────────────────────── */
interface AuthCardProps {
  title: React.ReactNode;
  rightLinkHref: string;
  rightLinkText: string;
  bottomText: string;
  bottomLinkHref: string;
  bottomLinkText: string;
  extraDecorations?: boolean;
  children: React.ReactNode;
}

/* ── Shared auth card shell ───────────────────────────────────── */
export default function AuthCard({
  title,
  rightLinkHref,
  rightLinkText,
  bottomText,
  bottomLinkHref,
  bottomLinkText,
  extraDecorations = false,
  children,
}: AuthCardProps) {
  return (
    <>
      <FloatingDecorations extra={extraDecorations} />

      <div className="fixed inset-0 z-10 flex items-center justify-center bg-blue-50/70 px-4">
        <div className="animate-card-in w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60">
          {/* Header bar */}
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Columns3 className="h-7 w-7 text-emerald-500" strokeWidth={2.2} />
              <span className="text-xl font-bold tracking-tight text-slate-800">Kanban</span>
            </Link>
            <Link
              href={rightLinkHref}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-gray-100 hover:text-slate-700"
            >
              {rightLinkText}
            </Link>
          </div>

          {/* Title */}
          <h1 className="mb-8 text-3xl font-bold text-slate-800">{title}</h1>

          {children}

          {/* Bottom link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            {bottomText}{' '}
            <Link href={bottomLinkHref} className="font-semibold text-emerald-600 transition hover:text-emerald-700">
              {bottomLinkText}
            </Link>
          </p>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes float-card {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate, 0deg)); }
          50% { transform: translateY(-12px) rotate(var(--tw-rotate, 0deg)); }
        }
        @keyframes float-check {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.25; }
          50% { transform: translateY(-8px) scale(1.15); opacity: 0.45; }
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(14deg); }
          50% { transform: rotate(-8deg); }
          75% { transform: rotate(14deg); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-float-card { animation: float-card 4s ease-in-out infinite; }
        .animate-float-check { animation: float-check 3.5s ease-in-out infinite; }
        .animate-wave { animation: wave 0.6s ease-in-out 0.3s 1; display: inline-block; transform-origin: 70% 70%; }
        .animate-card-in { animation: card-in 0.5s ease-out; }
      `}</style>
    </>
  );
}
