export type EntityType = 'player' | 'wall' | 'platform' | 'coin' | 'enemy' | 'spike' | 'bullet' | 'goal' | 'text' | 'npc' | 'collectible';
export type ItemUsageType = 'none' | 'place' | 'destroy' | 'heal' | 'shoot';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  position: Vector2;
  size: Vector2;
  velocity: Vector2;
  color: string;
  isGrounded?: boolean;
  direction?: 1 | -1; // 1 for right, -1 for left
  health?: number;
  
  // Visuals
  image?: string; // Base64 image data

  // Text Properties
  text?: string;
  fontSize?: number;

  // NPC Properties
  dialogue?: string; // Text to show when player is near

  // Inventory System
  inventory?: Entity[]; // Array of collected entities
  usageType?: ItemUsageType; // What does this item do?
  placeEntityType?: EntityType; // If usageType is 'place', what do we place?
  
  // Gameplay Properties
  maxHealth?: number;
  speed?: number;     
  jumpForce?: number; 

  // AI Properties
  originalX?: number; // Center point for patrolling
  patrolRange?: number; // How far to move left/right
}

export interface ControlConfig {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    size: number; // Scale 0.5-2.0
}

export interface ControlLayout {
    left: ControlConfig;
    right: ControlConfig;
    jump: ControlConfig;
    shoot: ControlConfig;
    use: ControlConfig;
}

export interface ProjectSettings {
    viewportWidth: number;
    viewportHeight: number;
    controlLayout?: ControlLayout;
    name?: string;
}

export interface Scene {
  id: string;
  name: string;
  entities: Entity[];
}

export interface GameState {
  scenes: Scene[];
  currentSceneIndex: number;
  status: 'editing' | 'playing' | 'gameover' | 'victory';
  settings: ProjectSettings;
}

export interface EditorTool {
  type: EntityType | 'select' | 'eraser' | 'scale';
  icon: string;
  label: string;
  color: string;
}