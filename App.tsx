import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Entity, Scene, EditorTool, EntityType, ProjectSettings, ControlLayout } from './types';
import { GRID_SIZE, TOOLS, INITIAL_ENTITIES, JUMP_FORCE, BULLET_SPEED, MOVE_SPEED, DEFAULT_CONTROL_LAYOUT } from './constants';
import GameRenderer from './components/GameRenderer';
import EditorUI from './components/EditorUI';
import GameControls from './components/GameControls';
import Inspector from './components/Inspector';
import SpriteEditor from './components/SpriteEditor';
import { updatePhysics, performItemAction } from './services/gameEngine';
import { v4 as uuidv4 } from 'uuid';

const generateId = () => Math.random().toString(36).substr(2, 9);
const SAVE_KEY = 'koda_engine_lite_v1';

const DEFAULT_SCENE: Scene = {
    id: 'scene_1',
    name: 'Level 1',
    entities: INITIAL_ENTITIES
};

const DEFAULT_SETTINGS: ProjectSettings = {
    viewportWidth: 360,
    viewportHeight: 640,
    controlLayout: DEFAULT_CONTROL_LAYOUT
};

const App: React.FC = () => {
  // Screen Dimensions
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Scene Management
  const [scenes, setScenes] = useState<Scene[]>([DEFAULT_SCENE]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // Project Settings
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);

  // Game State
  const [mode, setMode] = useState<'editing' | 'playing' | 'editing_ui'>('editing');
  const [score, setScore] = useState(0);
  
  // Camera & Zoom
  const [camera, setCamera] = useState({ x: 0, y: 0 }); 
  const [zoom, setZoom] = useState(1); 
  
  // Entities State
  const [activeEntities, setActiveEntities] = useState<Entity[]>(INITIAL_ENTITIES);
  
  // Inventory State
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);

  // Editor State
  const [selectedTool, setSelectedTool] = useState<EditorTool>(TOOLS[4]); // Default to Player or Object
  const [showSpriteEditor, setShowSpriteEditor] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  
  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false); 
  const [lastScreenPos, setLastScreenPos] = useState<{x: number, y: number} | null>(null);

  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  // Interaction Data (for move and scale)
  const [dragStartData, setDragStartData] = useState<{ 
      x: number, 
      y: number, 
      initialPosX: number,
      initialPosY: number,
      initialSizeX: number, 
      initialSizeY: number 
  } | null>(null);

  // Double Click Logic
  const lastClickTimeRef = useRef<number>(0);

  // Refs for loop
  const inputRef = useRef({ left: false, right: false, jump: false, shoot: false, use: false });
  const entitiesRef = useRef<Entity[]>(activeEntities); 
  const sceneSnapshotRef = useRef<Entity[]>([]); 
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // Resize handler
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync Active Entities when Scene Changes (in Edit Mode)
  useEffect(() => {
      if (mode === 'editing') {
          setActiveEntities(scenes[currentSceneIndex].entities);
          entitiesRef.current = scenes[currentSceneIndex].entities;
          setCamera({ x: 0, y: 0 }); 
      }
  }, [currentSceneIndex, scenes, mode]);

  // --- Persistence ---

  // 1. Quick Save (Internal/LocalStorage) - Used for auto-saving UI edits
  const handleQuickSave = (silent = false) => {
      try {
          const scenesToSave = [...scenes];
          if (mode === 'editing') {
              scenesToSave[currentSceneIndex].entities = activeEntities;
          }
          const saveData = {
              scenes: scenesToSave,
              settings: settings
          };
          localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
          if (!silent) console.log("Quick save successful");
      } catch (e) {
          console.warn("Quick save failed (Storage might be full)");
      }
  };

  // 2. File Save (Download JSON) - Used for "Save Project"
  const handleSaveProject = () => {
      // Sync current state
      const scenesToSave = [...scenes];
      if (mode === 'editing') {
          scenesToSave[currentSceneIndex].entities = activeEntities;
      }
      
      const projectData = {
          version: '1.0',
          timestamp: Date.now(),
          scenes: scenesToSave,
          settings: settings
      };

      try {
        const jsonStr = JSON.stringify(projectData);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KodaEngine_Project_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
          alert("Failed to create save file. The project might be too large (too many images).");
      }
  };

  // 3. File Load (Upload JSON) - Used for "Load Project"
  const handleLoadProject = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  const content = event.target?.result as string;
                  const parsed = JSON.parse(content);
                  
                  let loadedScenes = [];
                  let loadedSettings = DEFAULT_SETTINGS;

                  // Handle format
                  if (parsed.scenes && Array.isArray(parsed.scenes)) {
                      loadedScenes = parsed.scenes;
                      if (parsed.settings) loadedSettings = parsed.settings;
                  } else if (Array.isArray(parsed)) {
                      loadedScenes = parsed;
                  } else {
                      throw new Error("Invalid project format");
                  }
                  
                  setScenes(loadedScenes);
                  setSettings(loadedSettings);
                  setCurrentSceneIndex(0);
                  setMode('editing');
                  setActiveEntities(loadedScenes[0].entities);
                  alert("Project loaded successfully!");
              } catch (err) {
                  console.error(err);
                  alert("Error loading project. File might be corrupted.");
              }
          };
          reader.readAsText(file);
      };
      input.click();
  };

  // --- EXPORT TO ANDROID/HTML (Standalone Engine) ---
  const handleExport = () => {
    const scenesToExport = [...scenes];
    if (mode === 'editing') {
        scenesToExport[currentSceneIndex].entities = activeEntities;
    }
    const exportData = {
        scenes: scenesToExport,
        settings: settings,
        initialScene: 0
    };

    // We inject a "Runtime" script that mimics the gameEngine.ts logic
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Koda Engine Lite</title>
    <style>
        body { margin: 0; background: #111827; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
        canvas { display: block; width: 100%; height: 100%; }
        #ui { position: absolute; inset: 0; pointer-events: none; }
        .btn { position: absolute; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; touch-action: none; pointer-events: auto; transform: translate(-50%, -50%); transition: background 0.1s; font-size: 24px; font-weight: bold; }
        .btn:active { background: rgba(255,255,255,0.3); }
        .btn-jump { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); }
        .btn-shoot { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
        .btn-use { background: rgba(168, 85, 247, 0.2); border-color: rgba(168, 85, 247, 0.4); }
        #score { position: absolute; top: 10px; left: 10px; color: #facc15; font-family: monospace; font-size: 20px; font-weight: bold; text-shadow: 1px 1px 0 #000; z-index: 10; }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <div id="score">SCORE: 0000</div>
    <div id="ui"></div>
    <script>
        // --- GAME DATA ---
        const GAME_DATA = ${JSON.stringify(exportData)};
        
        // --- CONSTANTS ---
        const GRID_SIZE = 32;
        const GRAVITY = 0.5;
        const TERMINAL_VELOCITY = 12;
        const JUMP_FORCE = -10;
        const MOVE_SPEED = 4;
        const BULLET_SPEED = 8;

        // --- STATE ---
        let currentSceneIndex = 0;
        let entities = [];
        let score = 0;
        let camera = { x: 0, y: 0 };
        let input = { left: false, right: false, jump: false, shoot: false, use: false };
        let lastTime = 0;
        let activeItemIndex = 0;
        
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const ui = document.getElementById('ui');
        
        // --- CONTROLS SETUP ---
        const setupControls = () => {
            ui.innerHTML = '';
            const layout = GAME_DATA.settings.controlLayout || {
                left: { x: 5, y: 80, size: 1 },
                right: { x: 25, y: 80, size: 1 },
                jump: { x: 80, y: 75, size: 1.2 },
                shoot: { x: 65, y: 82, size: 1 },
                use: { x: 50, y: 82, size: 0.9 }
            };

            const createBtn = (id, label, x, y, size, cls) => {
                const btn = document.createElement('div');
                btn.className = 'btn ' + (cls || '');
                btn.style.left = x + '%';
                btn.style.top = y + '%';
                btn.style.width = (64 * size) + 'px';
                btn.style.height = (64 * size) + 'px';
                btn.innerHTML = label; 
                
                const start = (e) => { e.preventDefault(); input[id] = true; };
                const end = (e) => { e.preventDefault(); input[id] = false; };
                
                btn.addEventListener('pointerdown', start);
                btn.addEventListener('pointerup', end);
                btn.addEventListener('pointerleave', end);
                ui.appendChild(btn);
            };

            createBtn('left', '←', layout.left.x, layout.left.y, layout.left.size);
            createBtn('right', '→', layout.right.x, layout.right.y, layout.right.size);
            createBtn('jump', '↑', layout.jump.x, layout.jump.y, layout.jump.size, 'btn-jump');
            createBtn('shoot', '◎', layout.shoot.x, layout.shoot.y, layout.shoot.size, 'btn-shoot');
            createBtn('use', '✋', layout.use.x, layout.use.y, layout.use.size, 'btn-use');
        };

        // --- ENGINE LOGIC ---
        const checkCollision = (r1, r2) => {
            return r1.position.x < r2.position.x + r2.size.x &&
                   r1.position.x + r1.size.x > r2.position.x &&
                   r1.position.y < r2.position.y + r2.size.y &&
                   r1.position.y + r1.size.y > r2.position.y;
        };

        const update = (dt) => {
            const player = entities.find(e => e.type === 'player');
            const walls = entities.filter(e => e.type === 'wall' || e.type === 'platform');
            const bullets = entities.filter(e => e.type === 'bullet');

            // --- AI & NPC ---
            entities.forEach(e => {
                if (e.type === 'enemy' && e.patrolRange && e.originalX !== undefined) {
                    e.position.x = e.originalX + Math.sin(Date.now() / 500) * e.patrolRange;
                }
                if (e.type === 'npc') {
                    e.velocity.y += GRAVITY;
                    e.position.y += e.velocity.y;
                    walls.forEach(w => {
                        if (checkCollision(e, w) && e.velocity.y > 0) {
                            e.position.y = w.position.y - e.size.y;
                            e.velocity.y = 0;
                        }
                    });
                }
            });

            // --- Player ---
            if (player) {
                // Jump
                if (input.jump && player.isGrounded) {
                    player.velocity.y = player.jumpForce || JUMP_FORCE;
                    player.isGrounded = false;
                }
                // Shoot
                if (input.shoot) {
                    input.shoot = false; // Semi-auto
                    const dir = player.direction || 1;
                    entities.push({
                        id: Math.random(), type: 'bullet',
                        position: { x: player.position.x + (dir===1?player.size.x:-10), y: player.position.y + player.size.y/2 },
                        size: { x: 8, y: 4 }, velocity: { x: dir * BULLET_SPEED * 1.5, y: 0 },
                        color: '#facc15', health: 1
                    });
                }
                // Use Item
                if (input.use) {
                    input.use = false;
                    if (player.inventory && player.inventory[activeItemIndex]) {
                         const item = player.inventory[activeItemIndex];
                         // Basic implementation for export
                         if (item.usageType === 'shoot') {
                             entities.push({
                                id: Math.random(), type: 'bullet',
                                position: { x: player.position.x, y: player.position.y },
                                size: { x: 8, y: 4 }, velocity: { x: (player.direction||1) * 12, y: 0 },
                                color: '#d946ef', health: 1
                            });
                         }
                    }
                }

                // Move X
                const speed = player.speed || MOVE_SPEED;
                if (input.left) { player.velocity.x = -speed; player.direction = -1; }
                else if (input.right) { player.velocity.x = speed; player.direction = 1; }
                else { player.velocity.x *= 0.8; }
                
                player.position.x += player.velocity.x;
                [...walls, ...entities.filter(e=>e.type==='npc')].forEach(w => {
                    if (w.id!==player.id && checkCollision(player, w)) {
                        if (player.velocity.x > 0) player.position.x = w.position.x - player.size.x;
                        else if (player.velocity.x < 0) player.position.x = w.position.x + w.size.x;
                        player.velocity.x = 0;
                    }
                });

                // Move Y
                player.velocity.y += GRAVITY;
                if (player.velocity.y > TERMINAL_VELOCITY) player.velocity.y = TERMINAL_VELOCITY;
                player.position.y += player.velocity.y;
                player.isGrounded = false;
                
                [...walls, ...entities.filter(e=>e.type==='npc')].forEach(w => {
                    if (w.id!==player.id && checkCollision(player, w)) {
                        if (player.velocity.y > 0) {
                            player.position.y = w.position.y - player.size.y;
                            player.velocity.y = 0;
                            player.isGrounded = true;
                        } else if (player.velocity.y < 0 && w.type !== 'platform') {
                            player.position.y = w.position.y + w.size.y;
                            player.velocity.y = 0;
                        }
                    }
                });

                // Interactions
                entities.forEach(e => {
                    if (e.type === 'coin' && checkCollision(player, e) && e.health !== 0) {
                        e.health = 0; score += 10;
                    } else if (e.type === 'goal' && checkCollision(player, e)) {
                        loadScene(currentSceneIndex + 1);
                    } else if ((e.type === 'spike' || e.type === 'enemy') && checkCollision(player, e)) {
                        loadScene(currentSceneIndex); // Restart
                    } else if (e.type === 'collectible' && checkCollision(player, e)) {
                        if (!player.inventory) player.inventory = [];
                        player.inventory.push(e);
                        e.health = 0;
                    }
                });
                
                // Death Floor
                if (player.position.y > 2000) loadScene(currentSceneIndex);
            }

            // Bullets
            bullets.forEach(b => {
                b.position.x += b.velocity.x;
                entities.filter(e => e.type === 'enemy').forEach(e => {
                    if (checkCollision(b, e)) { e.health = 0; b.health = 0; score += 50; }
                });
                walls.forEach(w => { if (checkCollision(b, w)) b.health = 0; });
            });

            // Cleanup
            entities = entities.filter(e => e.health === undefined || e.health > 0);
        };

        const render = () => {
            // Resize
            if (canvas.width !== window.innerWidth) canvas.width = window.innerWidth;
            if (canvas.height !== window.innerHeight) canvas.height = window.innerHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Camera follow
            const player = entities.find(e => e.type === 'player');
            if (player) {
                const targetX = player.position.x - canvas.width / 2 + player.size.x/2;
                const targetY = player.position.y - canvas.height / 2;
                camera.x += (targetX - camera.x) * 0.1;
                camera.y += (targetY - camera.y) * 0.1;
            }

            ctx.save();
            ctx.translate(-camera.x, -camera.y);

            // Draw Entities
            entities.forEach(e => {
                ctx.fillStyle = e.color || '#fff';
                if (e.type === 'text') {
                    ctx.font = (e.fontSize||20) + 'px monospace';
                    ctx.fillText(e.text || '', e.position.x, e.position.y);
                } else if (e.image) {
                     const img = new Image();
                     img.src = e.image;
                     ctx.drawImage(img, e.position.x, e.position.y, e.size.x, e.size.y);
                } else {
                    ctx.fillRect(e.position.x, e.position.y, e.size.x, e.size.y);
                    if (e.type === 'player') { 
                        ctx.fillStyle = '#fff';
                        const off = (e.direction||1)===1 ? e.size.x*0.6 : e.size.x*0.1;
                        ctx.fillRect(e.position.x + off, e.position.y + 5, 4, 4);
                    }
                }
            });

            ctx.restore();
            document.getElementById('score').innerText = 'SCORE: ' + score.toString().padStart(4, '0');
        };

        const loop = (t) => {
            update((t - lastTime) / 16);
            render();
            lastTime = t;
            requestAnimationFrame(loop);
        };

        const loadScene = (idx) => {
            if (idx >= GAME_DATA.scenes.length) { alert("YOU WIN!"); idx = 0; }
            currentSceneIndex = idx;
            // Deep copy
            entities = JSON.parse(JSON.stringify(GAME_DATA.scenes[idx].entities));
            
            // Reset state
            input = { left: false, right: false, jump: false, shoot: false, use: false };
            const player = entities.find(e => e.type === 'player');
            if (player) {
                camera.x = player.position.x - window.innerWidth/2;
                camera.y = player.position.y - window.innerHeight/2;
            }
        };

        // --- INIT ---
        setupControls();
        loadScene(0);
        requestAnimationFrame(loop);
        
        window.addEventListener('resize', () => {
             canvas.width = window.innerWidth;
             canvas.height = window.innerHeight;
        });

    </script>
</body>
</html>
    `;
    
    // Create Blob and Download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KodaEngine_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Scene Management ---
  const updateCurrentSceneEntities = (newEntities: Entity[]) => {
      setActiveEntities(newEntities);
      if (mode === 'editing') {
          const newScenes = [...scenes];
          newScenes[currentSceneIndex].entities = newEntities;
          setScenes(newScenes);
      }
  };

  const handleAddScene = () => {
      const newScene: Scene = {
          id: generateId(),
          name: `Level ${scenes.length + 1}`,
          entities: JSON.parse(JSON.stringify(INITIAL_ENTITIES)) 
      };
      setScenes([...scenes, newScene]);
      setCurrentSceneIndex(scenes.length); 
  };

  const handleDeleteScene = () => {
      if (scenes.length <= 1) {
          alert("Cannot delete the only scene.");
          return;
      }
      if (!confirm("Are you sure you want to delete this scene?")) return;

      const newScenes = scenes.filter((_, i) => i !== currentSceneIndex);
      setScenes(newScenes);
      setCurrentSceneIndex(prev => Math.max(0, prev - 1));
  };

  // --- Zoom & Camera Control ---
  const handleRecenter = () => {
      const player = activeEntities.find(e => e.type === 'player');
      if (player) {
          setCamera({
             x: player.position.x - dimensions.width / 2 + player.size.x / 2,
             y: player.position.y - dimensions.height / 2 + player.size.y / 2
          });
      } else {
          setCamera({ x: 0, y: 0 });
      }
      setZoom(1);
  };

  const handleZoomChange = (delta: number) => {
      setZoom(prev => {
          const newZoom = Math.min(Math.max(prev + delta, 0.2), 3);
          return parseFloat(newZoom.toFixed(1));
      });
  };

  // Wheel Zoom support (Desktop)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        if (mode === 'playing') return;
        // e.preventDefault(); // Optional: prevent page scroll
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 3));
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [mode]);

  // --- Game Loop ---
  const loadSceneForPlay = (index: number) => {
      if (index >= scenes.length) {
          alert("CONGRATULATIONS! You have beaten all levels!");
          stopGame();
          return;
      }

      const sceneData = scenes[index].entities;
      const simulationEntities = JSON.parse(JSON.stringify(sceneData));
      
      setCurrentSceneIndex(index);
      setActiveEntities(simulationEntities);
      entitiesRef.current = simulationEntities;
      
      setCamera({ x: 0, y: 0 });
      inputRef.current = { left: false, right: false, jump: false, shoot: false, use: false };
      
      const player = simulationEntities.find((e: Entity) => e.type === 'player');
      if (player) {
           setCamera({ x: Math.max(0, player.position.x - settings.viewportWidth / 2), y: Math.max(0, player.position.y - settings.viewportHeight / 2) });
      }
      setZoom(1);
  };

  const startGame = () => {
      if (!scenes[currentSceneIndex].entities.find(e => e.type === 'player')) {
        alert("Current scene has no player!");
        return;
      }

      sceneSnapshotRef.current = JSON.parse(JSON.stringify(scenes[currentSceneIndex].entities));
      setMode('playing');
      setScore(0);
      loadSceneForPlay(currentSceneIndex);
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
  };

  const stopGame = () => {
      // Ensure we clear the loop
      if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = undefined;
      }
      
      // Restore state
      if (sceneSnapshotRef.current.length > 0) {
          const original = sceneSnapshotRef.current; // Use the snapshot
          updateCurrentSceneEntities(original);
      }
      
      setMode('editing');
      setCamera({ x: 0, y: 0 });
      setZoom(1);
  };

  const animate = useCallback((time: number) => {
    if (mode !== 'playing') return;

    if (lastTimeRef.current !== undefined) {
      const result = updatePhysics(
        entitiesRef.current,
        inputRef.current,
        time,
        dimensions.height
      );

      // --- Item Usage Logic ---
      if (inputRef.current.use) {
          const player = result.entities.find(e => e.type === 'player');
          if (player && player.inventory && player.inventory[activeItemIndex]) {
              const item = player.inventory[activeItemIndex];
              const { newEntities, itemConsumed } = performItemAction(player, item, result.entities);
              
              result.entities = newEntities; // Update physics world
              
              if (itemConsumed) {
                   player.inventory.splice(activeItemIndex, 1);
              }
              // Reset trigger so it doesn't spam every frame (semi-automatic)
              inputRef.current.use = false;
          }
      }

      entitiesRef.current = result.entities;
      setActiveEntities(result.entities); 
      if (result.scoreDelta > 0) setScore(s => s + result.scoreDelta);
      
      const player = result.entities.find(e => e.type === 'player');
      if (player) {
          // Track player inside the Viewport resolution
          const targetX = player.position.x - settings.viewportWidth / 3;
          // Simple Y tracking logic (centered)
          const targetY = player.position.y - settings.viewportHeight / 2;
          
          setCamera(prev => ({
              x: prev.x + (targetX - prev.x) * 0.1, 
              y: prev.y + (targetY - prev.y) * 0.1 
          }));
      }

      if (result.gameOver) {
        // Simple restart logic
        loadSceneForPlay(currentSceneIndex);
        return; 
      }
      if (result.victory) {
          loadSceneForPlay(currentSceneIndex + 1);
          return;
      }
    }

    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [mode, dimensions, currentSceneIndex, scenes, activeItemIndex, settings]);

  useEffect(() => {
    if (mode === 'playing') {
      requestRef.current = requestAnimationFrame(animate);
    } 
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mode, animate]);


  // --- Editor Interaction ---
  const snapToGrid = (val: number) => Math.floor(val / GRID_SIZE) * GRID_SIZE;

  // Helper: Create entity logic
  const createEntityAt = (x: number, y: number, currentEntities: Entity[]) => {
      const snX = snapToGrid(x);
      const snY = snapToGrid(y);

      // Prevent duplicate entity at exact same spot for same type
      const exactMatch = currentEntities.find(e => 
          Math.abs(e.position.x - snX) < 1 && 
          Math.abs(e.position.y - snY) < 1 &&
          e.type === selectedTool.type
      );

      if (exactMatch) return currentEntities;

      // Handle Unique Types (Player)
      let nextEntities = currentEntities;
      if (selectedTool.type === 'player') {
         nextEntities = nextEntities.filter(e => e.type !== 'player');
      }

      const newEntity: Entity = {
        id: generateId(),
        type: selectedTool.type as EntityType,
        position: { x: snX, y: snY },
        size: { x: GRID_SIZE, y: GRID_SIZE },
        velocity: { x: 0, y: 0 },
        color: selectedTool.color,
        direction: 1,
        speed: selectedTool.type === 'player' ? MOVE_SPEED : 0,
        jumpForce: selectedTool.type === 'player' ? JUMP_FORCE : 0,
        originalX: snX,
        patrolRange: selectedTool.type === 'enemy' ? 100 : 0
      };

      if (selectedTool.type === 'platform') newEntity.size = { x: GRID_SIZE * 3, y: GRID_SIZE / 2 };
      if (selectedTool.type === 'goal') newEntity.size = { x: GRID_SIZE, y: GRID_SIZE * 2 };
      
      // Text Specific Defaults
      if (selectedTool.type === 'text') {
          newEntity.text = "New Text";
          newEntity.fontSize = 24;
          newEntity.size = { x: 100, y: 32 }; // Approx box size
      }
      
      // Collectible Defaults
      if (selectedTool.type === 'collectible') {
          newEntity.size = { x: GRID_SIZE, y: GRID_SIZE };
          newEntity.text = "Item"; // Default Item Name
          newEntity.usageType = 'none'; // Default no usage
          newEntity.placeEntityType = 'wall';
      }

      return [...nextEntities, newEntity];
  };

  const checkHandleHit = (worldX: number, worldY: number, entity: Entity): string | null => {
      const handleSize = 8 / zoom;
      const { x, y } = entity.position;
      const { x: w, y: h } = entity.size;
      const hitBox = (hx: number, hy: number) => 
          worldX >= hx && worldX <= hx + handleSize && worldY >= hy && worldY <= hy + handleSize;

      if (hitBox(x - handleSize/2, y - handleSize/2)) return 'nw';
      if (hitBox(x + w/2 - handleSize/2, y - handleSize/2)) return 'n';
      if (hitBox(x + w - handleSize/2, y - handleSize/2)) return 'ne';
      if (hitBox(x + w - handleSize/2, y + h/2 - handleSize/2)) return 'e';
      if (hitBox(x + w - handleSize/2, y + h - handleSize/2)) return 'se';
      if (hitBox(x + w/2 - handleSize/2, y + h - handleSize/2)) return 's';
      if (hitBox(x - handleSize/2, y + h - handleSize/2)) return 'sw';
      if (hitBox(x - handleSize/2, y + h/2 - handleSize/2)) return 'w';

      return null;
  };

  const handlePointerDown = (worldX: number, worldY: number, screenX: number, screenY: number) => {
    if (mode === 'playing' || mode === 'editing_ui') return;
    setIsDragging(true);

    if (selectedTool.type === 'select' || selectedTool.type === 'scale') {
        
        // 1. Check Handle Hit (If Scale Tool and Entity Selected)
        if (selectedTool.type === 'scale' && draggingEntityId) {
            const selected = activeEntities.find(e => e.id === draggingEntityId);
            if (selected) {
                const handle = checkHandleHit(worldX, worldY, selected);
                if (handle) {
                    setResizeHandle(handle);
                    setDragStartData({
                        x: worldX,
                        y: worldY,
                        initialPosX: selected.position.x,
                        initialPosY: selected.position.y,
                        initialSizeX: selected.size.x,
                        initialSizeY: selected.size.y
                    });
                    return;
                }
            }
        }

        // 2. Check Entity Hit
        const clickedEntity = [...activeEntities].reverse().find(e => 
            worldX >= e.position.x && worldX <= e.position.x + e.size.x &&
            worldY >= e.position.y && worldY <= e.position.y + e.size.y
        );

        // Logic for Double Click Inspector
        if (clickedEntity) {
             const now = Date.now();
             if (draggingEntityId === clickedEntity.id && (now - lastClickTimeRef.current < 300)) {
                 setShowInspector(true);
             } 
             lastClickTimeRef.current = now;
        } else {
             setShowInspector(false);
        }

        if (clickedEntity) {
            setDraggingEntityId(clickedEntity.id);
            // Capture Start Data for Move
            setDragStartData({
                x: worldX - clickedEntity.position.x, 
                y: worldY - clickedEntity.position.y,
                initialPosX: clickedEntity.position.x,
                initialPosY: clickedEntity.position.y,
                initialSizeX: clickedEntity.size.x,
                initialSizeY: clickedEntity.size.y
            });
            setIsPanning(false);
        } else {
            setDraggingEntityId(null);
            setIsPanning(true);
            setLastScreenPos({ x: screenX, y: screenY });
        }
        return;
    }

    // Painting / Erasing Start
    setIsPanning(false);
    setShowInspector(false); 

    if (selectedTool.type === 'eraser') {
      updateCurrentSceneEntities(activeEntities.filter(e => {
        return !(worldX >= e.position.x && worldX <= e.position.x + e.size.x &&
                 worldY >= e.position.y && worldY <= e.position.y + e.size.y);
      }));
    } else {
       if (selectedTool.type === 'text') {
           const newEntities = createEntityAt(worldX, worldY, activeEntities);
           if (newEntities.length !== activeEntities.length) {
                updateCurrentSceneEntities(newEntities);
                const created = newEntities[newEntities.length-1];
                setDraggingEntityId(created.id);
                setSelectedTool(TOOLS[0]); 
           }
           return;
       }
       const newEntities = createEntityAt(worldX, worldY, activeEntities);
       updateCurrentSceneEntities(newEntities);
    }
  };

  const handlePointerMove = (worldX: number, worldY: number, screenX: number, screenY: number) => {
    if (mode === 'playing' || mode === 'editing_ui' || !isDragging) return;
    
    // PANNING
    if (isPanning && lastScreenPos) {
        const dx = (screenX - lastScreenPos.x) / zoom;
        const dy = (screenY - lastScreenPos.y) / zoom;
        setCamera(prev => ({ x: prev.x - dx, y: prev.y - dy }));
        setLastScreenPos({ x: screenX, y: screenY });
        return;
    }

    // MANIPULATION
    if (draggingEntityId && dragStartData) {
        
        // RESIZE LOGIC (Handle Based)
        if (selectedTool.type === 'scale' && resizeHandle) {
             const { initialPosX, initialPosY, initialSizeX, initialSizeY, x: startX, y: startY } = dragStartData;
             const dx = worldX - startX;
             const dy = worldY - startY;
             
             let newX = initialPosX;
             let newY = initialPosY;
             let newW = initialSizeX;
             let newH = initialSizeY;

             // Horizontal
             if (resizeHandle.includes('e')) newW = snapToGrid(initialSizeX + dx);
             if (resizeHandle.includes('w')) {
                 const snappedX = snapToGrid(initialPosX + dx);
                 newX = snappedX;
                 newW = (initialPosX + initialSizeX) - snappedX;
             }

             // Vertical
             if (resizeHandle.includes('s')) newH = snapToGrid(initialSizeY + dy);
             if (resizeHandle.includes('n')) {
                 const snappedY = snapToGrid(initialPosY + dy);
                 newY = snappedY;
                 newH = (initialPosY + initialSizeY) - snappedY;
             }

             if (newW < GRID_SIZE) newW = GRID_SIZE;
             if (newH < GRID_SIZE) newH = GRID_SIZE;

             updateCurrentSceneEntities(activeEntities.map(e => {
                 if (e.id === draggingEntityId) {
                     return { ...e, position: { x: newX, y: newY }, size: { x: newW, y: newH } };
                 }
                 return e;
             }));
             return;
        }

        // MOVE LOGIC (Standard)
        if (selectedTool.type === 'select' || (selectedTool.type === 'scale' && !resizeHandle)) {
             const rawX = worldX - dragStartData.x;
             const rawY = worldY - dragStartData.y;
             
             const selected = activeEntities.find(e => e.id === draggingEntityId);
             const isText = selected?.type === 'text';
             const newX = isText ? rawX : snapToGrid(rawX + GRID_SIZE/2); 
             const newY = isText ? rawY : snapToGrid(rawY + GRID_SIZE/2);

             updateCurrentSceneEntities(activeEntities.map(e => {
                 if (e.id === draggingEntityId) {
                     const updates: Partial<Entity> = { position: { x: newX, y: newY } };
                     if (e.type === 'enemy') updates.originalX = newX;
                     return { ...e, ...updates };
                 }
                 return e;
             }));
        }
        return;
    }

    // BRUSH / ERASER LOGIC
    if (selectedTool.type !== 'select' && selectedTool.type !== 'scale' && selectedTool.type !== 'text') {
        if (selectedTool.type === 'eraser') {
            const filtered = activeEntities.filter(e => {
                return !(worldX >= e.position.x && worldX <= e.position.x + e.size.x &&
                        worldY >= e.position.y && worldY <= e.position.y + e.size.y);
            });
            if (filtered.length !== activeEntities.length) updateCurrentSceneEntities(filtered);
        } else {
            const newEntities = createEntityAt(worldX, worldY, activeEntities);
            if (newEntities.length !== activeEntities.length) updateCurrentSceneEntities(newEntities);
        }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setIsPanning(false);
    setDragStartData(null);
    setLastScreenPos(null);
    setResizeHandle(null);
  };

  const handleEntityUpdate = (updates: Partial<Entity>) => {
      if (!draggingEntityId) return;
      updateCurrentSceneEntities(activeEntities.map(e => e.id === draggingEntityId ? { ...e, ...updates } : e));
  };

  const handleSpriteSave = (dataUrl: string) => {
      if (draggingEntityId) {
          handleEntityUpdate({ image: dataUrl });
      }
      setShowSpriteEditor(false);
  };

  const handleInputStart = (key: 'left' | 'right' | 'jump' | 'shoot' | 'use') => {
    inputRef.current[key] = true;
    if (key === 'jump') {
        const player = entitiesRef.current.find(e => e.type === 'player');
        if (player && player.isGrounded) {
            player.velocity.y = player.jumpForce ?? JUMP_FORCE;
            player.isGrounded = false;
        }
    }
    if (key === 'shoot') {
        const player = entitiesRef.current.find(e => e.type === 'player');
        if (player) {
            const bullet: Entity = {
                id: generateId(),
                type: 'bullet',
                position: { 
                    x: player.position.x + (player.direction === 1 ? player.size.x : -10), 
                    y: player.position.y + player.size.y / 2 
                },
                size: { x: 8, y: 4 },
                velocity: { x: player.direction === 1 ? BULLET_SPEED : -BULLET_SPEED, y: 0 },
                color: '#facc15', 
                health: 1
            };
            entitiesRef.current.push(bullet);
        }
    }
  };

  const handleInputEnd = (key: 'left' | 'right' | 'jump' | 'shoot' | 'use') => {
    inputRef.current[key] = false;
  };

  const selectedEntity = activeEntities.find(e => e.id === draggingEntityId);
  const playerEntity = activeEntities.find(e => e.type === 'player');

  return (
    <div className="h-full w-full bg-gray-900 overflow-hidden relative touch-none">
      <GameRenderer
        entities={activeEntities}
        width={dimensions.width}
        height={dimensions.height}
        camera={camera}
        zoom={zoom}
        showGrid={mode === 'editing' || mode === 'editing_ui'} // Show grid even in UI edit mode for reference
        selectedEntityId={draggingEntityId}
        activeTool={selectedTool.type} 
        viewportSize={settings} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      
      {mode === 'editing' && (
        <>
            <EditorUI
              selectedTool={selectedTool}
              onSelectTool={(tool) => {
                  setSelectedTool(tool);
                  if (tool.type !== 'select' && tool.type !== 'scale') setDraggingEntityId(null);
              }}
              onPlay={startGame}
              onClear={() => {
                  if(confirm("Clear current scene?")) updateCurrentSceneEntities(INITIAL_ENTITIES);
              }}
              onSave={handleSaveProject} // Uses File Download
              onLoad={handleLoadProject} // Uses File Upload
              onExport={handleExport}
              onRecenter={handleRecenter}
              // Zoom
              zoom={zoom}
              onZoomChange={handleZoomChange}
              // Scenes
              currentSceneIndex={currentSceneIndex}
              totalScenes={scenes.length}
              onNextScene={() => setCurrentSceneIndex(Math.min(scenes.length - 1, currentSceneIndex + 1))}
              onPrevScene={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))}
              onAddScene={handleAddScene}
              onDeleteScene={handleDeleteScene}
              // Viewport Settings
              viewportSize={settings}
              onUpdateViewport={(w, h) => setSettings({ ...settings, viewportWidth: w, viewportHeight: h })}
              // New: Edit UI
              onEditControls={() => setMode('editing_ui')}
            />
            {selectedEntity && showInspector && (
                <Inspector 
                    entity={selectedEntity} 
                    onUpdate={handleEntityUpdate}
                    onClose={() => setShowInspector(false)}
                    onOpenSpriteEditor={(img) => setShowSpriteEditor(true)}
                />
            )}
            {showSpriteEditor && (
                <SpriteEditor 
                    onSave={handleSpriteSave}
                    onClose={() => setShowSpriteEditor(false)}
                    initialImage={selectedEntity?.image}
                />
            )}
        </>
      )}

      {/* RENDER CONTROLS IF PLAYING OR EDITING UI */}
      {(mode === 'playing' || mode === 'editing_ui') && (
        <GameControls
          onInputStart={handleInputStart}
          onInputEnd={handleInputEnd}
          onStop={() => {
              if (mode === 'editing_ui') {
                  handleQuickSave(true); // Internal Quick Save for UI Config
                  setMode('editing');
              }
              else stopGame();
          }}
          score={score}
          inventory={playerEntity?.inventory}
          activeItemIndex={activeItemIndex}
          onEquip={setActiveItemIndex}
          
          // UI Editing Props
          isEditing={mode === 'editing_ui'}
          layout={settings.controlLayout || DEFAULT_CONTROL_LAYOUT}
          onUpdateLayout={(newLayout) => setSettings({ ...settings, controlLayout: newLayout })}
        />
      )}
    </div>
  );
};

export default App;