import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CommandType = 'movement' | 'rotation' | 'sound';

interface CommandBlockProps {
  id: string;
  type: CommandType;
  children?: React.ReactNode;
  inCanvas?: boolean;
  onDragEnd?: () => void;
  steps?: number;
  onStepsChange?: (steps: number) => void;
  [key: string]: any;
}

const getBackgroundColor = (type: CommandType) => {
  switch (type) {
    case 'movement':
      return 'bg-amber-100';
    case 'rotation':
      return 'bg-pink-200';
    case 'sound':
      return 'bg-purple-100';
    default:
      return 'bg-gray-100';
  }
};

const MoveCommand = ({ direction, steps, onStepsChange }: { direction: 'forward' | 'backward', steps: number, onStepsChange: (steps: number) => void }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold">Move {direction === 'forward' ? 'Front' : 'Back'}</span>
    <Input
      type="number"
      value={steps === 0 ? '' : steps}
      onChange={(e) => {
        const value = e.target.value;
        if (value === '') {
          onStepsChange(0);
          return;
        }
        const num = parseInt(value);
        if (!isNaN(num)) {
          onStepsChange(num >= 0 ? num : 0);
        }
      }}
      className="w-16 h-8 text-center bg-white/50 border-none focus:ring-2 focus:ring-amber-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      min={0}
      max={100}
      placeholder=""
    />
    <span className="text-sm font-semibold">steps</span>
  </div>
);

const TurnCommand = ({ direction, steps, onStepsChange }: { direction: 'left' | 'right', steps: number, onStepsChange: (steps: number) => void }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold">Rotate</span>
    <Input
      type="number"
      value={steps === 0 ? '' : steps}
      onChange={(e) => {
        const value = e.target.value;
        if (value === '') {
          onStepsChange(0);
          return;
        }
        const num = parseInt(value);
        if (!isNaN(num)) {
          onStepsChange(Math.max(1, num));
        }
      }}
      className="w-16 h-8 text-center bg-white/50 border-none focus:ring-2 focus:ring-pink-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      min={1}
      max={360}
      placeholder=""
    />
    <span className="text-sm font-semibold">degrees</span>
  </div>
);

const SoundCommand = ({ sound, onSoundChange }: { sound: string, onSoundChange: (sound: string) => void }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold">Play</span>
    <Select value={sound} onValueChange={onSoundChange}>
      <SelectTrigger className="w-[140px] bg-white/50 border-none focus:ring-2 focus:ring-purple-200">
        <SelectValue placeholder="Select a sound" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="meow">Meow</SelectItem>
        <SelectItem value="purr">Purr</SelectItem>
        <SelectItem value="hiss">Hiss</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export function CommandBlock({ 
  id, 
  type, 
  children, 
  inCanvas = false, 
  onDragEnd,
  steps = 1,
  onStepsChange = () => {},
  sound = 'meow',
  onSoundChange = () => {},
  ...props 
}: CommandBlockProps & { sound?: string; onSoundChange?: (sound: string) => void }) {

  const renderContent = () => {
    if (type === 'movement') {
      const direction = (children as string)?.toLowerCase().includes('backward') ? 'backward' : 'forward';
      return <MoveCommand direction={direction} steps={steps} onStepsChange={onStepsChange} />;
    }
    if (type === 'rotation') {
      const direction = (children as string)?.toLowerCase().includes('left') ? 'left' : 'right';
      return <TurnCommand direction={direction} steps={steps} onStepsChange={onStepsChange} />;
    }
    if (type === 'sound') {
      return <SoundCommand sound={sound} onSoundChange={onSoundChange} />;
    }
    return children;
  };

  return (
    <div
      {...props}
      className={`
        relative p-3 mb-2
        ${getBackgroundColor(type)}
        rounded-lg
        shadow-sm
        transition-all
        hover:shadow-xl hover:shadow-black/5
        ${inCanvas ? 'hover:scale-[1.01]' : ''}
      `}
    >
      <div className="flex items-center">
        {renderContent()}
      </div>
    </div>
  );
} 