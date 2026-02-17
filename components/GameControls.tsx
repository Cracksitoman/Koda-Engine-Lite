import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Crosshair, Hand, Move, GripHorizontal, Save, XCircle } from 'lucide-react';
import { Entity, ControlLayout, ControlConfig } from '../types';
import { DEFAULT_CONTROL_LAYOUT } from '../constants';

interface GameControlsProps {
  onInputStart: (key: 'left' | 'right' | 'jump' | 'shoot' | 'use') => void;
  onInputEnd: (key: 'left' | 'right' | 'jump' | 'shoot' | 'use') => void;
  onStop: () => void;
  score: number;
  inventory?: Entity[]; 
  activeItemIndex?: number; 
  onEquip?: (index: number) => void;
  
  // Customization Props
  layout?: ControlLayout;
  isEditing?: boolean;
  onUpdateLayout?: (newLayout: ControlLayout) => void;
}

const GameControls: React.FC<GameControlsProps> = ({ 
    onInputStart, onInputEnd, onStop, score, 
    inventory = [], activeItemIndex, onEquip,
    layout = DEFAULT_CONTROL_LAYOUT, isEditing = false, onUpdateLayout
}) => {
  const [draggingKey, setDraggingKey] = useState<keyof ControlLayout | null>(null);
  const [selectedForResize, setSelectedForResize] = useState<keyof ControlLayout | null>(null);

  // Global Pointer Up listener to prevent "sticky" controls if released outside
  useEffect(() => {
    if (draggingKey) {
        const handleGlobalUp = () => setDraggingKey(null);
        window.addEventListener('pointerup', handleGlobalUp);
        window.addEventListener('touchend', handleGlobalUp);
        return () => {
            window.removeEventListener('pointerup', handleGlobalUp);
            window.removeEventListener('touchend', handleGlobalUp);
        };
    }
  }, [draggingKey]);

  // Helper to render a draggable/usable button
  const renderButton = (key: keyof ControlLayout, icon: React.ReactNode, colorClass: string, baseSize: string) => {
      const config = layout[key];
      const style: React.CSSProperties = {
          position: 'absolute',
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: `scale(${config.size}) translate(-50%, -50%)`, // Center anchor
          touchAction: 'none'
      };

      const handlePointerDown = (e: React.PointerEvent) => {
          if (isEditing) {
              e.preventDefault();
              e.stopPropagation();
              setDraggingKey(key);
              setSelectedForResize(key); // Also select for slider
          } else {
              onInputStart(key === 'use' || key === 'shoot' || key === 'jump' || key === 'left' || key === 'right' ? key : 'use');
          }
      };

      const handlePointerUp = (e: React.PointerEvent) => {
         if (isEditing) {
             setDraggingKey(null);
         } else {
             onInputEnd(key as any);
         }
      };

      return (
        <button
            key={key}
            style={style}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp} // Safety for non-editing mode
            className={`
                ${baseSize} rounded-full flex items-center justify-center transition-colors shadow-lg
                ${isEditing && selectedForResize === key ? 'ring-4 ring-yellow-400 z-50' : ''}
                ${isEditing ? 'cursor-move bg-gray-800/80 border-2 border-white border-dashed' : colorClass + ' backdrop-blur border-2'}
            `}
        >
            {icon}
            {isEditing && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-1 rounded">{key}</div>}
        </button>
      );
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
      if (!isEditing || !draggingKey || !onUpdateLayout) return;
      
      const container = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - container.left) / container.width) * 100;
      const y = ((e.clientY - container.top) / container.height) * 100;

      onUpdateLayout({
          ...layout,
          [draggingKey]: {
              ...layout[draggingKey],
              x,
              y
          }
      });
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedForResize || !onUpdateLayout) return;
      const size = parseFloat(e.target.value);
      onUpdateLayout({
          ...layout,
          [selectedForResize]: {
              ...layout[selectedForResize],
              size
          }
      });
  };

  return (
    <div 
        className="absolute inset-0 z-50 overflow-hidden" 
        onPointerMove={handleContainerPointerMove}
    >
      
      {/* --- HUD & Top Bar --- */}
      <div className="absolute top-0 inset-x-0 p-4 pointer-events-none flex justify-between items-start z-[100]">
        <div className="bg-black/50 backdrop-blur text-yellow-400 font-mono text-xl px-4 py-2 rounded-lg border border-yellow-500/30 pointer-events-auto select-none">
          SCORE: {score.toString().padStart(4, '0')}
        </div>
        
        {isEditing ? (
             <div 
                className="pointer-events-auto bg-gray-900/90 p-4 rounded-xl border border-yellow-500 animate-in slide-in-from-top flex flex-col items-center gap-2"
                onPointerDown={(e) => e.stopPropagation()} // Prevent dragging controls when touching menu
             >
                 <h3 className="text-yellow-400 font-bold flex items-center gap-2"><Move size={16}/> EDIT MODE</h3>
                 {selectedForResize ? (
                     <div className="w-full">
                         <div className="flex justify-between text-xs text-gray-400 mb-1">
                             <span>Size ({layout[selectedForResize].size.toFixed(1)}x)</span>
                         </div>
                         <input 
                            type="range" min="0.5" max="2.0" step="0.1"
                            value={layout[selectedForResize].size}
                            onChange={handleSizeChange}
                            className="w-full accent-yellow-400 h-2 bg-gray-700 rounded-lg appearance-none"
                         />
                     </div>
                 ) : (
                     <p className="text-xs text-gray-400">Tap a button to resize</p>
                 )}
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setDraggingKey(null); // Force clear drag
                        onStop();
                    }} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className="mt-2 bg-green-600 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2"
                 >
                    <Save size={14}/> SAVE & EXIT
                 </button>
             </div>
        ) : (
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    // Don't prevent default here or click might not fire on some touch devices, 
                    // but we call onStop immediately to be safe
                    onStop();
                }}
                className="bg-red-600/90 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold border-2 border-red-800 shadow-lg pointer-events-auto active:scale-95 transition-transform flex items-center gap-2 select-none touch-none"
                style={{ touchAction: 'none' }}
            >
                <XCircle size={20} /> STOP
            </button>
        )}
      </div>

      {/* --- CONTROLS LAYER --- */}
      <div className="w-full h-full relative pointer-events-auto">
          {renderButton('left', <ArrowLeft size={32}/>, 'bg-white/10 active:bg-white/30 border-white/20', 'w-16 h-16')}
          {renderButton('right', <ArrowRight size={32}/>, 'bg-white/10 active:bg-white/30 border-white/20', 'w-16 h-16')}
          
          {renderButton('jump', <ArrowUp size={40} className="text-blue-400"/>, 'bg-blue-500/20 active:bg-blue-500/40 border-blue-500/30', 'w-20 h-20')}
          {renderButton('shoot', <Crosshair size={32} className="text-red-400"/>, 'bg-red-500/20 active:bg-red-500/40 border-red-500/30', 'w-16 h-16')}
          
          {/* THE USE BUTTON */}
          {renderButton('use', <Hand size={24} className="text-purple-300"/>, 'bg-purple-500/20 active:bg-purple-500/40 border-purple-500/30', 'w-14 h-14')}
      </div>

      {/* --- INVENTORY HOTBAR (Fixed at bottom center) --- */}
      {/* We don't make this draggable yet to keep it simple, but it's part of the HUD */}
      {!isEditing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 p-2 bg-black/60 backdrop-blur rounded-xl border-2 border-gray-600 shadow-2xl z-40 pointer-events-auto">
            {Array.from({ length: 5 }).map((_, i) => {
                const item = inventory[i];
                const isActive = activeItemIndex === i;
                return (
                    <button 
                        key={i} 
                        onClick={() => onEquip && onEquip(i)}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center relative overflow-hidden group transition-all
                            ${isActive ? 'bg-purple-600 border-2 border-white scale-110 z-20 shadow-lg shadow-purple-500/50' : 'bg-gray-800/80 border-2 border-gray-700 active:scale-95'}
                        `}
                    >
                        {item ? (
                            <>
                                {item.image ? (
                                    <img src={item.image} className="w-full h-full object-contain" alt="item" />
                                ) : (
                                    <div className="w-6 h-6 rounded bg-purple-500/50 border border-purple-400"></div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] text-center truncate text-white px-0.5">
                                    {item.text || 'Item'}
                                </div>
                                {item.usageType && item.usageType !== 'none' && (
                                    <div className="absolute top-0 right-0 p-0.5 bg-blue-500 rounded-bl text-[6px] font-bold">
                                        {item.usageType[0].toUpperCase()}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-700 text-xs font-mono">{i + 1}</div>
                        )}
                    </button>
                )
            })}
        </div>
      )}
    </div>
  );
};

export default GameControls;