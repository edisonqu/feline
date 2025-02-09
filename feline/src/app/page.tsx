'use client'

import React, { useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { Sidebar, SidebarContent, SidebarProvider } from "@/components/ui/sidebar";
import { Draggable } from "@/components/CommandBlock";
import { Droppable } from "@/components/Canvas";

export default function Home() {
  const [droppedItems, setDroppedItems] = useState<string[]>([]);

  const handleDragEnd = (event: any) => {
    if (event.over && event.over.id === 'droppable') {
      setDroppedItems((items) => [...items, event.active.id]);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen">
          <Sidebar className="w-64">
            <SidebarContent className="p-4">
              <Draggable id="forward">Move Forward</Draggable>
              <Draggable id="backward">Move Backward</Draggable>
              <Draggable id="left">Turn Left</Draggable>
              <Draggable id="right">Turn Right</Draggable>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 px-4">
            <Droppable>
              <div className="min-h-screen p-4 border-2 border-dashed rounded-lg w-full">
                {droppedItems.length === 0 ? (
                  <p className="text-gray-500">Drop commands here</p>
                ) : (
                  <div className="space-y-2">
                    {droppedItems.map((item, index) => (
                      <div key={index} className="p-2 bg-blue-100 rounded">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Droppable>
          </main>
        </div>
      </SidebarProvider>
    </DndContext>
  );
}
