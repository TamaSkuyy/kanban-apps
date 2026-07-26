'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Live region for announcing dynamic changes to screen readers.
 * Use the global `announceToScreenReader` function to push messages.
 */

let globalAnnounce: ((msg: string) => void) | null = null;

export function announceToScreenReader(message: string) {
  globalAnnounce?.(message);
}

export default function ScreenReaderAnnouncer() {
  const [message, setMessage] = useState('');
  const [key, setKey] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    globalAnnounce = (msg: string) => {
      setMessage(msg);
      setKey((k) => k + 1);
    };
    mountedRef.current = true;
    return () => {
      globalAnnounce = null;
      mountedRef.current = false;
    };
  }, []);

  if (!mountedRef.current && !message) return null;

  return (
    <div
      key={key}
      className="sr-only"
      aria-live="assertive"
      aria-atomic="true"
      role="status"
    >
      {message}
    </div>
  );
}
