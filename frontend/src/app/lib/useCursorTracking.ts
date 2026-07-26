'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from './api';

interface CursorPosition {
  x: number;
  y: number;
}

/**
 * Tracks mouse position on a container and sends throttled updates to the backend.
 */
export function useCursorTracking(
  boardId: string,
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  const lastSent = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const el = containerRef.current;

    function onMouseMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      lastSent.current = {
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
      };
    }

    el.addEventListener('mousemove', onMouseMove, { passive: true });

    // Throttled send: every 100ms
    timerRef.current = setInterval(() => {
      const { x, y } = lastSent.current;
      if (x === 0 && y === 0) return; // no movement yet

      apiFetch(`/api/boards/${boardId}/cursor`, {
        method: 'POST',
        body: JSON.stringify({ x, y }),
      }).catch(() => {});
    }, 100);

    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [boardId, enabled]);
}
