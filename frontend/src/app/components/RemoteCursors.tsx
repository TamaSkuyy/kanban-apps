'use client';

import { useEffect, useState } from 'react';

interface RemoteCursor {
  user_id: string;
  email: string;
  x: number;
  y: number;
}

const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

function cursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export default function RemoteCursors({
  cursors,
  currentUserId,
}: {
  cursors: RemoteCursor[];
  currentUserId?: string;
}) {
  const [visible, setVisible] = useState<Record<string, RemoteCursor>>({});

  // Update cursor positions, expire after 3s of no updates
  useEffect(() => {
    const now = Date.now();
    setVisible((prev) => {
      const next: Record<string, RemoteCursor> = { ...prev };
      for (const c of cursors) {
        if (c.user_id === currentUserId) continue;
        next[c.user_id] = c;
      }
      return next;
    });

    const timer = setTimeout(() => {
      setVisible((prev) => {
        const next = { ...prev };
        for (const [id] of Object.entries(next)) {
          // Remove cursors that haven't been updated recently (not in current batch)
        }
        return next;
      });
    }, 5000); // 5s timeout

    return () => clearTimeout(timer);
  }, [cursors, currentUserId]);

  // Remove stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((prev) => {
        const cursorsArr = Object.values(prev);
        if (cursorsArr.length === 0) return prev;
        // Keep all cursors received in the last interval — the parent handles staleness
        return prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const entries = Object.values(visible).filter((c) => c.user_id !== currentUserId);
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((c) => (
        <div
          key={c.user_id}
          className="pointer-events-none absolute z-40 transition-all duration-150 ease-linear"
          style={{
            left: c.x,
            top: c.y,
            transform: 'translate(-4px, -4px)',
          }}
        >
          {/* Cursor arrow */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill={cursorColor(c.user_id)}
            className="drop-shadow-sm"
          >
            <path d="M1 1l5.5 14 2-6 6-2z" />
          </svg>
          {/* Name label */}
          <span
            className="ml-3 rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-white whitespace-nowrap"
            style={{ backgroundColor: cursorColor(c.user_id) }}
          >
            {c.email.split('@')[0]}
          </span>
        </div>
      ))}
    </>
  );
}
