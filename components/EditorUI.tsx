import React, { useState } from 'react';
import { EditorTool } from '../types';
import { TOOLS } from '../constants';
import { Play, RotateCcw, MousePointer2, Trash2, Square, Ghost, Circle, Hexagon, Hammer, Box, Flag, Save, FolderOpen, Plus, ChevronLeft, ChevronRight, Menu, X, LocateFixed, ZoomIn, ZoomOut, Download, Type, Maximize2, MessageCircle, Backpack, Settings, Smartphone, Monitor, Gamepad2, Package, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface EditorUIProps {
  selectedTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  onPlay: () => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void; 
  onRecenter: () => void;
  // Zoom Props
  zoom: number;
  onZoomChange: (delta: number) => void;
  // Scene Props
  currentSceneIndex: number;
  totalScenes: number;
  onNextScene: () => void;
  onPrevScene: () => void;
  onAddScene: () => void;
  onDeleteScene: () => void;
  // Settings Props
  viewportSize: { width: number, height: number };
  onUpdateViewport: (w: number, h: number) => void;
  onEditControls: () => void;
}

const EditorUI: React.FC<EditorUIProps> = ({ 
  selectedTool, onSelectTool, onPlay, onClear, onSave, onLoad, onExport, onRecenter,
  zoom, onZoomChange,
  currentSceneIndex, totalScenes, onNextScene, onPrevScene, onAddScene, onDeleteScene,
  viewportSize, onUpdateViewport, onEditControls
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(true);
  
  const getIcon = (name: string) => {
    switch (name) {
      case 'Pointer': return <MousePointer2 size={24} />;
      case 'Scaling': return <Maximize2 size={24} />;
      case 'Eraser': return <Trash2 size={24} />;
      case 'Type': return <Type size={24} />;
      case 'MessageCircle': return <MessageCircle size={24} />;
      case 'Backpack': return <Backpack size={24} />;
      case 'User': return <div className="font-bold text-xl">P</div>;
      case 'Square': return <Square size={24} fill="currentColor" />;
      case 'Minus': return <div className="h-3 w-6 bg-current rounded" />;
      case 'Circle': return <Circle size={24} />;
      case 'Ghost': return <Ghost size={24} />;
      case 'Triangle': return <Hexagon size={24} className="rotate-30" />;
      case 'Flag': return <Flag size={24} fill="currentColor" />;
      default: return <Square size={24} />;
    }
  };

  // Slice index 3 separates Logic Tools (Select, Scale, Eraser) from Create Tools (Objects)
  const manipulationTools = TOOLS.slice(0, 3); 
  const creationTools = TOOLS.slice(3);    

  return (
    <>
      {/* --- TOP BAR (Menu & Play) --- */}
      <div className="absolute top-0 inset-x-0 p-4 pointer-events-none flex justify-between items-start z-40">
          
          <div className="flex gap-2 pointer-events-auto">
            {/* Menu Toggle */}
            <button 
                onClick={() => setIsMenuOpen(true)}
                className="bg-gray-800/90 text-white p-3 rounded-full shadow-lg border border-gray-600 backdrop-blur-md active:scale-95 transition-all"
            >
                <Menu size={24} />
            </button>

            {/* Settings Toggle */}
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-full shadow-lg border border-gray-600 backdrop-blur-md active:scale-95 transition-all ${showSettings ? 'bg-blue-600 text-white' : 'bg-gray-800/90 text-gray-300'}`}
            >
                <Settings size={24} />
            </button>
          </div>

          {/* Play Button */}
          <button 
              onClick={onPlay}
              className="pointer-events-auto bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 transition-transform active:scale-95 border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
          >
              <Play size={20} fill="currentColor" />
              PLAY
          </button>
      </div>

      {/* --- SETTINGS POPUP --- */}
      {showSettings && (
          <div className="absolute top-20 left-4 z-40 bg-gray-900/95 backdrop-blur border border-gray-700 p-4 rounded-2xl shadow-2xl w-64 animate-in slide-in-from-left duration-200 pointer-events-auto">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2"><Settings size={16}/> Settings</h3>
                  <button onClick={() => setShowSettings(false)}><X size={16} className="text-gray-400"/></button>
              </div>
              
              <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Resolution</label>
                    <div className="space-y-2">
                        <button 
                            onClick={() => onUpdateViewport(360, 640)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border ${viewportSize.width === 360 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <span className="flex items-center gap-2"><Smartphone size={16}/> Portrait</span>
                            <span className="text-[10px] font-mono">360x640</span>
                        </button>

                        <button 
                            onClick={() => onUpdateViewport(640, 360)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border ${viewportSize.width === 640 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <span className="flex items-center gap-2"><Smartphone size={16} className="rotate-90"/> Landscape</span>
                            <span className="text-[10px] font-mono">640x360</span>
                        </button>
                    </div>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Controls</label>
                     <button 
                        onClick={() => { setShowSettings(false); onEditControls(); }}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold active:scale-95 transition-all"
                     >
                        <Gamepad2 size={18}/> Customize Controls
                     </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- RIGHT SIDEBAR (Zoom/Recenter) --- */}
      {!isMenuOpen && (
         <div className="absolute right-4 top-24 z-30 pointer-events-auto flex flex-col gap-3">
            <button 
                onClick={onRecenter}
                className="bg-gray-800/90 text-blue-400 p-3 rounded-full shadow-lg border border-gray-600 backdrop-blur-md active:scale-95 transition-all hover:text-white"
                title="Recenter Camera"
            >
                <LocateFixed size={24} />
            </button>

            <div className="flex flex-col gap-1 bg-gray-800/90 rounded-full border border-gray-600 shadow-lg backdrop-blur-md p-1">
                <button 
                    onClick={() => onZoomChange(0.1)}
                    className="p-3 text-gray-300 hover:text-white active:scale-95 transition-transform"
                >
                    <ZoomIn size={24} />
                </button>
                <div className="h-px w-full bg-gray-600"></div>
                <button 
                    onClick={() => onZoomChange(-0.1)}
                    className="p-3 text-gray-300 hover:text-white active:scale-95 transition-transform"
                >
                    <ZoomOut size={24} />
                </button>
            </div>
         </div>
      )}

      {/* --- LEFT SIDEBAR (OBJECTS PALETTE) --- */}
      {!isMenuOpen && (
        <>
            {/* Toggle Button */}
            <div className="absolute left-0 top-24 z-40 pointer-events-auto">
                 <button 
                    onClick={() => setIsAssetsOpen(!isAssetsOpen)}
                    className={`bg-gray-800/90 text-white p-2 rounded-r-xl border-y border-r border-gray-600 shadow-lg transition-transform ${isAssetsOpen ? '' : 'translate-x-0'}`}
                 >
                    {isAssetsOpen ? <ChevronsLeft size={20}/> : <ChevronsRight size={20}/>}
                 </button>
            </div>

            {/* Panel */}
            <div className={`absolute left-4 top-24 bottom-28 w-16 z-30 flex flex-col pointer-events-none transition-transform duration-300 ${isAssetsOpen ? 'translate-x-0' : '-translate-x-[150%]'}`}>
                {/* Scrollable Container */}
                <div className="pointer-events-auto flex-1 overflow-y-auto no-scrollbar bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-3">
                    <div className="text-[10px] text-center font-bold text-gray-500 uppercase border-b border-gray-700 pb-2 mb-1">
                        Assets
                    </div>
                    {creationTools.map((tool) => (
                        <button
                            key={tool.label}
                            onClick={() => onSelectTool(tool)}
                            className={`
                                flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all relative shrink-0
                                ${selectedTool.label === tool.label 
                                ? 'bg-gray-700 text-white ring-2 ring-white scale-105 shadow-lg' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                            `}
                            title={tool.label}
                        >
                            <div style={{ color: selectedTool.label !== tool.label ? tool.color : 'white' }}>
                                {getIcon(tool.icon)}
                            </div>
                            {selectedTool.label === tool.label && (
                                <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </>
      )}

      {/* --- BOTTOM CENTER BAR (MANIPULATION TOOLS) --- */}
      {!isMenuOpen && (
        <div className="absolute inset-x-0 bottom-8 pointer-events-none flex justify-center z-30">
            <div className="pointer-events-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700 p-2 shadow-2xl rounded-2xl flex items-center gap-4">
                 {manipulationTools.map((tool) => (
                    <button
                        key={tool.label}
                        onClick={() => onSelectTool(tool)}
                        className={`
                            flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all relative overflow-hidden group
                            ${selectedTool.label === tool.label 
                            ? 'bg-blue-600 text-white shadow-lg scale-110' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                        `}
                    >
                        <div className="z-10 mb-1">{getIcon(tool.icon)}</div>
                        <span className="text-[8px] uppercase font-bold tracking-wider">{tool.label}</span>
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* --- FULL SCREEN MAIN MENU --- */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-200 pointer-events-auto overflow-y-auto">
            
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Project Menu</h2>
                <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="space-y-8 max-w-md mx-auto w-full">
                {/* Scene Manager Section */}
                <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">Scene Management</label>
                    
                    <div className="flex items-center justify-between bg-gray-900 rounded-xl p-2 mb-4">
                        <button 
                            onClick={onPrevScene} 
                            disabled={currentSceneIndex === 0}
                            className="p-3 bg-gray-800 rounded-lg disabled:opacity-30 active:scale-95"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">CURRENT SCENE</span>
                            <span className="text-xl font-bold text-blue-400">{currentSceneIndex + 1} <span className="text-gray-600 text-sm">/ {totalScenes}</span></span>
                        </div>
                        <button 
                            onClick={onNextScene} 
                            disabled={currentSceneIndex === totalScenes - 1}
                            className="p-3 bg-gray-800 rounded-lg disabled:opacity-30 active:scale-95"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <button onClick={onAddScene} className="flex items-center justify-center gap-2 bg-blue-600/20 text-blue-400 p-3 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-colors">
                            <Plus size={18} /> Add Scene
                         </button>
                         <button onClick={onDeleteScene} className="flex items-center justify-center gap-2 bg-red-500/10 text-red-400 p-3 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors">
                            <Trash2 size={18} /> Delete
                         </button>
                    </div>
                </div>

                {/* Project Actions */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { onSave(); setIsMenuOpen(false); }} className="flex flex-col items-center justify-center gap-2 bg-gray-800 p-6 rounded-2xl border border-gray-700 active:scale-95 transition-transform">
                            <Save size={32} className="text-green-400" />
                            <span className="font-bold">Save Project</span>
                        </button>
                        <button onClick={() => { onLoad(); setIsMenuOpen(false); }} className="flex flex-col items-center justify-center gap-2 bg-gray-800 p-6 rounded-2xl border border-gray-700 active:scale-95 transition-transform">
                            <FolderOpen size={32} className="text-yellow-400" />
                            <span className="font-bold">Load Project</span>
                        </button>
                    </div>
                    {/* EXPORT BUTTON */}
                    <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center justify-center gap-3 bg-purple-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-purple-700 active:scale-95 transition-all">
                        <Download size={24} />
                        Export to Android (HTML)
                    </button>
                </div>

                {/* Danger Zone */}
                <button onClick={() => { onClear(); setIsMenuOpen(false); }} className="w-full bg-red-900/30 text-red-400 border border-red-900/50 p-4 rounded-xl flex items-center justify-center gap-2 font-bold mt-auto active:scale-95 transition-transform">
                    <RotateCcw size={20} /> Reset Current Scene
                </button>
            </div>
        </div>
      )}
    </>
  );
};

export default EditorUI;