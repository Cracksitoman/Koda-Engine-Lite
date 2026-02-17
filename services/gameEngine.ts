import { Entity, Vector2 } from '../types';
import { GRAVITY, TERMINAL_VELOCITY, GRID_SIZE, BULLET_SPEED, MOVE_SPEED } from '../constants';

// AABB Collision detection
export const checkCollision = (rect1: Entity, rect2: Entity): boolean => {
  return (
    rect1.position.x < rect2.position.x + rect2.size.x &&
    rect1.position.x + rect1.size.x > rect2.position.x &&
    rect1.position.y < rect2.position.y + rect2.size.y &&
    rect1.position.y + rect1.size.y > rect2.position.y
  );
};

// --- NEW: Helper for Item Actions ---
export const performItemAction = (
    player: Entity, 
    item: Entity, 
    entities: Entity[]
): { newEntities: Entity[], itemConsumed: boolean } => {
    
    let newEntities = [...entities];
    let itemConsumed = false;

    // Center of Player
    const px = player.position.x + player.size.x / 2;
    const py = player.position.y + player.size.y / 2;
    const dir = player.direction || 1;

    // Target Grid Position (In front of player)
    const targetX = Math.floor((px + (dir * GRID_SIZE * 1.5)) / GRID_SIZE) * GRID_SIZE;
    const targetY = Math.floor(py / GRID_SIZE) * GRID_SIZE; // Same height as player center
    
    // Slight adjustment to snap y to grid better relative to player feet
    const targetYFeet = Math.floor((player.position.y + player.size.y - 1) / GRID_SIZE) * GRID_SIZE;

    if (item.usageType === 'place' && item.placeEntityType) {
        // Check if space is empty
        const occupied = newEntities.some(e => 
            e.position.x === targetX && e.position.y === targetYFeet && e.type !== 'text'
        );

        if (!occupied) {
            const newEntity: Entity = {
                id: Math.random().toString(36).substr(2, 9),
                type: item.placeEntityType,
                position: { x: targetX, y: targetYFeet },
                size: { x: GRID_SIZE, y: GRID_SIZE }, // Default size
                velocity: { x: 0, y: 0 },
                color: '#fff', // Default color
            };
            
            // Type specifics
            if (item.placeEntityType === 'wall') newEntity.color = '#64748b';
            if (item.placeEntityType === 'spike') newEntity.color = '#dc2626';
            if (item.placeEntityType === 'platform') {
                newEntity.size = { x: GRID_SIZE * 2, y: GRID_SIZE/2 };
                newEntity.color = '#94a3b8';
            }
            if (item.placeEntityType === 'coin') {
                newEntity.size = { x: GRID_SIZE, y: GRID_SIZE };
                newEntity.color = '#eab308';
            }

            newEntities.push(newEntity);
            // Placing blocks usually doesn't consume the "tool" in creative modes, 
            // but for limited items it should. Let's make it infinite for fun building.
            itemConsumed = false; 
        }
    }

    if (item.usageType === 'destroy') {
        // Remove entities at target location
        const countBefore = newEntities.length;
        newEntities = newEntities.filter(e => {
            if (e.id === player.id) return true; // Don't destroy self
            
            // Check overlap with target area
            const isAtTarget = 
                e.position.x < targetX + GRID_SIZE && 
                e.position.x + e.size.x > targetX &&
                e.position.y < targetYFeet + GRID_SIZE &&
                e.position.y + e.size.y > targetYFeet;
            
            return !isAtTarget;
        });
        
        // If we destroyed something, maybe play a sound (not implemented)
    }

    if (item.usageType === 'heal') {
        // Consumable
        itemConsumed = true;
        // Logic handled in App mainly, but technically we don't track HP in this simple engine yet 
        // other than alive/dead. Let's say it effectively does nothing visual unless we add HP bars.
        // For now, let's just consume it.
    }

    if (item.usageType === 'shoot') {
        // Create bullet
        newEntities.push({
            id: Math.random().toString(36).substr(2, 9), 
            type: 'bullet',
            position: { x: player.position.x + (dir===1?player.size.x:-10), y: player.position.y + player.size.y/2 },
            size: {x: 8, y: 4}, 
            velocity: {x: dir===1?12:-12, y:0}, // Faster than normal bullets
            color: '#d946ef', 
            health: 1
        });
    }

    return { newEntities, itemConsumed };
};

