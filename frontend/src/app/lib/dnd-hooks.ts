import { Board, Column, Task } from '../../types';

/**
 * Find which column contains a given task ID.
 */
export function findColumnByTaskId(board: Board, taskId: string): Column | undefined {
  for (const col of board.columns ?? []) {
    if (col.tasks.some((t) => t.id === taskId)) return col;
  }
  return undefined;
}

/**
 * Find a task by ID across all columns.
 */
export function findTaskById(board: Board, taskId: string): Task | undefined {
  for (const col of board.columns ?? []) {
    const found = col.tasks.find((t) => t.id === taskId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Calculate the insertion position for a task dropped into a column.
 * If overTaskId is provided, insert after that task; otherwise append to end.
 */
export function getTaskPosition(column: Column, overTaskId?: string): number {
  if (!overTaskId) return column.tasks.length;
  const overIndex = column.tasks.findIndex((t) => t.id === overTaskId);
  if (overIndex < 0) return column.tasks.length;
  return overIndex + 1;
}
