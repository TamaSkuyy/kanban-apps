'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import TaskCard from './TaskCard';

export default function SortableTaskCard({
  boardId,
  task,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  searchQuery,
  readOnly,
}: {
  boardId: string;
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  searchQuery?: string;
  readOnly?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task, columnId: task.column_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div onClick={onSelect}>
        <TaskCard boardId={boardId} task={task} onEdit={readOnly ? undefined : onEdit} onDelete={readOnly ? undefined : onDelete} isSelected={isSelected} searchQuery={searchQuery} />
      </div>
    </div>
  );
}
