'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { OnlineUser } from '../../types';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function OnlineAvatars({
  boardId,
  presenceEvent,
}: {
  boardId: string;
  presenceEvent: { data: OnlineUser[] } | null;
}) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Initial fetch
  useEffect(() => {
    apiFetch<{ online: OnlineUser[] }>(`/api/boards/${boardId}/online`)
      .then((d) => setOnlineUsers(d.online))
      .catch(() => {});
  }, [boardId]);

  // SSE presence updates
  useEffect(() => {
    if (presenceEvent) {
      setOnlineUsers(presenceEvent.data);
    }
  }, [presenceEvent]);

  if (onlineUsers.length <= 1) return null; // only me

  return (
    <div className="flex items-center gap-1" title="Online users">
      {onlineUsers.map((u) => (
        <span
          key={u.user_id}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white dark:ring-slate-900 ${avatarColor(u.email)}`}
          title={u.email}
        >
          {u.email.charAt(0).toUpperCase()}
        </span>
      ))}
      <span className="ml-1 text-xs text-slate-400">{onlineUsers.length} online</span>
    </div>
  );
}
