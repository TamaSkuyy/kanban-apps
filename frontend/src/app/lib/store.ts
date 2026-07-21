'use client';

import { create } from 'zustand';
import { Board, Task } from '../../types';
import { apiFetch } from './api';

type TaskPatch = {
  title?: string;
  description?: string;
  assignee?: string;
  due_date?: string | null;
  column_id?: string;
  position?: number;
};

type KanbanState = {
  boards: Board[];
  currentBoard: Board | null;
  loading: boolean;
  error: string | null;
  fetchBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createTask: (columnId: string, title: string) => Promise<void>;
  updateTask: (taskId: string, patch: TaskPatch) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTaskOptimistic: (taskId: string, fromColumnId: string, toColumnId: string) => Promise<void>;
};

function cloneBoard(board: Board | null): Board | null {
  return board ? (JSON.parse(JSON.stringify(board)) as Board) : null;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  boards: [],
  currentBoard: null,
  loading: false,
  error: null,

  fetchBoards: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<{ boards: Board[] }>('/api/boards');
      set({ boards: data.boards, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to fetch boards' });
    }
  },

  createBoard: async (title: string) => {
    set({ error: null });
    try {
      const board = await apiFetch<Board>('/api/boards', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      set((state) => ({ boards: [board, ...state.boards] }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create board' });
    }
  },

  deleteBoard: async (boardId: string) => {
    const previous = get().boards;
    set({ boards: previous.filter((b) => b.id !== boardId), error: null });
    try {
      await apiFetch<void>(`/api/boards/${boardId}`, { method: 'DELETE' });
    } catch (err) {
      set({ boards: previous, error: err instanceof Error ? err.message : 'Failed to delete board' });
    }
  },

  fetchBoard: async (boardId: string) => {
    set({ loading: true, error: null });
    try {
      const board = await apiFetch<Board>(`/api/boards/${boardId}`);
      set({ currentBoard: board, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to fetch board' });
    }
  },

  createTask: async (columnId, title) => {
    try {
      await apiFetch<Task>(`/api/columns/${columnId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      const boardId = get().currentBoard?.id;
      if (boardId) await get().fetchBoard(boardId);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create task' });
    }
  },

  updateTask: async (taskId, patch) => {
    try {
      await apiFetch<void>(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      const boardId = get().currentBoard?.id;
      if (boardId) await get().fetchBoard(boardId);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update task' });
    }
  },

  deleteTask: async (taskId) => {
    try {
      await apiFetch<void>(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const boardId = get().currentBoard?.id;
      if (boardId) await get().fetchBoard(boardId);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete task' });
    }
  },

  moveTaskOptimistic: async (taskId, fromColumnId, toColumnId) => {
    if (fromColumnId === toColumnId) return;
    const snapshot = cloneBoard(get().currentBoard);
    if (!snapshot) return;

    const next = cloneBoard(snapshot);
    if (!next?.columns) return;

    const fromColumn = next.columns.find((column) => column.id === fromColumnId);
    const toColumn = next.columns.find((column) => column.id === toColumnId);
    if (!fromColumn || !toColumn) return;

    const taskIndex = fromColumn.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex < 0) return;

    const [task] = fromColumn.tasks.splice(taskIndex, 1);
    task.column_id = toColumn.id;
    task.position = toColumn.tasks.length;
    toColumn.tasks.push(task);

    set({ currentBoard: next, error: null });

    try {
      await apiFetch<void>(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ column_id: toColumn.id, position: task.position }),
      });
    } catch (err) {
      set({
        currentBoard: snapshot,
        error: err instanceof Error ? err.message : 'Failed to move task',
      });
    }
  },
}));
