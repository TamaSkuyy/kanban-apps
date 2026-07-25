'use client';

import { useEffect, useRef } from 'react';

export type ShortcutAction =
  | 'new-task'
  | 'edit-task'
  | 'delete-task'
  | 'close-modal'
  | 'show-help';

type ShortcutHandler = (action: ShortcutAction) => void;

export function useKeyboardShortcuts(
  onAction: ShortcutHandler,
  enabled: boolean = true
) {
  const handlerRef = useRef(onAction);
  handlerRef.current = onAction;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only Esc works in inputs
        if (e.key !== 'Escape') return;
      }

      const handler = handlerRef.current;

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          handler('new-task');
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          handler('edit-task');
          break;
        case 'Delete':
        case 'Backspace':
          // Don't trigger Backspace if modifier
          if (e.key === 'Backspace' && (e.ctrlKey || e.metaKey || e.altKey)) break;
          e.preventDefault();
          handler('delete-task');
          break;
        case 'Escape':
          handler('close-modal');
          break;
        case '?':
          e.preventDefault();
          handler('show-help');
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}

export const SHORTCUT_LIST = [
  { key: 'N', description: 'New task (focus first column input)' },
  { key: 'E', description: 'Edit selected task' },
  { key: 'Delete', description: 'Delete selected task' },
  { key: 'Esc', description: 'Close modal / deselect task' },
  { key: '?', description: 'Show keyboard shortcuts' },
];
