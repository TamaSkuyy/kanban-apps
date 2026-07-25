'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useKanbanStore } from '../lib/store';
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts';
import { findColumnByTaskId, getTaskPosition } from '../lib/dnd-hooks';
import KanbanColumn from './KanbanColumn';
import SortableTaskCard from './SortableTaskCard';
import DragOverlayContent from './DragOverlayContent';
import ConfirmModal from './ConfirmModal';
import ShortcutsHelp from './ShortcutsHelp';

export default function KanbanBoard() {
  const router = useRouter();
  const { currentBoard, moveTaskOptimistic, moveColumnOptimistic, deleteTask, createTask } = useKanbanStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'task' | 'column' | null>(null);
  const [deletingTask, setDeletingTask] = useState<{ id: string; title: string; columnId: string } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));

    const type = active.data.current?.type;
    setActiveType(type === 'column' ? 'column' : 'task');
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Column highlight is handled inside KanbanColumn via useDroppable isOver
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over || !currentBoard?.columns) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeDataType = active.data.current?.type;

    // --- Column reorder ---
    if (activeDataType === 'column') {
      if (activeIdStr === overIdStr) return;

      const newIndex = currentBoard.columns.findIndex((c) => c.id === overIdStr);
      if (newIndex < 0) return;

      try {
        await moveColumnOptimistic(activeIdStr, newIndex);
      } catch {
        toast.error('Gagal mengurutkan ulang kolom. Silakan coba lagi.');
      }
      return;
    }

    // --- Task drag ---
    const activeColumn = findColumnByTaskId(currentBoard, activeIdStr);
    if (!activeColumn) return;

    // Determine destination column
    let overColumnId: string;
    const overData = over.data.current;
    if (overData?.type === 'task') {
      overColumnId = overData.columnId as string;
    } else if (overData?.type === 'column') {
      // Dropped directly on a column (empty column or column header)
      overColumnId = overIdStr;
    } else {
      return;
    }

    if (activeIdStr === overIdStr) return;

    const toColumn = currentBoard.columns.find((c) => c.id === overColumnId);
    if (!toColumn) return;

    const newPosition =
      overData?.type === 'task'
        ? getTaskPosition(toColumn, overIdStr)
        : (toColumn.tasks || []).length;

    try {
      await moveTaskOptimistic(activeIdStr, activeColumn.id, overColumnId, newPosition);
    } catch {
      toast.error('Gagal memindahkan task. Silakan coba lagi.');
    }
  }, [currentBoard, moveTaskOptimistic, moveColumnOptimistic]);

  async function handleTaskDelete() {
    if (!deletingTask) return;
    const { id, title, columnId } = deletingTask;
    setDeletingTask(null);
    await deleteTask(id);
    toast.success(`Task "${title}" deleted`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void createTask(columnId, title);
        },
      },
      duration: 5000,
    });
  }

  useKeyboardShortcuts((action) => {
    switch (action) {
      case 'new-task': {
        // Focus the first column's "Add a task..." input
        const firstInput = document.querySelector<HTMLInputElement>(
          '[data-kanban-column] input[placeholder="Add a task..."]'
        );
        firstInput?.focus();
        break;
      }
      case 'edit-task':
        if (selectedTaskId) {
          router.push(`/boards/${currentBoard?.id}/tasks/${selectedTaskId}`);
        }
        break;
      case 'delete-task':
        if (selectedTaskId && currentBoard?.columns) {
          const col = findColumnByTaskId(currentBoard, selectedTaskId);
          const task = col?.tasks.find((t) => t.id === selectedTaskId);
          if (task) {
            setDeletingTask({ id: task.id, title: task.title, columnId: task.column_id });
          }
        }
        break;
      case 'close-modal':
        setSelectedTaskId(null);
        break;
      case 'show-help':
        setShortcutsOpen(true);
        break;
    }
  });

  if (!currentBoard?.columns) return null;

  const columnIds = currentBoard.columns.map((c) => c.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none">
          {currentBoard.columns.map((column) => {
            const tasks = column.tasks || [];
            return (
              <div key={column.id} className="snap-center md:snap-none">
              <KanbanColumn key={column.id} column={column}>
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 column-task-list">
                    {tasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        boardId={currentBoard.id}
                        task={task}
                        onEdit={() => router.push(`/boards/${currentBoard.id}/tasks/${task.id}`)}
                        onDelete={() => setDeletingTask({ id: task.id, title: task.title, columnId: task.column_id })}
                        isSelected={selectedTaskId === task.id}
                        onSelect={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </KanbanColumn>
              </div>
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && activeType ? (
          <DragOverlayContent activeId={activeId} activeType={activeType} />
        ) : null}
      </DragOverlay>

      <ConfirmModal
        open={deletingTask !== null}
        title="Delete Task"
        message={deletingTask ? `Are you sure you want to delete "${deletingTask.title}"? This action cannot be undone.` : ''}
        confirmLabel="Delete Task"
        variant="danger"
        onConfirm={() => void handleTaskDelete()}
        onCancel={() => setDeletingTask(null)}
      />

      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </DndContext>
  );
}
