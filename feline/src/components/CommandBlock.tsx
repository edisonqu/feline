import React from 'react';
import { useDraggable } from '@dnd-kit/core';

type CommandType = 'forward' | 'backward' | 'turnLeft' | 'turnRight';

interface CommandBlockProps {
  type: CommandType;
}

export function CommandBlock({ type }: CommandBlockProps) {
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
    id: `command-${type}`,
    data: {
      type,
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
      `}
    >
      {type}
    </div>
  );
}

interface DraggableProps {
  children: React.ReactNode;
  id: string;
}

export function Draggable({ children, id }: DraggableProps) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: id,
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <button 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`
        w-full mb-2 p-3 rounded-lg border-2 
        ${isDragging 
          ? 'bg-blue-500 text-white border-blue-600' 
          : 'bg-white border-blue-200 hover:border-blue-400'
        }
      `}
    >
      {children}
    </button>
  );
} 