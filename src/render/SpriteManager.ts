import { Sprite, AnimatedSprite, Texture } from 'pixi.js';
import { SpriteLoader } from './SpriteLoader';

export class SpriteManager {
  private spriteLoader: SpriteLoader;

  constructor() {
    this.spriteLoader = SpriteLoader.getInstance();
  }

  createSprite(key: string, frameIndex: number = 0): Sprite | null {
    const spriteFrame = this.spriteLoader.getSprite(key, frameIndex);
    if (!spriteFrame) {
      console.warn(`Sprite ${key} frame ${frameIndex} not found`);
      return null;
    }
    
    return new Sprite(spriteFrame.texture);
  }

  createAnimatedSprite(key: string, animationName: string): AnimatedSprite | null {
    const frames = this.spriteLoader.getAnimation(key, animationName);
    if (!frames) {
      console.warn(`Animation ${key}:${animationName} not found`);
      return null;
    }

    const textures = frames.map(frame => frame.texture);
    
    const animatedSprite = new AnimatedSprite(textures);
    animatedSprite.animationSpeed = 0.01;
    animatedSprite.loop = true;
    
    return animatedSprite;
  }

  createTileSprite(tilesetKey: string, tileIndex: number): Sprite | null {
    return this.createSprite(tilesetKey, tileIndex);
  }

  createPlantSprite(size: 'large' | 'medium' | 'small', index: number = 0): Sprite | null {
    const sizeMap = {
      large: 'plant_large_trees',
      medium: 'plant_medium_bushes', 
      small: 'plant_small_grass'
    };
    
    return this.createSprite(sizeMap[size], index);
  }

  createPropSprite(propName: string): Sprite | null {
    return this.createSprite(`props_${propName}`);
  }

  createPlayerSprite(): AnimatedSprite | null {
    const walkAnimation = this.createAnimatedSprite('player', 'walk');
    if (walkAnimation) {
      walkAnimation.stop(); // Start with idle
      return walkAnimation;
    }
    
    // Fallback to static sprite
    const staticSprite = this.createSprite('player', 0);
    if (staticSprite) {
      // Convert to AnimatedSprite for consistency
      const animatedSprite = new AnimatedSprite([staticSprite.texture]);
      animatedSprite.loop = false;
      return animatedSprite;
    }
    
    return null;
  }

  createCharacterSprite(characterId: string, frameIndex: number = 0): Sprite | null {
    return this.createSprite(`character_${characterId}`, frameIndex);
  }

  createCharacterAnimatedSprite(characterId: string, animationName: string): AnimatedSprite | null {
    return this.createAnimatedSprite(`character_${characterId}`, animationName);
  }

  getAllCharacterIds(): string[] {
    const characterIds: string[] = [];
    for (let i = 0; i < 40; i++) {
      const id = i.toString().padStart(3, '0');
      characterIds.push(id);
    }
    return characterIds;
  }

  getAllTileTextures(tilesetKey: string): Texture[] {
    const frames = this.spriteLoader.getAllFrames(tilesetKey);
    return frames.map(frame => frame.texture);
  }

  preloadSprites(): Promise<void> {
    return this.spriteLoader.loadAllSprites();
  }

  isReady(): boolean {
    return this.spriteLoader.isLoaded();
  }

  // Get textures for character animation without creating sprite
  getCharacterTextures(characterId: string, animationName: string): Texture[] | null {
    return this.spriteLoader.getTextures(`character_${characterId}`, animationName);
  }


  // Helper methods for common sprite operations
  setAnchorCenter(sprite: Sprite | AnimatedSprite): void {
    sprite.anchor.set(0.5);
  }

  scaleSprite(sprite: Sprite | AnimatedSprite, scale: number): void {
    sprite.scale.set(scale);
  }

  positionSprite(sprite: Sprite | AnimatedSprite, x: number, y: number): void {
    sprite.x = x;
    sprite.y = y;
  }
}