export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(width: number = 140, height: number = 140) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  renderSprite(sprite: any): HTMLCanvasElement {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!sprite || !sprite.texture) {
      return this.canvas;
    }

    try {
      // Extract texture data
      const texture = sprite.texture;
      const baseTexture = texture.baseTexture;
      
      if (baseTexture && baseTexture.resource && baseTexture.resource.source) {
        const img = baseTexture.resource.source as HTMLImageElement;
        
        // Calculate sprite dimensions
        const frame = texture.frame;
        const spriteWidth = frame.width;
        const spriteHeight = frame.height;
        
        // Calculate scaling to fit in canvas while maintaining aspect ratio
        const maxSize = Math.max(spriteWidth, spriteHeight);
        const scale = maxSize > 120 ? 120 / maxSize : 1;
        
        const scaledWidth = spriteWidth * scale;
        const scaledHeight = spriteHeight * scale;
        
        // Center the sprite
        const x = (this.canvas.width - scaledWidth) / 2;
        const y = (this.canvas.height - scaledHeight) / 2;
        
        // Draw the sprite
        this.ctx.drawImage(
          img,
          frame.x, frame.y, frame.width, frame.height, // source
          x, y, scaledWidth, scaledHeight // destination
        );
      }
    } catch (error) {
      console.warn('Failed to render sprite:', error);
      // Draw placeholder
      this.ctx.fillStyle = '#666';
      this.ctx.fillRect(50, 50, 40, 40);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Sprite', this.canvas.width / 2, this.canvas.height / 2);
    }

    return this.canvas;
  }

  renderAnimatedSprite(sprite: any): HTMLCanvasElement {
    // For animated sprites, render the current frame
    if (sprite && sprite.currentFrame !== undefined && sprite.textures) {
      const currentTexture = sprite.textures[sprite.currentFrame % sprite.textures.length];
      const staticSprite = { texture: currentTexture };
      return this.renderSprite(staticSprite);
    }
    
    return this.renderSprite(sprite);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}