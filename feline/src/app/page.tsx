'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import { CommandBlock } from "@/components/CommandBlock";
import { RepeatBlock } from "@/components/RepeatBlock";
import { TrashIcon } from 'lucide-react';
import mqtt, { MqttClient } from "mqtt";

interface Command {
  id: string;
  type: 'movement' | 'rotation' | 'sound' | 'repeat';
  command: string;
  steps?: number;
  sound?: string;
  children?: Command[];
}

export default function Home() {
  const [commands, setCommands] = useState<Command[]>([]);
  const mainRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const hasAddedCommand = React.useRef(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const mqttClientRef = useRef<MqttClient | null>(null);
  const currentDragId = useRef<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const username = hostname.split("-")[0];
    const mqttHost = username.includes(".") ? hostname : `${username}-bracketbot.local`;
  
    const client = mqtt.connect(`ws://${mqttHost}:9001`);
    mqttClientRef.current = client;
  
    client.on("connect", () => {
      setConnectionStatus("Connected");
      client.subscribe('/mapping/traversability_grid');
      client.subscribe('/mapping/robot_pose_grid_coords');
    });
  
    client.on("error", (error) => {
      setConnectionStatus(`Connection failed: ${error}`);
    });
  
    return () => {
      if (client) client.end();
    };
  }, []);

  const publishVelocity = (linear: number, angular: number) => {
    if (!mqttClientRef.current) return;
    const payload = JSON.stringify({
      timestamp: Date.now(),
      linear_velocity_mps: linear,
      angular_velocity_radps: angular,
    });
    mqttClientRef.current.publish("/control/target_velocity", payload);
  };
  
  const executeCommand = async (command: Command) => {
    return new Promise<void>((resolve) => {
      switch (command.type) {
        case 'movement':
          const isForward = command.command === 'forward';
          publishVelocity(isForward ? 0.5 : -0.5, 0);
          setTimeout(() => {
            publishVelocity(0, 0);
            resolve();
          }, command.steps! * 1000); // Each step is 1 second
          break;
        
        case 'rotation':
          const isLeft = command.command.includes('left');
          publishVelocity(0, isLeft ? 45.0 : -45.0);
          setTimeout(() => {
            publishVelocity(0, 0);
            resolve();
          }, command.steps! * 100); // Each step is 100ms
          break;
        
        case 'sound':
          if (mqttClientRef.current) {
            mqttClientRef.current.publish("`robot/speak`", command.sound || "meow");
            setTimeout(resolve, 1000);
          } else {
            resolve();
          }
          break;
  
        case 'repeat':
          executeCommands(command.children || [], command.steps || 1)
            .then(resolve);
          break;
      }
    });
  };
  
  const executeCommands = async (commandList: Command[], repeatCount: number = 1) => {
    for (let i = 0; i < repeatCount; i++) {
      for (const command of commandList) {
        await executeCommand(command);
      }
    }
  };
  
  const handleDragEnd = useCallback((event: any, sourceId: string) => {
    const dragEventId = `${Date.now()}-${Math.random()}`;
    
    if (!mainRef.current) return;
    
    const mainRect = mainRef.current.getBoundingClientRect();
    const { clientX, clientY } = event;
    
    if (
      clientX < mainRect.left ||
      clientX > mainRect.right ||
      clientY < mainRect.top ||
      clientY > mainRect.bottom
    ) return;

    // Find target repeat block
    const repeatBlocks = document.querySelectorAll('.repeat-block');
    let targetRepeatBlock: Element | null = null;
    
    repeatBlocks.forEach((block) => {
      const rect = block.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        targetRepeatBlock = block;
      }
    });

    // Single state update
    setCommands(prev => {
      // If we've already added the command, return previous state
      if (hasAddedCommand.current) {
        return prev;
      }
      
      const type = sourceId === 'repeat' ? 'repeat' :
                  sourceId.includes('left') || sourceId.includes('right') ? 'rotation' : 
                  sourceId === 'sound' ? 'sound' : 'movement';
      
      const newCommand = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        command: sourceId,
        steps: type === 'rotation' ? 15 : type === 'repeat' ? 2 : 1,
        children: type === 'repeat' ? [] : undefined
      };

      if (targetRepeatBlock) {
        const repeatBlockId = targetRepeatBlock.getAttribute('data-id');
        if (!repeatBlockId) return prev;

        const newCommands = [...prev];
        addCommandToRepeatBlock(newCommands, repeatBlockId, newCommand);
        hasAddedCommand.current = true;  // Mark that we've added the command
        return newCommands;
      }
      
      hasAddedCommand.current = true;  // Mark that we've added the command
      return [...prev, newCommand];
    });

    // Reset the ref after a short delay
    setTimeout(() => {
      hasAddedCommand.current = false;
    }, 100);
  }, []);  // Add dependencies if needed

  const handleDelete = useCallback((commandId: string) => {
    setCommands(prev => {
      const deleteCommandFromArray = (commands: Command[]): Command[] => {
        return commands.filter(cmd => {
          if (cmd.id === commandId) {
            return false;
          }
          if (cmd.children) {
            cmd.children = deleteCommandFromArray(cmd.children);
          }
          return true;
        });
      };

      const newCommands = deleteCommandFromArray([...prev]);
      return newCommands;
    });
  }, []);

  const handleCanvasItemDragStart = useCallback((id: string) => {
    setDraggedId(id);
    currentDragId.current = id;
    setIsDragging(true);
  }, []);

  const handleCanvasItemDragEnd = useCallback((event: any) => {
    setIsDragging(false);
  }, []);

  const findCommandById = (commands: Command[], id: string): [Command | null, Command[] | null] => {
    for (let i = 0; i < commands.length; i++) {
      if (commands[i].id === id) {
        return [commands[i], commands];
      }
      if (commands[i].children) {
        const [found, parent] = findCommandById(commands[i].children!, id);
        if (found) {
          return [found, parent];
        }
      }
    }
    return [null, null];
  };

  // Memoize handlers
  const handleStepsChange = useCallback((commandId: string, newSteps: number) => {
    setCommands(prev => {
      const newCommands = [...prev];
      const [command, parent] = findCommandById(newCommands, commandId);
      if (command && parent) {
        const index = parent.indexOf(command);
        parent[index] = { ...command, steps: newSteps };
      }
      return newCommands;
    });
  }, []);

  const handleSoundChange = useCallback((commandId: string, newSound: string) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === commandId ? { ...cmd, sound: newSound } : cmd
    ));
  }, []);

  // Memoize renderCommands
  const renderCommands = useCallback((commandsToRender: Command[]) => {
    return (
      <Reorder.Group
        axis="y"
        values={commandsToRender}
        onReorder={(newOrder) => {
          console.log('Canvas State:', {
            repeatBlocks: newOrder.filter(cmd => cmd.type === 'repeat'),
            allCommands: newOrder,
            totalCommands: newOrder.length,
            breakdown: {
              repeat: newOrder.filter(cmd => cmd.type === 'repeat').length,
              movement: newOrder.filter(cmd => cmd.type === 'movement').length,
              rotation: newOrder.filter(cmd => cmd.type === 'rotation').length,
              sound: newOrder.filter(cmd => cmd.type === 'sound').length
            }
          });

          // Log nested commands in repeat blocks
          newOrder.forEach(cmd => {
            if (cmd.type === 'repeat') {
              console.log(`Repeat Block ${cmd.id}:`, {
                steps: cmd.steps,
                children: cmd.children,
                childrenCount: cmd.children?.length || 0
              });
            }
          });

          setCommands(prev => {
            // If these are nested commands, we need to update the parent
            if (commandsToRender !== prev) {
              const parentCommand = prev.find(cmd => 
                cmd.children === commandsToRender
              );
              if (parentCommand) {
                return prev.map(cmd =>
                  cmd.id === parentCommand.id
                    ? { ...cmd, children: newOrder }
                    : cmd
                );
              }
            }
            return newOrder;
          });
        }}
        className="space-y-2"
      >
        {commandsToRender.map((command) => (
          <Reorder.Item
            key={command.id}
            value={command}
            className="command-item"
            drag
            dragListener={true}
            onDragStart={(event) => {
              event.stopPropagation();
              handleCanvasItemDragStart(command.id);
            }}
            onDragEnd={(event) => {
              event.stopPropagation();
              handleCanvasItemDragEnd(event);
            }}
          >
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {command.type === 'repeat' ? (
                <div 
                  className="repeat-block" 
                  data-id={command.id}
                >
                  <RepeatBlock
                    id={command.id}
                    steps={command.steps || 2}
                    onStepsChange={(steps) => handleStepsChange(command.id, steps)}
                    inCanvas={true}
                  >
                    {command.children && command.children.length > 0 && (
                      <div className="nested-commands">
                        {renderCommands(command.children)}
                      </div>
                    )}
                  </RepeatBlock>
                </div>
              ) : (
                <CommandBlock
                  id={command.id}
                  type={command.type}
                  inCanvas={true}
                  steps={command.steps}
                  sound={command.sound}
                  onStepsChange={(steps) => handleStepsChange(command.id, steps)}
                  onSoundChange={(sound) => handleSoundChange(command.id, sound)}
                >
                  {command.type === 'movement' ? 
                    'Forward' : 
                    command.type === 'rotation' ? 
                      `Turn ${command.command.includes('left') ? 'Left' : 'Right'}` :
                      'Play Sound'
                  }
                </CommandBlock>
              )}
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    );
  }, [handleStepsChange, handleSoundChange]);

  // Memoize main render
  const mainContent = useMemo(() => {
    return commands.length === 0 ? (
      <p className="text-gray-500">Drop commands here</p>
    ) : (
      renderCommands(commands)
    );
  }, [commands, renderCommands]);

  // Helper functions
  const removeCommandById = (commands: Command[], id: string): Command[] => {
    return commands.filter(cmd => {
      if (cmd.id === id) return false;
      if (cmd.children) {
        cmd.children = removeCommandById(cmd.children, id);
      }
      return true;
    });
  };

  const addCommandToRepeatBlock = (commands: Command[], repeatBlockId: string, commandToAdd: Command): boolean => {
    for (const cmd of commands) {
      if (cmd.id === repeatBlockId) {
        if (!cmd.children) cmd.children = [];
        
        // Check if command already exists in children
        const exists = cmd.children.some(child => child.id === commandToAdd.id);
        if (exists) {
          return true;
        }
        
        cmd.children.push(commandToAdd);
        return true;
      }
      if (cmd.children && addCommandToRepeatBlock(cmd.children, repeatBlockId, commandToAdd)) {
        return true;
      }
    }
    return false;
  };

  const isCommandInsideRepeat = (repeatCommand: Command | null, commandId: string | null): boolean => {
    if (!repeatCommand || !commandId) return false;
    if (!repeatCommand.children) return false;
    
    return repeatCommand.children.some(child => {
      if (child.id === commandId) return true;
      if (child.type === 'repeat') {
        return isCommandInsideRepeat(child, commandId);
      }
      return false;
    });
  };

  // Create a unique ID generator function
  const generateUniqueId = (type: string) => {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  return (
    <div className="flex h-screen relative">
      <aside className="w-72 border-r bg-gray-50 p-4">
        {/* Sidebar items that can be dragged */}
        <motion.div 
          drag 
          dragSnapToOrigin
          style={{ zIndex: 50 }}
          onDragEnd={(event) => {
            event.stopPropagation();
            handleDragEnd(event, 'forward');
          }}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        >
          <CommandBlock 
            id="forward" 
            type="movement"
            steps={1}
          >
            Forward
          </CommandBlock>
        </motion.div>
        <motion.div 
          drag 
          dragSnapToOrigin
          style={{ zIndex: 50 }}
          onDragEnd={(event) => handleDragEnd(event, 'backward')}
        >
          <CommandBlock 
            id="backward" 
            type="movement"
            steps={1}
          >
            Move Backward
          </CommandBlock>
        </motion.div>
        <motion.div 
          drag 
          dragSnapToOrigin
          style={{ zIndex: 50 }}
          onDragEnd={(event) => handleDragEnd(event, 'left')}
        >
          <CommandBlock 
            id="left" 
            type="rotation"
            steps={15}
          >
            Turn Left
          </CommandBlock>
        </motion.div>
        <motion.div 
          drag 
          dragSnapToOrigin
          style={{ zIndex: 50 }}
          onDragEnd={(event) => handleDragEnd(event, 'right')}
        >
          <CommandBlock 
            id="right" 
            type="rotation"
            steps={15}
          >
            Turn Right
          </CommandBlock>
        </motion.div>
        <motion.div 
          drag 
          dragSnapToOrigin
          style={{ zIndex: 50 }}
          onDragEnd={(event) => handleDragEnd(event, 'sound')}
        >
          <CommandBlock 
            id="sound" 
            type="sound"
            sound="meow"
          >
            Play Sound
          </CommandBlock>
        </motion.div>
        <motion.div 
          drag 
          dragSnapToOrigin
          style={{ zIndex: 50 }}
          onDragEnd={(event) => handleDragEnd(event, 'repeat')}
        >
          <RepeatBlock 
            id="repeat" 
            steps={2}
            onStepsChange={() => {}}
          />
        </motion.div>
      </aside>

      <main 
  ref={mainRef} 
  className="flex-1 relative overflow-hidden"
>
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-center p-4 border-b">
      <button
        className={`flex px-6 py-2 rounded-lg font-medium items-center ${
          commands.length === 0 
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
        disabled={commands.length === 0}
        onClick={async () => {
          console.log('Starting program execution...');
          console.log('Current commands:', commands);
          await executeCommands(commands);
        }}
      >
        Start Program
      </button>
    </div>
    <div className="flex-1 p-4 border-2 border-dashed rounded-lg">
      {mainContent}
    </div>
  </div>
</main>

      {/* Trash Can */}
      <motion.div
        className={`absolute bottom-4 right-4 p-4 rounded-lg transition-colors 
          border-2 ${
          isOverTrash && isDragging ? 'border-red-600 bg-red-200' : 
          isDragging ? 'border-red-300 bg-red-100' : 
          'border-gray-300 bg-gray-100'
        }`}
        style={{ zIndex: 50 }}
        animate={{
          scale: isOverTrash && isDragging ? 1.3 : isDragging ? 1.2 : 1,
        }}
        onMouseEnter={() => isDragging && setIsOverTrash(true)}
        onMouseLeave={() => setIsOverTrash(false)}
        onMouseUp={() => {
          if (isOverTrash && draggedId) {
            handleDelete(draggedId);
            setDraggedId(null);
            currentDragId.current = null;
            setIsOverTrash(false);
          }
        }}
      >
        <TrashIcon 
          className={`w-6 h-6 transition-colors ${
            isOverTrash && isDragging ? 'text-red-600' : 
            isDragging ? 'text-red-500' : 
            'text-gray-500'
          }`} 
        />
      </motion.div>
    </div>
  );
}