export const updatePhysics = (
  entities: Entity[],
  input: { left: boolean; right: boolean; jump: boolean; shoot: boolean },
  time: number, // Added time for AI animation
  canvasHeight: number
): { entities: Entity[]; scoreDelta: number; gameOver: boolean; victory: boolean } => {
  let newEntities = entities.map((e) => ({ ...e })); // Deep copy
  let scoreDelta = 0;
  let gameOver = false;
  let victory = false;

  const player = newEntities.find((e) => e.type === 'player');
  const bullets = newEntities.filter((e) => e.type === 'bullet');
  const walls = newEntities.filter((e) => e.type === 'wall' || e.type === 'platform');

  // --- AI Update (Patrol) ---
  newEntities.forEach(e => {
      if (e.type === 'enemy' && e.patrolRange && e.originalX !== undefined) {
          // Simple Sine Wave movement
          const offset = Math.sin(time / 500) * e.patrolRange;
          e.position.x = e.originalX + offset;
      }
      
      // NPC Physics (Gravity)
      if (e.type === 'npc') {
          e.velocity.y += GRAVITY;
          if (e.velocity.y > TERMINAL_VELOCITY) e.velocity.y = TERMINAL_VELOCITY;
          e.position.y += e.velocity.y;
          
          // NPC Wall Collision (Floor)
          for (const wall of walls) {
              if (checkCollision(e, wall)) {
                  if (e.velocity.y > 0) {
                      e.position.y = wall.position.y - e.size.y;
                      e.velocity.y = 0;
                  }
              }
          }
      }
  });

  // --- Bullet Logic ---
  bullets.forEach((bullet) => {
    bullet.position.x += bullet.velocity.x;
    // Basic "out of bounds" check (arbitrary large number since levels can be infinite now)
    if (bullet.position.x < -1000 || bullet.position.x > 100000) {
        bullet.health = 0;
    }
  });

  // --- Player Logic ---
  if (player) {
    // 1. Gravity
    player.velocity.y += GRAVITY;
    if (player.velocity.y > TERMINAL_VELOCITY) player.velocity.y = TERMINAL_VELOCITY;

    // 2. Movement
    const moveSpeed = player.speed ?? MOVE_SPEED;
    if (input.left) {
      player.velocity.x = -moveSpeed;
      player.direction = -1;
    } else if (input.right) {
      player.velocity.x = moveSpeed;
      player.direction = 1;
    } else {
      player.velocity.x *= 0.8; 
    }

    // 3. Move X
    player.position.x += player.velocity.x;
    if (player.position.x < 0) player.position.x = 0; // Only block left wall

    // Collision X (Walls + NPCs act as walls/solids for player)
    const solidObjects = [...walls, ...newEntities.filter(e => e.type === 'npc')];
    
    for (const solid of solidObjects) {
      if (solid.id === player.id) continue;
      if (checkCollision(player, solid)) {
        if (player.velocity.x > 0) {
          player.position.x = solid.position.x - player.size.x;
        } else if (player.velocity.x < 0) {
          player.position.x = solid.position.x + solid.size.x;
        }
        player.velocity.x = 0;
      }
    }

    // 4. Move Y
    player.position.y += player.velocity.y;
    
    // Death Floor
    if (player.position.y > canvasHeight + 200) { // Allow falling a bit below screen
        gameOver = true;
    }

    player.isGrounded = false;

    // Collision Y
    for (const solid of solidObjects) {
      if (solid.id === player.id) continue;
      if (checkCollision(player, solid)) {
        if (player.velocity.y > 0) {
          player.position.y = solid.position.y - player.size.y;
          player.isGrounded = true;
          player.velocity.y = 0;
        } else if (player.velocity.y < 0 && solid.type !== 'platform') {
          player.position.y = solid.position.y + solid.size.y;
          player.velocity.y = 0;
        }
      }
    }

    // 5. Interactions
    newEntities.forEach((e) => {
      if (e.type === 'coin' && checkCollision(player, e)) {
        e.health = 0;
        scoreDelta += 10;
      }
      else if ((e.type === 'spike' || e.type === 'enemy') && checkCollision(player, e)) {
        gameOver = true;
      }
      else if (e.type === 'goal' && checkCollision(player, e)) {
        victory = true;
      }
      else if (e.type === 'collectible' && checkCollision(player, e)) {
        // Inventory Logic
        if (!player.inventory) player.inventory = [];
        player.inventory.push({ ...e }); // Store copy of item
        e.health = 0; // Remove from world
      }
    });
  }

  // --- Bullet Collisions ---
  bullets.forEach(bullet => {
      const enemies = newEntities.filter(e => e.type === 'enemy');
      for (const enemy of enemies) {
          if (checkCollision(bullet, enemy)) {
              enemy.health = 0;
              bullet.health = 0;
              scoreDelta += 50;
          }
      }
      const walls = newEntities.filter(e => e.type === 'wall');
      for (const wall of walls) {
          if (checkCollision(bullet, wall)) {
              bullet.health = 0;
          }
      }
  });

  newEntities = newEntities.filter((e) => e.health === undefined || e.health > 0);

  return { entities: newEntities, scoreDelta, gameOver, victory };
};