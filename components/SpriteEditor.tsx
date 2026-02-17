import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, Eraser, Pen, PaintBucket, Minus } from 'lucide-react';

interface SpriteEditorProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
  initialImage?: string;
}

const PALETTE = [
  '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'
];

const SpriteEditor: React.FC<SpriteEditorProps> = ({ onSave, onClose, initialImage }) => {
  const [resolution, setResolution] = useState<16 | 32 | 64>(32);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill' | 'line'>('pen');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for Line Tool
  const isDragging = useRef(false);
  const dragStart = useRef<{x: number, y: number} | null>(null);
  const canvasSnapshot = useRef<ImageData | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas internal size
    canvas.width = resolution;
    canvas.height = resolution;

    // Fill transparent background (checkerboard visual handled by CSS)
    ctx.clearRect(0, 0, resolution, resolution);
    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false;

    if (initialImage) {
      const img = new Image();
      img.src = initialImage;
      img.onload = () => {
          ctx.drawImage(img, 0, 0, resolution, resolution);
      };
    }
  }, [resolution, initialImage]);

  // Bresenham's Line Algorithm
  const plotLine = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string | null) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while(true) {
        // Draw pixel
        if (color === null) {
             ctx.clearRect(x0, y0, 1, 1); // Eraser logic for line if needed, though usually Pen only
        } else {
             ctx.fillStyle = color;
             ctx.fillRect(x0, y0, 1, 1);
        }

        if ((x0 === x1) && (y0 === y1)) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
  };

  const getPointerPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * resolution);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * resolution);
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDragging.current = true;
    const { x, y } = getPointerPos(e);
    
    if (x < 0 || x >= resolution || y < 0 || y >= resolution) return;

    if (tool === 'line') {
        dragStart.current = { x, y };
        // Save current state to restore during preview
        canvasSnapshot.current = ctx.getImageData(0, 0, resolution, resolution);
        // Draw the initial dot
        ctx.fillStyle = selectedColor;
        ctx.fillRect(x, y, 1, 1);
    } else if (tool === 'fill') {
        floodFill(ctx, x, y, selectedColor);
    } else {
        // Pen or Eraser immediate draw
        drawPixel(ctx, x, y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPointerPos(e);
    
    // Bounds check loosely (allow dragging out, but clamp for drawing)
    const clampedX = Math.max(0, Math.min(resolution - 1, x));
    const clampedY = Math.max(0, Math.min(resolution - 1, y));

    if (tool === 'line' && dragStart.current && canvasSnapshot.current) {
        // Restore previous state (clear old preview line)
        ctx.putImageData(canvasSnapshot.current, 0, 0);
        // Draw new preview line
        plotLine(ctx, dragStart.current.x, dragStart.current.y, clampedX, clampedY, selectedColor);
    } else if (tool === 'pen' || tool === 'eraser') {
        drawPixel(ctx, clampedX, clampedY);
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    dragStart.current = null;
    canvasSnapshot.current = null;
  };

  const drawPixel = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      if (tool === 'eraser') {
          ctx.clearRect(x, y, 1, 1);
      } else {
          ctx.fillStyle = selectedColor;
          ctx.fillRect(x, y, 1, 1);
      }
  };

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillHex: string) => {
      const width = resolution;
      const height = resolution;
      const imgData = ctx.getImageData(0,0, width, height);
      const data = imgData.data;

      // Helper to get hex from index
      const getPixelColor = (x: number, y: number) => {
         const i = (y * width + x) * 4;
         return { r: data[i], g: data[i+1], b: data[i+2], a: data[i+3] };
      };

      const startColor = getPixelColor(startX, startY);
      
      // Convert fillHex to RGBA
      const r = parseInt(fillHex.slice(1, 3), 16);
      const g = parseInt(fillHex.slice(3, 5), 16);
      const b = parseInt(fillHex.slice(5, 7), 16);
      
      // If same color, abort
      if (startColor.r === r && startColor.g === g && startColor.b === b && startColor.a === 255) return;

      const matchStartColor = (x: number, y: number) => {
          const c = getPixelColor(x, y);
          return c.r === startColor.r && c.g === startColor.g && c.b === startColor.b && c.a === startColor.a;
      };

      const stack = [[startX, startY]];
      
      while (stack.length) {
          const [cx, cy] = stack.pop()!;
          const i = (cy * width + cx) * 4;
          
          if (matchStartColor(cx, cy)) {
              data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255;
              
              if (cx > 0) stack.push([cx - 1, cy]);
              if (cx < width - 1) stack.push([cx + 1, cy]);
              if (cy > 0) stack.push([cx, cy - 1]);
              if (cy < height - 1) stack.push([cx, cy + 1]);
          }
      }
      ctx.putImageData(imgData, 0, 0);
  };

  const handleSave = () => {
    if (canvasRef.current) {
        onSave(canvasRef.current.toDataURL());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X /></button>
            <div className="flex gap-2">
                <button onClick={() => setResolution(16)} className={`px-3 py-1 rounded ${resolution===16 ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>16px</button>
                <button onClick={() => setResolution(32)} className={`px-3 py-1 rounded ${resolution===32 ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>32px</button>
                <button onClick={() => setResolution(64)} className={`px-3 py-1 rounded ${resolution===64 ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>64px</button>
            </div>
            <button onClick={handleSave} className="p-2 bg-green-600 text-white rounded-full"><Check /></button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-950 p-4 overflow-hidden relative">
            <div 
                className="relative bg-white shadow-2xl"
                style={{ 
                    width: 'min(90vw, 90vh)', 
                    height: 'min(90vw, 90vh)',
                    backgroundImage: 'conic-gradient(#eee 25%, white 0 50%, #eee 0 75%, white 0)',
                    backgroundSize: '20px 20px'
                }}
            >
                <canvas 
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair touch-none"
                    style={{ imageRendering: 'pixelated' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />
            </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button onClick={() => setTool('pen')} className={`p-3 rounded-xl ${tool==='pen' ? 'bg-blue-600' : 'bg-gray-700'}`} title="Pen"><Pen size={20}/></button>
                    <button onClick={() => setTool('line')} className={`p-3 rounded-xl ${tool==='line' ? 'bg-blue-600' : 'bg-gray-700'}`} title="Line Tool"><Minus size={20}/></button>
                    <button onClick={() => setTool('eraser')} className={`p-3 rounded-xl ${tool==='eraser' ? 'bg-blue-600' : 'bg-gray-700'}`} title="Eraser"><Eraser size={20}/></button>
                    <button onClick={() => setTool('fill')} className={`p-3 rounded-xl ${tool==='fill' ? 'bg-blue-600' : 'bg-gray-700'}`} title="Fill"><PaintBucket size={20}/></button>
                    <button onClick={() => {
                        const ctx = canvasRef.current?.getContext('2d');
                        ctx?.clearRect(0,0,resolution,resolution);
                    }} className="p-3 rounded-xl bg-red-900/50 text-red-400"><Trash2 size={20}/></button>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white" style={{ backgroundColor: selectedColor }} />
            </div>
            
            {/* Palette */}
            <div className="grid grid-cols-8 gap-2">
                {PALETTE.map(c => (
                    <button 
                        key={c} 
                        className={`w-full aspect-square rounded-md border-2 ${selectedColor===c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        onClick={() => { setSelectedColor(c); setTool('pen'); }}
                    />
                ))}
                <div className="col-span-1 relative">
                    <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-full h-full opacity-0 absolute inset-0"/>
                    <div className="w-full h-full rounded-md bg-gradient-to-br from-red-500 to-blue-500 flex items-center justify-center text-[10px]">+</div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SpriteEditor;