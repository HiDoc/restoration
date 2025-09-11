import { Assets, Texture, Rectangle } from 'pixi.js';
import spriteConfig from '../data/sprites.json';

export interface SpriteFrame {
  texture: Texture;
  frame: Rectangle;
}

export interface AnimationFrames {
  [key: string]: SpriteFrame[];
}

export class SpriteLoader {
  private static instance: SpriteLoader;
  private loadedTextures: Map<string, Texture> = new Map();
  private spriteFrames: Map<string, SpriteFrame[]> = new Map();
  private animations: Map<string, AnimationFrames> = new Map();

  static getInstance(): SpriteLoader {
    if (!SpriteLoader.instance) {
      SpriteLoader.instance = new SpriteLoader();
    }
    return SpriteLoader.instance;
  }

  async loadAllSprites(): Promise<void> {
    const loadPromises: Promise<void>[] = [];
    
    Object.entries(spriteConfig).forEach(([key, config]: [string, any]) => {
      if (key === 'characters' && config.type === 'character_collection') {
        // Load each character separately
        config.characters.forEach((character: any) => {
          loadPromises.push(this.loadCharacterSprite(character.id, character.path, config));
        });
      } else {
        loadPromises.push(this.loadSprite(key, config));
      }
    });
    
    await Promise.all(loadPromises);
  }

  private async loadSprite(key: string, config: any): Promise<void> {
    try {
      const texture = await Assets.load(config.path);
      this.loadedTextures.set(key, texture);

      if (config.sections) {
        // Multi-section sprite sheet (like plant.png)
        this.processSectionedSprite(key, texture, config.sections);
      } else if (config.type === 'collection') {
        // Collection of individual items (like props.png)
        this.processCollectionSprite(key, texture, config.items);
      } else {
        // Regular sprite sheet
        this.processRegularSprite(key, texture, config);
      }
    } catch (error) {
      console.error(`Failed to load sprite ${key}:`, error);
    }
  }

  private async loadCharacterSprite(characterId: string, path: string, config: any): Promise<void> {
    try {
      const texture = await Assets.load(path);
      this.loadedTextures.set(`character_${characterId}`, texture);

      // Extract frames for this character
      const frames = this.extractFrames(texture, config);
      this.spriteFrames.set(`character_${characterId}`, frames);

      // Process animations for this character
      const animationFrames: AnimationFrames = {};
      Object.entries(config.animations).forEach(([animName, frameIndices]: [string, any]) => {
        animationFrames[animName] = frameIndices.map((index: number) => frames[index]);
      });
      this.animations.set(`character_${characterId}`, animationFrames);
    } catch (error) {
      console.error(`Failed to load character ${characterId}:`, error);
    }
  }

  private processSectionedSprite(key: string, texture: Texture, sections: any): void {
    const frames: SpriteFrame[] = [];
    
    Object.entries(sections).forEach(([sectionName, section]: [string, any]) => {
      const sectionFrames = this.extractFrames(texture, section);
      frames.push(...sectionFrames);
      
      // Store section frames separately
      this.spriteFrames.set(`${key}_${sectionName}`, sectionFrames);
    });
    
    this.spriteFrames.set(key, frames);
  }

  private processCollectionSprite(key: string, texture: Texture, items: any): void {
    const frames: SpriteFrame[] = [];
    
    Object.entries(items).forEach(([itemName, item]: [string, any]) => {
      const frame = new Rectangle(item.x, item.y, item.width, item.height);
      const frameTexture = new Texture({ source: texture.source, frame });
      frames.push({ texture: frameTexture, frame });
      
      // Store individual items
      this.spriteFrames.set(`${key}_${itemName}`, [{ texture: frameTexture, frame }]);
    });
    
    this.spriteFrames.set(key, frames);
  }

  private processRegularSprite(key: string, texture: Texture, config: any): void {
    const frames = this.extractFrames(texture, config);
    this.spriteFrames.set(key, frames);

    // Process animations if they exist
    if (config.animations) {
      const animationFrames: AnimationFrames = {};
      Object.entries(config.animations).forEach(([animName, frameIndices]: [string, any]) => {
        animationFrames[animName] = frameIndices.map((index: number) => frames[index]);
      });
      this.animations.set(key, animationFrames);
    }
  }

  private extractFrames(texture: Texture, config: any): SpriteFrame[] {
    const frames: SpriteFrame[] = [];
    const { frameWidth, frameHeight, frames: frameCount, layout, columns, rows, startX = 0, startY = 0 } = config;

    if (layout === 'horizontal') {
      for (let i = 0; i < frameCount; i++) {
        const x = startX + (i * frameWidth);
        const y = startY;
        const frame = new Rectangle(x, y, frameWidth, frameHeight);
        const frameTexture = new Texture({ source: texture.source, frame });
        frames.push({ texture: frameTexture, frame });
      }
    } else if (layout === 'grid') {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const x = startX + (col * frameWidth);
          const y = startY + (row * frameHeight);
          const frame = new Rectangle(x, y, frameWidth, frameHeight);
          const frameTexture = new Texture({ source: texture.source, frame });
          frames.push({ texture: frameTexture, frame });
        }
      }
    }

    return frames;
  }

  getSprite(key: string, frameIndex: number = 0): SpriteFrame | null {
    const frames = this.spriteFrames.get(key);
    return frames ? frames[frameIndex] || null : null;
  }

  getAnimation(key: string, animationName: string): SpriteFrame[] | null {
    const animations = this.animations.get(key);
    return animations ? animations[animationName] || null : null;
  }

  getTextures(key: string, animationName: string): Texture[] | null {
    const frames = this.getAnimation(key, animationName);
    return frames ? frames.map(frame => frame.texture) : null;
  }

  getAllFrames(key: string): SpriteFrame[] {
    return this.spriteFrames.get(key) || [];
  }

  isLoaded(): boolean {
    return this.loadedTextures.size > 0;
  }
}
