import { AnimatedSprite } from 'pixi.js';
import { SpriteManager } from '../render/SpriteManager';
import { Direction } from './InputManager';
import { LayerType } from '../world/Layers';
import { CameraTarget } from './Camera';

export class Player implements CameraTarget {
  private sprite: AnimatedSprite | null = null;
  private spriteManager: SpriteManager;
  private currentDirection: Direction = Direction.Down;
  private isMoving: boolean = false;
  private currentAnimation: string = 'idle_down';
  private worldBounds: { width: number; height: number } | null = null;

  constructor(spriteManager: SpriteManager) {
    this.spriteManager = spriteManager;
    this.createPlayerSprite();
  }

  private createPlayerSprite(): void {
    this.sprite = this.spriteManager.createCharacterAnimatedSprite('000', 'idle_down');
    if (this.sprite) {
      this.sprite.anchor.set(0.5, 1); // Bottom-center anchor for character
      this.sprite.animationSpeed = 0.15;
      this.sprite.loop = true;
      this.sprite.gotoAndStop(0); // Start with idle at frame 0

      // Make sprite layered
      (this.sprite as any).layer = LayerType.Characters;
      (this.sprite as any).subLayer = 0;

    }
  }

  getSprite(): AnimatedSprite | null {
    return this.sprite;
  }

  setPosition(x: number, y: number): void {
    if (this.sprite) {
      this.sprite.x = x;
      this.sprite.y = y;
    }
  }

  getPosition(): { x: number; y: number } {
    if (this.sprite) {
      return { x: this.sprite.x, y: this.sprite.y };
    }
    return { x: 0, y: 0 };
  }

  // CameraTarget implementation - expose x and y as getters
  get x(): number {
    return this.sprite?.x ?? 0;
  }

  get y(): number {
    return this.sprite?.y ?? 0;
  }

  setWorldBounds(width: number, height: number): void {
    this.worldBounds = { width, height };
  }

  move(velocity: { x: number; y: number }): void {
    if (this.sprite) {
      const newX = this.sprite.x + velocity.x;
      const newY = this.sprite.y + velocity.y;

      let finalX = newX;
      let finalY = newY;

      // Apply world bounds if set
      if (this.worldBounds) {
        // Calculate dynamic padding based on sprite dimensions and anchor
        const spriteWidth = this.sprite.width;
        const spriteHeight = this.sprite.height;
        const anchorX = this.sprite.anchor.x;
        const anchorY = this.sprite.anchor.y;
        
        // Calculate the actual footprint bounds considering anchor
        const leftOffset = spriteWidth * anchorX;
        const rightOffset = spriteWidth * (1 - anchorX);
        const topOffset = spriteHeight * anchorY;
        const bottomOffset = spriteHeight * (1 - anchorY);
        
        finalX = Math.max(leftOffset, Math.min(this.worldBounds.width - rightOffset, newX));
        finalY = Math.max(topOffset, Math.min(this.worldBounds.height - bottomOffset, newY));
      } else {
        // Provide safe defaults when worldBounds is not set
        const safeMargin = 32;
        finalX = Math.max(safeMargin, Math.min(1024 - safeMargin, newX));
        finalY = Math.max(safeMargin, Math.min(768 - safeMargin, newY));
      }

      // Snap to pixel grid to prevent subpixel jitter
      this.sprite.x = Math.round(finalX);
      this.sprite.y = Math.round(finalY);
    }
  }

  updateDirection(direction: Direction, isMoving: boolean): void {
    // Update direction immediately when moving
    if (isMoving) {
      this.currentDirection = direction;
    }

    this.isMoving = isMoving;

    // Get the animation name we should be using
    const animationName = this.getAnimationName();
    
    // Only switch animation if it's actually different
    if (animationName !== this.currentAnimation) {
      this.switchAnimation(animationName);
    }
    
    // Handle immediate play/stop for same animations
    if (this.sprite && animationName === this.currentAnimation) {
      if (this.isMoving && !this.sprite.playing) {
        this.sprite.play();
      } else if (!this.isMoving) {
        // Always snap idle to frame 0, regardless of sprite.playing state
        this.sprite.gotoAndStop(0);
      }
    }
  }

  private getAnimationName(): string {
    const prefix = this.isMoving ? 'walk' : 'idle';
    return `${prefix}_${this.currentDirection}`;
  }

  private switchAnimation(animationName: string): void {
    if (!this.sprite) return;

    // Get the textures for the new animation
    const textures = this.spriteManager.getCharacterTextures('000', animationName);
    if (!textures || textures.length === 0) return;


    try {
      // Store current position to prevent displacement
      const currentX = this.sprite.x;
      const currentY = this.sprite.y;
      
      // Safely update textures and reset frame index
      const shouldPlay = this.isMoving;
      
      // Stop animation before changing textures to prevent frame index issues
      this.sprite.stop();
      
      // Update textures on existing sprite
      this.sprite.textures = textures;
      
      // Derive animation speed from movement magnitude for sync
      if (this.isMoving) {
        console.log(this.sprite.x, this.sprite.y);
        // Calculate animation speed based on movement speed
        // Assumes walking animations have 3-4 frames and should cycle per ~32 pixels traveled
        const basePixelsPerCycle = 32; // Distance for one complete walk cycle
        const framesInAnimation = textures.length;
        const currentMoveSpeed = 8; // Current movement speed from InputManager
        
        // Calculate how fast animation should play to stay in sync
        this.sprite.animationSpeed = (currentMoveSpeed / framesInAnimation) / basePixelsPerCycle;
      } else {
        this.sprite.animationSpeed = 0.15; // Default for idle
      }
      
      this.sprite.loop = true;
      
      // Reset to safe frame index (always start from 0)
      this.sprite.currentFrame = 0;
      
      // Restore position in case texture update affected it
      this.sprite.x = currentX;
      this.sprite.y = currentY;

      // Set appropriate animation state
      if (shouldPlay) {
        // For walking animations, start playing from frame 0
        this.sprite.play();
      } else {
        // Ensure idle shows frame 0
        this.sprite.gotoAndStop(0);
      }

      this.currentAnimation = animationName;
    } catch (error) {
      console.error('Error switching animation:', error);
    }
  }

  getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  getIsMoving(): boolean {
    return this.isMoving;
  }
}
