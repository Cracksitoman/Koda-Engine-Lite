import React, { useRef } from 'react';
import { Entity, EntityType, ItemUsageType } from '../types';
import { X, Sliders, Upload, Image as ImageIcon, Trash2, Brush, Type, MessageSquare, Tag, Wrench, Hammer } from 'lucide-react';
import { GRID_SIZE, JUMP_FORCE, MOVE_SPEED } from '../constants';

interface InspectorProps {
  entity: Entity;
  onUpdate: (updates: Partial<Entity>) => void;
  onClose: () => void;
  onOpenSpriteEditor: (currentImage?: string) => void;
}

const Inspector: React.FC<InspectorProps> = ({ entity, onUpdate, onClose, onOpenSpriteEditor }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNumberChange = (field: keyof Entity | 'width' | 'height', value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (field === 'width') {
      onUpdate({ size: { ...entity.size, x: num } });
    } else if (field === 'height') {
      onUpdate({ size: { ...entity.size, y: num } });
    } else {
        // @ts-ignore
        onUpdate({ [field]: num });
    }
  };

  const handleVectorChange = (field: 'position', axis: 'x' | 'y', value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newPos = { ...entity.position, [axis]: num };
    const extraUpdates = entity.type === 'enemy' ? { originalX: newPos.x } : {};
    onUpdate({ [field]: newPos, ...extraUpdates });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              onUpdate({ image: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    // Fixed at bottom, full width on mobile, max-height constraints
    <div className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-700 rounded-t-3xl shadow-2xl p-5 text-sm pointer-events-auto flex flex-col gap-4 max-h-[60vh] overflow-y-auto z-40 animate-in slide-in-from-bottom duration-300">
      
      {/* Header with Drag Handle look */}
      <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-2 flex-shrink-0" />
      
      <div className="flex justify-between items-center pb-2 border-b border-gray-800">
        <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-lg">
          <Sliders size={20} />
          {entity.type}
        </div>
        <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Appearance */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Visuals</h3>
            
            {entity.type === 'text' ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Content</label>
                        <textarea 
                            value={entity.text || ''} 
                            onChange={(e) => onUpdate({ text: e.target.value })}
                            className="w-full bg-gray-800 rounded-lg p-2 text-white border border-gray-700 focus:border-blue-500 outline-none"
                            rows={2}
                            placeholder="Enter text..."
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-400">Size</span>
                            <span className="text-xs font-mono text-blue-300">{entity.fontSize || 20}px</span>
                        </div>
                        <input 
                            type="range" min="8" max="128" step="1" 
                            value={entity.fontSize || 20} 
                            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                            className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none" 
                        />
                    </div>
                    <div className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                         <span className="text-gray-400">Color</span>
                         <input 
                            type="color" 
                            value={entity.color} 
                            onChange={(e) => onUpdate({ color: e.target.value })}
                            className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                        />
                    </div>
                </div>
            ) : (
                <div className="flex gap-4">
                    {/* Color */}
                    <div className="flex-1 bg-gray-800 p-3 rounded-xl flex items-center justify-between">
                        <span className="text-gray-400">Color</span>
                        <input 
                            type="color" 
                            value={entity.color} 
                            onChange={(e) => onUpdate({ color: e.target.value })}
                            className="w-8 h-8 rounded-lg border-none cursor-pointer bg-transparent"
                        />
                    </div>

                    {/* Sprite Control */}
                    <div className="flex-1 flex gap-2">
                        {entity.image ? (
                            <div className="relative group flex-1">
                                <img src={entity.image} alt="Sprite" className="w-full h-12 object-contain bg-black/50 rounded-xl border border-gray-700" onClick={() => onOpenSpriteEditor(entity.image)} />
                                <button 
                                    onClick={() => onUpdate({ image: undefined })}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md"
                                >
                                    <X size={12} />
                                </button>
                                <button 
                                    onClick={() => onOpenSpriteEditor(entity.image)}
                                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-tl-lg shadow-sm"
                                >
                                    <Brush size={12} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => onOpenSpriteEditor()}
                                    className="flex-1 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600 transition-colors"
                                    title="Draw Pixel Art"
                                >
                                    <Brush size={16} className="text-purple-400" />
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center border border-dashed border-gray-600 transition-colors"
                                    title="Upload Image"
                                >
                                    <ImageIcon size={16} className="text-gray-400" />
                                </button>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                </div>
            )}

            {/* Transform */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <span className="text-[10px] text-gray-500 block">X</span>
                    <input type="number" value={Math.round(entity.position.x)} onChange={(e) => handleVectorChange('position', 'x', e.target.value)} className="w-full bg-transparent text-center font-mono text-white outline-none" />
                </div>
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <span className="text-[10px] text-gray-500 block">Y</span>
                    <input type="number" value={Math.round(entity.position.y)} onChange={(e) => handleVectorChange('position', 'y', e.target.value)} className="w-full bg-transparent text-center font-mono text-white outline-none" />
                </div>
                {entity.type !== 'text' && (
                    <>
                    <div className="bg-gray-800 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-gray-500 block">W</span>
                        <input type="number" value={entity.size.x} onChange={(e) => handleNumberChange('width', e.target.value)} className="w-full bg-transparent text-center font-mono text-white outline-none" />
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-gray-500 block">H</span>
                        <input type="number" value={entity.size.y} onChange={(e) => handleNumberChange('height', e.target.value)} className="w-full bg-transparent text-center font-mono text-white outline-none" />
                    </div>
                    </>
                )}
            </div>
          </div>

          {/* Column 2: Behavior (Conditional) */}
          {(entity.type === 'player' || entity.type === 'enemy' || entity.type === 'npc' || entity.type === 'collectible') && (
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Behavior</h3>
                
                {entity.type === 'collectible' && (
                    <div className="space-y-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                         <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-400 flex items-center gap-1"><Tag size={12}/> Item Name</span>
                            </div>
                            <input 
                                type="text"
                                value={entity.text || ''} 
                                onChange={(e) => onUpdate({ text: e.target.value })}
                                className="w-full bg-gray-800 rounded-lg p-2 text-white border border-gray-700 focus:border-purple-500 outline-none"
                                placeholder="e.g. Sword, Key, Apple"
                            />
                        </div>
                        
                        <div className="pt-2 border-t border-gray-700">
                            <span className="text-xs text-gray-400 flex items-center gap-1 mb-2"><Wrench size={12}/> Item Usage</span>
                            <div className="grid grid-cols-2 gap-2">
                                {(['none', 'place', 'destroy', 'heal', 'shoot'] as ItemUsageType[]).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => onUpdate({ usageType: type })}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold capitalize border ${entity.usageType === type ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* If Place selected, show what to place */}
                        {entity.usageType === 'place' && (
                            <div className="pt-2">
                                <span className="text-xs text-gray-400 block mb-2">Object to Place:</span>
                                <select 
                                    value={entity.placeEntityType || 'wall'}
                                    onChange={(e) => onUpdate({ placeEntityType: e.target.value as EntityType })}
                                    className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-2 outline-none focus:border-purple-500"
                                >
                                    <option value="wall">Wall (Block)</option>
                                    <option value="platform">Platform</option>
                                    <option value="spike">Spike</option>
                                    <option value="coin">Coin</option>
                                </select>
                            </div>
                        )}
                        
                        <p className="text-[10px] text-gray-500 mt-1 italic">
                            {entity.usageType === 'place' && "Places object in front of player."}
                            {entity.usageType === 'destroy' && "Removes object in front of player."}
                            {entity.usageType === 'heal' && "Restores player health."}
                            {entity.usageType === 'shoot' && "Fires a projectile."}
                        </p>
                    </div>
                )}

                {entity.type === 'npc' && (
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-400 flex items-center gap-1"><MessageSquare size={12}/> Dialogue</span>
                            </div>
                            <textarea 
                                value={entity.dialogue || ''} 
                                onChange={(e) => onUpdate({ dialogue: e.target.value })}
                                className="w-full bg-gray-800 rounded-lg p-2 text-white border border-gray-700 focus:border-orange-500 outline-none"
                                rows={2}
                                placeholder="Hello traveler!"
                            />
                        </div>
                    </div>
                )}

                {entity.type === 'player' && (
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-gray-400">Speed</span>
                                <span className="text-xs font-mono text-blue-300">{entity.speed ?? MOVE_SPEED}</span>
                            </div>
                            <input type="range" min="1" max="20" step="0.5" value={entity.speed ?? MOVE_SPEED} onChange={(e) => handleNumberChange('speed', e.target.value)} className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-gray-400">Jump Power</span>
                                <span className="text-xs font-mono text-blue-300">{Math.abs(entity.jumpForce ?? JUMP_FORCE)}</span>
                            </div>
                            <input type="range" min="5" max="25" step="0.5" value={Math.abs(entity.jumpForce ?? JUMP_FORCE)} onChange={(e) => onUpdate({ jumpForce: -parseFloat(e.target.value) })} className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none" />
                        </div>
                    </div>
                )}

                {entity.type === 'enemy' && (
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-xs text-gray-400">Patrol Range</span>
                            <span className="text-xs font-mono text-red-300">{entity.patrolRange ?? 0}px</span>
                        </div>
                        <input type="range" min="0" max="500" step="10" value={entity.patrolRange ?? 0} onChange={(e) => handleNumberChange('patrolRange', e.target.value)} className="w-full accent-red-500 h-2 bg-gray-700 rounded-lg appearance-none" />
                    </div>
                )}
            </div>
          )}
      </div>

      <div className="h-4"></div>
    </div>
  );
};

export default Inspector;