import { Container } from 'pixi.js';

export interface CameraTarget {
  x: number;
  y: number;
}

export class Camera {
  private container: Container;
  private target: CameraTarget | null = null;
  private viewportWidth: number;
  private viewportHeight: number;
  private worldBounds: { width: number; height: number };
  
  // Camera settings
  private followSpeed: number = 0.15; // How quickly camera follows target (0-1)
  private deadZone: { width: number; height: number } = { width: 64, height: 64 };
  
  constructor(container: Container, viewportWidth: number, viewportHeight: number) {
    this.container = container;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldBounds = { width: viewportWidth, height: viewportHeight };
  }

  setWorldBounds(width: number, height: number): void {
    this.worldBounds = { width, height };
  }

  setTarget(target: CameraTarget): void {
    this.target = target;
  }

  setFollowSpeed(speed: number): void {
    this.followSpeed = Math.max(0, Math.min(1, speed));
  }

  setDeadZone(width: number, height: number): void {
    this.deadZone = { width, height };
  }

  update(): void {
    if (!this.target) return;

    const currentX = -this.container.x;
    const currentY = -this.container.y;
    
    const targetX = this.target.x - this.viewportWidth / 2;
    const targetY = this.target.y - this.viewportHeight / 2;

    // Apply dead zone
    const deltaX = targetX - currentX;
    const deltaY = targetY - currentY;
    
    let newX = currentX;
    let newY = currentY;

    // Horizontal dead zone
    if (Math.abs(deltaX) > this.deadZone.width / 2) {
      const direction = deltaX > 0 ? 1 : -1;
      const moveDistance = Math.abs(deltaX) - this.deadZone.width / 2;
      newX += direction * moveDistance * this.followSpeed;
    }

    // Vertical dead zone
    if (Math.abs(deltaY) > this.deadZone.height / 2) {
      const direction = deltaY > 0 ? 1 : -1;
      const moveDistance = Math.abs(deltaY) - this.deadZone.height / 2;
      newY += direction * moveDistance * this.followSpeed;
    }

    // Constrain camera to world bounds
    newX = this.constrainX(newX);
    newY = this.constrainY(newY);

    // Apply camera position
    this.container.x = -newX;
    this.container.y = -newY;
  }

  private constrainX(x: number): number {
    const minX = 0;
    const maxX = Math.max(0, this.worldBounds.width - this.viewportWidth);
    return Math.max(minX, Math.min(maxX, x));
  }

  private constrainY(y: number): number {
    const minY = 0;
    const maxY = Math.max(0, this.worldBounds.height - this.viewportHeight);
    return Math.max(minY, Math.min(maxY, y));
  }

  // Get camera position in world coordinates
  getPosition(): { x: number; y: number } {
    return {
      x: -this.container.x,
      y: -this.container.y
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX + this.container.x,
      y: worldY + this.container.y
    };
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX - this.container.x,
      y: screenY - this.container.y
    };
  }

  // Center camera on target immediately (no smooth following)
  centerOnTarget(): void {
    if (!this.target) return;

    const targetX = this.target.x - this.viewportWidth / 2;
    const targetY = this.target.y - this.viewportHeight / 2;

    const constrainedX = this.constrainX(targetX);
    const constrainedY = this.constrainY(targetY);

    this.container.x = -constrainedX;
    this.container.y = -constrainedY;
  }

  // Get viewport bounds in world coordinates
  getViewportBounds(): { x: number; y: number; width: number; height: number } {
    const position = this.getPosition();
    return {
      x: position.x,
      y: position.y,
      width: this.viewportWidth,
      height: this.viewportHeight
    };
  }

  // Check if a world position is visible in the viewport
  isVisible(worldX: number, worldY: number, padding: number = 0): boolean {
    const bounds = this.getViewportBounds();
    return worldX >= bounds.x - padding &&
           worldX <= bounds.x + bounds.width + padding &&
           worldY >= bounds.y - padding &&
           worldY <= bounds.y + bounds.height + padding;
  }

  // Zoom functionality (for future use)
  private zoomLevel: number = 1.0;

  setZoom(zoom: number): void {
    this.zoomLevel = Math.max(0.1, Math.min(5.0, zoom));
    this.container.scale.set(this.zoomLevel);
  }

  getZoom(): number {
    return this.zoomLevel;
  }
}