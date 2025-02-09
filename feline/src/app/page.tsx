'use client'

import React, { useState, useEffect } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CommandBlock } from "@/components/CommandBlock";
import { useDroppable } from "@dnd-kit/core";

interface Command {
  id: string;
  type: 'movement' | 'rotation';
  command: string;
}

function Droppable({ children }: { children: React.ReactNode }) {
  const {isOver, setNodeRef} = useDroppable({
    id: 'canvas'
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`
        relative w-full h-full transition-colors duration-200
        ${isOver ? 'bg-blue-50' : ''}
      `}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    // If dropping onto the canvas
    if (over.id === 'canvas' && !active.data.current?.inCanvas) {
      const type = active.id.includes('left') || active.id.includes('right') ? 'rotation' : 'movement';
      const newCommand = {
        id: `${active.id}-${Date.now()}`,
        type,
        command: active.id
      };
      setCommands(prev => [...prev, newCommand]);
      return;
    }

    // If reordering within the canvas
    if (active.id.includes('-') && over.id.includes('-')) {
      const oldIndex = commands.findIndex(cmd => cmd.id === active.id);
      const newIndex = commands.findIndex(cmd => cmd.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newCommands = [...commands];
        const [movedItem] = newCommands.splice(oldIndex, 1);
        newCommands.splice(newIndex, 0, movedItem);
        setCommands(newCommands);
      }
    }
  };

  const getCommandContent = (commandId: string) => {
    const baseCommand = commandId.split('-')[0];
    switch (baseCommand) {
      case 'forward':
        return 'Move Forward';
      case 'backward':
        return 'Move Backward';
      case 'left':
        return 'Turn Left';
      case 'right':
        return 'Turn Right';
      default:
        return baseCommand;
    }
  };

  if (!isClient) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <DndContext 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="flex h-screen">
        <aside className="w-64 border-r bg-gray-50 p-4">
          <CommandBlock id="forward" type="movement">Move Forward</CommandBlock>
          <CommandBlock id="backward" type="movement">Move Backward</CommandBlock>
          <CommandBlock id="left" type="rotation">Turn Left</CommandBlock>
          <CommandBlock id="right" type="rotation">Turn Right</CommandBlock>
        </aside>

        <main className="flex-1 relative">
          <Droppable>
            <div className="min-h-screen p-4 border-2 border-dashed rounded-lg w-full">
              {commands.length === 0 ? (
                <p className="text-gray-500">Drop commands here</p>
              ) : (
                <SortableContext 
                  items={commands.map(cmd => cmd.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {commands.map((command) => (
                      <CommandBlock 
                        key={command.id}
                        id={command.id}
                        type={command.type}
                        inCanvas={true}
                      >
                        {getCommandContent(command.command)}
                      </CommandBlock>
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </Droppable>
        </main>

        <DragOverlay>
          {activeId ? (
            <CommandBlock 
              id={activeId} 
              type={activeId.includes('left') || activeId.includes('right') ? 'rotation' : 'movement'}
              inCanvas={activeId.includes('-')}
            >
              {getCommandContent(activeId)}
            </CommandBlock>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
