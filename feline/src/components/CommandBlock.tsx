import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export type CommandType = 'movement' | 'rotation';

interface CommandBlockProps {
  id: string;
  type: CommandType;
  children: React.ReactNode;
  inCanvas?: boolean;
}

export function CommandBlock({ id, type, children, inCanvas = false }: CommandBlockProps) {
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
    id: id,
    data: {
      type,
      inCanvas,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        border-2 rounded-lg p-4 mb-2 cursor-grab active:cursor-grabbing
        ${isDragging ? 'bg-blue-500 text-white' : 'bg-white'}
        ${inCanvas ? 'border-blue-200 hover:border-blue-400' : 'border-gray-200'}
      `}
    >
      {children}
    </div>
  );
} 