export enum Direction {
  Down = 'down',
  Left = 'left',
  Right = 'right',
  Up = 'up'
}

export interface MovementState {
  isMoving: boolean;
  direction: Direction;
  velocity: { x: number; y: number };
}

export class InputManager {
  private keys: Set<string> = new Set();
  private movementCallbacks: Array<(movement: MovementState) => void> = [];
  private moveSpeed: number = 8; // pixels per frame at 60fps
  private baseFrameRate: number = 60; // Target framerate
  private keyDownHandler: (event: KeyboardEvent) => void;
  private keyUpHandler: (event: KeyboardEvent) => void;
  
  constructor() {
    // Store bound functions for proper cleanup
    this.keyDownHandler = (event) => {
      this.keys.add(event.code);
      this.updateMovement();
    };
    
    this.keyUpHandler = (event) => {
      this.keys.delete(event.code);
      this.updateMovement();
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  private updateMovement(): void {
    const movement: MovementState = {
      isMoving: false,
      direction: Direction.Down,
      velocity: { x: 0, y: 0 }
    };

    // Check for movement keys (both WASD and Arrow keys)
    const isUp = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const isDown = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const isLeft = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const isRight = this.keys.has('KeyD') || this.keys.has('ArrowRight');

    // Use mutually exclusive priority system for both velocity and direction
    const adjustedSpeed = this.getAdjustedMoveSpeed();
    
    // Vertical movement (Up takes priority over Down)
    if (isUp) {
      movement.velocity.y = -adjustedSpeed;
      movement.direction = Direction.Up;
      movement.isMoving = true;
    } else if (isDown) {
      movement.velocity.y = adjustedSpeed;
      movement.direction = Direction.Down;
      movement.isMoving = true;
    }

    // Horizontal movement (Left takes priority over Right)
    if (isLeft) {
      movement.velocity.x = -adjustedSpeed;
      movement.direction = Direction.Left;
      movement.isMoving = true;
    } else if (isRight) {
      movement.velocity.x = adjustedSpeed;
      movement.direction = Direction.Right;
      movement.isMoving = true;
    }

    // Override direction for diagonal movement (vertical priority)
    if (movement.velocity.y !== 0 && movement.velocity.x !== 0) {
      if (isUp) {
        movement.direction = Direction.Up;
      } else if (isDown) {
        movement.direction = Direction.Down;
      }
    }

    // Normalize diagonal movement
    if (movement.velocity.x !== 0 && movement.velocity.y !== 0) {
      const diagonal = Math.sqrt(2) / 2;
      movement.velocity.x *= diagonal;
      movement.velocity.y *= diagonal;
    }

    // Call all registered callbacks
    this.movementCallbacks.forEach(callback => callback(movement));
  }

  onMovement(callback: (movement: MovementState) => void): void {
    this.movementCallbacks.push(callback);
  }

  removeMovementCallback(callback: (movement: MovementState) => void): void {
    const index = this.movementCallbacks.indexOf(callback);
    if (index > -1) {
      this.movementCallbacks.splice(index, 1);
    }
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  getMoveSpeed(): number {
    return this.moveSpeed;
  }

  setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  // Get framerate-adjusted movement speed
  private getAdjustedMoveSpeed(deltaTime?: number): number {
    if (deltaTime) {
      // If deltaTime is provided, scale speed by frame time
      return this.moveSpeed * (deltaTime * this.baseFrameRate);
    }
    // Since we're locked to 60fps, return base speed
    return this.moveSpeed;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.movementCallbacks = [];
    this.keys.clear();
  }
}