'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useKanbanStore } from './store';
import { Task } from '../../types';

interface SSEEvent {
  type: string;
  board_id: string;
  data?: Task | { task_id: string } | { column_id: string; position: number } | null;
}

export function useBoardEvents(boardId: string) {
  const { applyTaskEvent, removeTaskFromStore, fetchBoard } = useKanbanStore();
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const maxRetry = 5;
  const baseDelay = 1000; // 1s

  const getDelay = useCallback(() => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, ...
    return Math.min(baseDelay * Math.pow(2, retryRef.current), 30000);
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !boardId) return;

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    const url = `${base}/api/boards/${boardId}/events?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      retryRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const evt: SSEEvent = JSON.parse(event.data);
        handleEvent(evt);
      } catch {
        // Ignore parse errors (keepalive pings, etc.)
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;

      if (retryRef.current < maxRetry) {
        retryRef.current += 1;
        const delay = getDelay();
        setTimeout(connect, delay);
      }
    };
  }, [boardId, applyTaskEvent, removeTaskFromStore, fetchBoard, getDelay]);

  const handleEvent = useCallback(
    (evt: SSEEvent) => {
      switch (evt.type) {
        case 'task.created':
        case 'task.updated':
        case 'task.moved':
          if (evt.data && 'id' in (evt.data as Task)) {
            applyTaskEvent(evt.data as Task);
          }
          break;

        case 'task.deleted':
          if (evt.data && 'task_id' in (evt.data as { task_id: string })) {
            removeTaskFromStore((evt.data as { task_id: string }).task_id);
          }
          break;

        case 'board.updated':
        case 'column.updated':
        case 'board.created':
          // Full refetch for board/column structural changes (rare)
          void fetchBoard(boardId);
          break;

        default:
          break;
      }
    },
    [applyTaskEvent, removeTaskFromStore, fetchBoard, boardId]
  );

  // Connect on mount, reconnect on boardId change
  useEffect(() => {
    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  // Pause/resume on visibility change
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Tab is active again — reconnect if disconnected
        if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) {
          retryRef.current = 0;
          connect();
        }
      } else {
        // Tab hidden — close connection to save resources
        esRef.current?.close();
        esRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [connect]);
}
