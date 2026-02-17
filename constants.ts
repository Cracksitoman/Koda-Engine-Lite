import { EditorTool, EntityType, ControlLayout } from './types';

export const GRID_SIZE = 32;
export const GRAVITY = 0.5;
export const TERMINAL_VELOCITY = 12;
export const JUMP_FORCE = -10;
export const MOVE_SPEED = 4;
export const BULLET_SPEED = 8;

export const DEFAULT_CONTROL_LAYOUT: ControlLayout = {
    left: { x: 5, y: 80, size: 1 },
    right: { x: 25, y: 80, size: 1 },
    jump: { x: 80, y: 75, size: 1.2 },
    shoot: { x: 65, y: 82, size: 1 },
    use: { x: 50, y: 82, size: 0.9 }
};

export const TOOLS: EditorTool[] = [
  { type: 'select', icon: 'Pointer', label: 'Move', color: '#fff' },
  { type: 'scale', icon: 'Scaling', label: 'Scale', color: '#a855f7' },
  { type: 'eraser', icon: 'Eraser', label: 'Delete', color: '#ef4444' },
  { type: 'text', icon: 'Type', label: 'Text', color: '#fff' },
  { type: 'npc', icon: 'MessageCircle', label: 'NPC', color: '#f97316' },
  { type: 'collectible', icon: 'Backpack', label: 'Item', color: '#d946ef' }, // New Inventory Item Tool
  { type: 'player', icon: 'User', label: 'Player', color: '#3b82f6' },
  { type: 'wall', icon: 'Square', label: 'Wall', color: '#64748b' },
  { type: 'platform', icon: 'Minus', label: 'Platform', color: '#94a3b8' },
  { type: 'coin', icon: 'Circle', label: 'Coin', color: '#eab308' },
  { type: 'enemy', icon: 'Ghost', label: 'Enemy', color: '#ef4444' },
  { type: 'spike', icon: 'Triangle', label: 'Spike', color: '#dc2626' },
  { type: 'goal', icon: 'Flag', label: 'Goal', color: '#10b981' },
];

export const INITIAL_ENTITIES = [
  {
    id: 'floor',
    type: 'wall' as EntityType,
    position: { x: 0, y: 12 * GRID_SIZE },
    size: { x: 30 * GRID_SIZE, y: 2 * GRID_SIZE },
    velocity: { x: 0, y: 0 },
    color: '#64748b',
  },
];