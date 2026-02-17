import React, { useRef, useEffect } from 'react';
import { Entity, GameState } from '../types';
import { GRID_SIZE } from '../constants';

interface GameRendererProps {
  entities: Entity[];
  width: number;
  height: number;
  camera: { x: number, y: number };
  zoom: number;
  showGrid?: boolean;
  selectedEntityId?: string | null;
  activeTool?: string; 
  viewportSize?: { width: number, height: number }; // New prop for Camera Size
  onPointerDown?: (worldX: number, worldY: number, screenX: number, screenY: number) => void;
  onPointerMove?: (worldX: number, worldY: number, screenX: number, screenY: number) => void;
  onPointerUp?: () => void;
}

const GameRenderer: React.FC<GameRendererProps> = ({
  entities,
  width,
  height,
  camera,
  zoom,
  showGrid = false,
  selectedEntityId,
  activeTool,
  viewportSize = { width: 360, height: 640 }, // Default Mobile
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Screen
    ctx.clearRect(0, 0, width, height);
    
    // Save context to apply transformations
    ctx.save();
    
    // 1. Apply Zoom
    ctx.scale(zoom, zoom);

    // 2. Apply Camera Translation
    ctx.translate(-camera.x, -camera.y);

    const viewLeft = camera.x;
    const viewRight = camera.x + (width / zoom);
    const viewTop = camera.y;
    const viewBottom = camera.y + (height / zoom);

    // Find player for proximity checks
    const player = entities.find(e => e.type === 'player');

    // --- DRAW CAMERA OVERLAY (Editor Mode) ---
    if (showGrid) {
        // We draw the "Game View" rectangle based on the camera position.
        // In the editor, let's assume the camera 'position' is the top-left of what's being viewed.
        
        // 1. Darken everything
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // Dark blue/gray background
        // We need to draw a huge rect covering everything, then clear the center? 
        // Or just draw 4 rects around the viewport.
        
        // Let's draw the viewport bounds first
        const vx = camera.x + (width / zoom / 2) - (viewportSize.width / 2); // Center viewport in current editor view
        const vy = camera.y + (height / zoom / 2) - (viewportSize.height / 2);
        
        // Use simpler logic: The camera prop IS the top-left in Game Logic. 
        // But in Editor logic, we pan around.
        // Let's draw a static box representing the "Standard Camera Frame" relative to the Player or just centered.
        // Actually, easiest is: Render the box at the center of the screen to show "Size Reference".
        
        // Let's draw the bounds at specific world coordinates if we want to visualize "Screens".
        // But usually, the camera moves. 
        // Let's draw a border that represents the "Game Camera Size" centered on the screen.
        
        const centerX = camera.x + (width / 2 / zoom);
        const centerY = camera.y + (height / 2 / zoom);
        
        const vpX = centerX - viewportSize.width / 2;
        const vpY = centerY - viewportSize.height / 2;
        
        // Outer Darkening (Cinematic bars effect)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        // Top
        ctx.fillRect(viewLeft, viewTop, viewRight - viewLeft, vpY - viewTop);
        // Bottom
        ctx.fillRect(viewLeft, vpY + viewportSize.height, viewRight - viewLeft, viewBottom - (vpY + viewportSize.height));
        // Left
        ctx.fillRect(viewLeft, vpY, vpX - viewLeft, viewportSize.height);
        // Right
        ctx.fillRect(vpX + viewportSize.width, vpY, viewRight - (vpX + viewportSize.width), viewportSize.height);

        // Viewport Border
        ctx.strokeStyle = '#fbbf24'; // Amber-400
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(vpX, vpY, viewportSize.width, viewportSize.height);
        ctx.setLineDash([]);
        
        // Label
        ctx.fillStyle = '#fbbf24';
        ctx.font = `${10/zoom}px monospace`;
        ctx.fillText(`CAMERA: ${viewportSize.width}x${viewportSize.height}`, vpX + 5, vpY - 5);
    }

    // Draw Grid (World Space)
    if (showGrid) {
      ctx.strokeStyle = '#334155'; 
      ctx.lineWidth = 1 / zoom; 
      ctx.beginPath();
      
      const startX = Math.floor(viewLeft / GRID_SIZE) * GRID_SIZE;
      const endX = viewRight;
      const startY = Math.floor(viewTop / GRID_SIZE) * GRID_SIZE;
      const endY = viewBottom;

      for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx.moveTo(x, viewTop);
        ctx.lineTo(x, viewBottom);
      }
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.moveTo(viewLeft, y);
        ctx.lineTo(viewRight, y);
      }
      ctx.stroke();
    }

    // Draw Entities
    entities.forEach((entity) => {
        const cullBuffer = entity.type === 'text' ? 500 : 0;
        
        if (
            entity.position.x + entity.size.x + cullBuffer < viewLeft ||
            entity.position.x - cullBuffer > viewRight ||
            entity.position.y + entity.size.y + cullBuffer < viewTop ||
            entity.position.y - cullBuffer > viewBottom
        ) {
            return;
        }

        ctx.save();

        if (entity.type === 'text') {
            ctx.fillStyle = entity.color;
            ctx.font = `${entity.fontSize || 20}px monospace`;
            ctx.textBaseline = 'top';
            ctx.fillText(entity.text || 'New Text', entity.position.x, entity.position.y);
        } else if (entity.image) {
            let img = imageCache.current.get(entity.image);
            if (!img) {
                img = new Image();
                img.src = entity.image;
                imageCache.current.set(entity.image, img);
            }
            
            if (img.complete) {
                if ((entity.type === 'player' || entity.type === 'enemy' || entity.type === 'npc') && entity.direction === -1) {
                    ctx.translate(entity.position.x + entity.size.x, entity.position.y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, entity.size.x, entity.size.y);
                } else {
                    ctx.drawImage(img, entity.position.x, entity.position.y, entity.size.x, entity.size.y);
                }
            } else {
                ctx.fillStyle = entity.color;
                ctx.fillRect(entity.position.x, entity.position.y, entity.size.x, entity.size.y);
            }
        } else {
            // Primitive Rendering
            ctx.fillStyle = entity.color;

            if (entity.type === 'player') {
                ctx.fillRect(entity.position.x, entity.position.y, entity.size.x, entity.size.y);
                ctx.fillStyle = 'white';
                const eyeOffset = entity.direction === 1 ? entity.size.x * 0.6 : entity.size.x * 0.1;
                ctx.fillRect(entity.position.x + eyeOffset, entity.position.y + 5, 6, 6);
            } else if (entity.type === 'npc') {
                // NPC Visuals
                ctx.fillRect(entity.position.x, entity.position.y, entity.size.x, entity.size.y);
                // Eyes (Friendly look)
                ctx.fillStyle = 'white';
                ctx.fillRect(entity.position.x + 8, entity.position.y + 8, 4, 6);
                ctx.fillRect(entity.position.x + entity.size.x - 12, entity.position.y + 8, 4, 6);
            } else if (entity.type === 'collectible') {
                 // Inventory Item Visual (Little box with border)
                 const padding = 4;
                 ctx.fillStyle = entity.color;
                 ctx.fillRect(entity.position.x + padding, entity.position.y + padding, entity.size.x - padding*2, entity.size.y - padding*2);
                 ctx.strokeStyle = 'white';
                 ctx.lineWidth = 2/zoom;
                 ctx.strokeRect(entity.position.x + padding, entity.position.y + padding, entity.size.x - padding*2, entity.size.y - padding*2);
            } else if (entity.type === 'coin') {
                ctx.beginPath();
                const cx = entity.position.x + entity.size.x / 2;
                const cy = entity.position.y + entity.size.y / 2;
                ctx.arc(cx, cy, entity.size.x / 2 - 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 / zoom;
                ctx.stroke();
            } else if (entity.type === 'spike') {
                ctx.beginPath();
                ctx.moveTo(entity.position.x, entity.position.y + entity.size.y);
                ctx.lineTo(entity.position.x + entity.size.x / 2, entity.position.y);
                ctx.lineTo(entity.position.x + entity.size.x, entity.position.y + entity.size.y);
                ctx.closePath();
                ctx.fill();
            } else if (entity.type === 'enemy') {
                ctx.fillRect(entity.position.x, entity.position.y, entity.size.x, entity.size.y);
                ctx.fillStyle = 'black';
                ctx.fillRect(entity.position.x + 4, entity.position.y + 8, 4, 4);
                ctx.fillRect(entity.position.x + entity.size.x - 8, entity.position.y + 8, 4, 4);
            } else if (entity.type === 'goal') {
                ctx.fillStyle = '#9ca3af';
                ctx.fillRect(entity.position.x, entity.position.y, 4, entity.size.y);
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.moveTo(entity.position.x + 4, entity.position.y);
                ctx.lineTo(entity.position.x + 24, entity.position.y + 8);
                ctx.lineTo(entity.position.x + 4, entity.position.y + 16);
                ctx.fill();
            } else {
                ctx.fillRect(entity.position.x, entity.position.y, entity.size.x, entity.size.y);
            }
        }

        // Draw Dialogue Bubble if NPC and Player is near
        if (entity.type === 'npc' && player) {
             const dist = Math.sqrt(Math.pow(entity.position.x - player.position.x, 2) + Math.pow(entity.position.y - player.position.y, 2));
             if (dist < 100) {
                 const text = entity.dialogue || "Hello!";
                 ctx.font = `bold ${14/zoom}px sans-serif`;
                 const textMetrics = ctx.measureText(text);
                 const bubbleW = textMetrics.width + 20;
                 const bubbleH = 30;
                 const bubbleX = entity.position.x + entity.size.x/2 - bubbleW/2;
                 const bubbleY = entity.position.y - bubbleH - 10;

                 // Bubble BG
                 ctx.fillStyle = 'white';
                 ctx.strokeStyle = 'black';
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 10);
                 ctx.fill();
                 ctx.stroke();

                 // Triangle pointer
                 ctx.beginPath();
                 ctx.moveTo(entity.position.x + entity.size.x/2, bubbleY + bubbleH + 5);
                 ctx.lineTo(entity.position.x + entity.size.x/2 - 5, bubbleY + bubbleH);
                 ctx.lineTo(entity.position.x + entity.size.x/2 + 5, bubbleY + bubbleH);
                 ctx.fill();
                 
                 // Text
                 ctx.fillStyle = 'black';
                 ctx.fillText(text, bubbleX + 10, bubbleY + 20);
             }
        }
        
        ctx.restore();
    });

    // Draw Selection Overlay & Handles
    if (selectedEntityId) {
        const selected = entities.find(e => e.id === selectedEntityId);
        if (selected) {
            ctx.save();
            ctx.strokeStyle = activeTool === 'scale' ? '#a855f7' : '#38bdf8'; 
            ctx.lineWidth = 2 / zoom; 
            
            // Draw Bounds
            ctx.strokeRect(selected.position.x, selected.position.y, selected.size.x, selected.size.y);

            // Draw Coordinate text
            if (activeTool !== 'scale') {
                ctx.fillStyle = '#38bdf8';
                ctx.font = `${12 / zoom}px monospace`;
                ctx.fillText(`X: ${Math.round(selected.position.x)}`, selected.position.x, selected.position.y - 15);
            }

            // Draw Scale Handles (Cubes)
            if (activeTool === 'scale') {
                const handleSize = 8 / zoom;
                ctx.fillStyle = '#a855f7'; // Purple handles
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1 / zoom;

                const { x, y } = selected.position;
                const { x: w, y: h } = selected.size;

                // Positions: NW, N, NE, E, SE, S, SW, W
                const positions = [
                    { x: x - handleSize/2, y: y - handleSize/2 }, // NW
                    { x: x + w/2 - handleSize/2, y: y - handleSize/2 }, // N
                    { x: x + w - handleSize/2, y: y - handleSize/2 }, // NE
                    { x: x + w - handleSize/2, y: y + h/2 - handleSize/2 }, // E
                    { x: x + w - handleSize/2, y: y + h - handleSize/2 }, // SE
                    { x: x + w/2 - handleSize/2, y: y + h - handleSize/2 }, // S
                    { x: x - handleSize/2, y: y + h - handleSize/2 }, // SW
                    { x: x - handleSize/2, y: y + h/2 - handleSize/2 }, // W
                ];

                positions.forEach(p => {
                    ctx.fillRect(p.x, p.y, handleSize, handleSize);
                    ctx.strokeRect(p.x, p.y, handleSize, handleSize);
                });
            }
            
            ctx.restore();
        }
    }

    ctx.restore();

  }, [entities, width, height, camera, showGrid, selectedEntityId, zoom, activeTool, viewportSize]);

  const getPointerData = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    return {
        screenX,
        screenY,
        worldX: (screenX / zoom) + camera.x,
        worldY: (screenY / zoom) + camera.y
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onPointerDown) return;
    const pos = getPointerData(e);
    if(pos) onPointerDown(pos.worldX, pos.worldY, pos.screenX, pos.screenY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!onPointerMove) return;
    const pos = getPointerData(e);
    if(pos) onPointerMove(pos.worldX, pos.worldY, pos.screenX, pos.screenY);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="touch-none block cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
};

export default GameRenderer;