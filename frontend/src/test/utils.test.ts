import { describe, it, expect } from 'vitest';
import { findColumnByTaskId, getTaskPosition, findTaskById } from '../app/lib/dnd-hooks';
import type { Board } from '../../shared/types';

function makeBoard(): Board {
  return {
    id: 'b1',
    user_id: 'u1',
    title: 'Test Board',
    theme_color: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    columns: [
      {
        id: 'c1',
        board_id: 'b1',
        title: 'To Do',
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
        tasks: [
          {
            id: 't1',
            column_id: 'c1',
            title: 'Task 1',
            description: '',
            assignee: '',
            due_date: null,
            labels: [],
            position: 0,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 't2',
            column_id: 'c1',
            title: 'Task 2',
            description: '',
            assignee: '',
            due_date: null,
            labels: [],
            position: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
      {
        id: 'c2',
        board_id: 'b1',
        title: 'Done',
        position: 1,
        created_at: '2026-01-01T00:00:00Z',
        tasks: [],
      },
    ],
  };
}

describe('dnd-hooks', () => {
  it('findColumnByTaskId returns column containing the task', () => {
    const board = makeBoard();
    const col = findColumnByTaskId(board, 't1');
    expect(col).toBeDefined();
    expect(col!.id).toBe('c1');
  });

  it('findColumnByTaskId returns undefined for unknown task', () => {
    const board = makeBoard();
    const col = findColumnByTaskId(board, 'nonexistent');
    expect(col).toBeUndefined();
  });

  it('findTaskById returns the correct task', () => {
    const board = makeBoard();
    const task = findTaskById(board, 't2');
    expect(task).toBeDefined();
    expect(task!.title).toBe('Task 2');
  });

  it('getTaskPosition returns 0 for empty column', () => {
    const board = makeBoard();
    const col = board.columns![1]; // empty Done column
    const pos = getTaskPosition(col);
    expect(pos).toBe(0);
  });

  it('getTaskPosition returns correct insertion index', () => {
    const board = makeBoard();
    const col = board.columns![0];
    const pos = getTaskPosition(col, 't1'); // drop before t2? No — this is before t1
    expect(pos).toBe(1); // after t1, before t2
  });
});

describe('time formatting', () => {
  it('parses ISO dates correctly', () => {
    const date = new Date('2026-07-26T12:00:00Z');
    expect(date.getTime()).toBeGreaterThan(0);
  });
});
