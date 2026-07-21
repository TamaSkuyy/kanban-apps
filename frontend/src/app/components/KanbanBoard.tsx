'use client';

import { useState, useCallback } from 'react';
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
import { findColumnByTaskId, getTaskPosition } from '../lib/dnd-hooks';
import KanbanColumn from './KanbanColumn';
import SortableTaskCard from './SortableTaskCard';
import DragOverlayContent from './DragOverlayContent';

export default function KanbanBoard() {
  const { currentBoard, moveTaskOptimistic, moveColumnOptimistic } = useKanbanStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'task' | 'column' | null>(null);

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
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <SortableTaskCard key={task.id} boardId={currentBoard.id} task={task} />
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
    </DndContext>
  );
}
