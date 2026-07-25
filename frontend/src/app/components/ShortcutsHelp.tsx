'use client';

import { useEffect, useRef } from 'react';
import { SHORTCUT_LIST } from '../lib/useKeyboardShortcuts';

export default function ShortcutsHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button className="text-sm text-slate-400 hover:text-slate-600" onClick={onClose}>
            ✕
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUT_LIST.map((s) => (
            <li key={s.key} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{s.description}</span>
              <kbd className="rounded border bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">
                {s.key}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-400">
          Click a task card to select it first, then use shortcuts.
        </p>
      </div>
    </div>
  );
}
