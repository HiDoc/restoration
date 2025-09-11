import { Application, Text, TextStyle, Container } from 'pixi.js';
import { SpriteManager } from '../render/SpriteManager';
import { InputManager, MovementState } from './InputManager';
import { Player } from './Player';
import { LayerManager } from '../world/LayerManager';
import { TileMap } from '../world/TileMap';
import { MapLoader } from '../world/MapLoader';
import { Camera } from './Camera';

export enum GameState {
  Loading = 'loading',
  Exploration = 'exploration',
  Encounter = 'encounter',
  CodexView = 'codex',
  Ritual = 'ritual',
  Menu = 'menu'
}

export class GameEngine {
  private app: Application;
  private currentState: GameState = GameState.Loading;
  private stateStack: GameState[] = [];
  private spriteManager: SpriteManager;
  private inputManager: InputManager;
  private layerManager: LayerManager;
  private player: Player | null = null;
  private currentMap: TileMap | null = null;
  private camera: Camera | null = null;
  private worldContainer: Container | null = null;
  private isLoaded: boolean = false;
  private customMapPath: string | null = null;

  constructor(app: Application) {
    this.app = app;
    this.spriteManager = new SpriteManager();
    this.inputManager = new InputManager();
    // LayerManager will be initialized when needed
    this.layerManager = new LayerManager(this.app.stage);
  }

  setCustomMap(mapPath: string): void {
    this.customMapPath = mapPath;
  }

  async initialize(): Promise<void> {
    await this.loadAssets();
    this.setupInitialScreen();
    
    // Lock ticker to 60 FPS
    this.app.ticker.maxFPS = 60;
    this.app.ticker.minFPS = 60;
    
    this.app.ticker.add(() => this.update());
  }

  private async loadAssets(): Promise<void> {
    this.showLoadingScreen();
    try {
      console.log('Loading assets...');
      
      // Determine which map to load
      const mapPath = this.customMapPath || '/data/maps/starter-town.json';
      console.log(`Loading map: ${mapPath}`);
      
      // Load sprites and maps in parallel
      const [, mapData] = await Promise.all([
        this.spriteManager.preloadSprites(),
        MapLoader.loadMap(mapPath)
      ]);
      
      console.log('Assets loaded, creating TileMap with data:', mapData);
      // Store the loaded map for later use (LayerManager will be updated during transition)
      this.currentMap = new TileMap(mapData, this.spriteManager, this.layerManager);
      console.log('TileMap created successfully');
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }

  private showLoadingScreen(): void {
    const style = new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: 0xffffff,
      align: 'center'
    });

    const loadingText = new Text('Loading sprites...\nPlease wait', style);
    loadingText.anchor.set(0.5);
    loadingText.x = this.app.screen.width / 2;
    loadingText.y = this.app.screen.height / 2;

    this.app.stage.addChild(loadingText);
  }

  private setupInitialScreen(): void {
    if (!this.isLoaded) return;

    this.app.stage.removeChildren();
    // Reinitialize LayerManager after clearing
    this.layerManager = new LayerManager(this.app.stage);
    
    const style = new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: 0xffffff,
      align: 'center'
    });

    const welcomeText = new Text('Pokémon Vibe Game\n\nPress SPACE to begin exploration', style);
    welcomeText.anchor.set(0.5);
    welcomeText.x = this.app.screen.width / 2;
    welcomeText.y = this.app.screen.height / 2;

    this.app.stage.addChild(welcomeText);

    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && this.isLoaded) {
        console.log('Spacebar pressed - transitioning to exploration');
        this.transitionToState(GameState.Exploration);
      }
    });
  }

  private transitionToState(newState: GameState): void {
    console.log(`Transitioning from ${this.currentState} to ${newState}`);
    this.stateStack.push(this.currentState);
    this.currentState = newState;
    
    if (newState === GameState.Exploration) {
      // Clear stage and set up world container for camera system
      this.app.stage.removeChildren();
      
      // Create world container that will be moved by camera
      this.worldContainer = new Container();
      this.worldContainer.name = 'WorldContainer';
      this.app.stage.addChild(this.worldContainer);
      
      // Initialize LayerManager with world container instead of stage
      this.layerManager = new LayerManager(this.worldContainer);
      
      // Set up camera system
      this.camera = new Camera(this.worldContainer, this.app.screen.width, this.app.screen.height);
      
      // Update TileMap's LayerManager reference
      if (this.currentMap) {
        (this.currentMap as any).layerManager = this.layerManager;
        // Set camera world bounds based on map size
        const mapBounds = this.currentMap.getBounds();
        this.camera.setWorldBounds(mapBounds.width, mapBounds.height);
      }
      
      this.setupExplorationScreen();
    } else {
      // For other states, clear and add simple UI
      this.app.stage.removeChildren();
      // Reinitialize LayerManager after clearing
      this.layerManager = new LayerManager(this.app.stage);
      const style = new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 18,
        fill: 0xffffff
      });

      const stateText = new Text(`Current State: ${newState}`, style);
      stateText.x = 10;
      stateText.y = 10;
      this.app.stage.addChild(stateText);
    }
  }

  private setupExplorationScreen(): void {
    console.log('Setting up exploration screen');
    // Clear all layers
    this.layerManager.clearAllLayers();

    // Load the tile-based map
    if (this.currentMap) {
      console.log('Loading tile map');
      this.currentMap.loadMap();
      
      // Get spawn point from map
      const spawnPoint = this.currentMap.getSpawnPoint();
      
      // Create the main character (Character 000) at spawn point
      this.player = new Player(this.spriteManager);
      const playerSprite = this.player.getSprite();
      if (playerSprite) {
        this.player.setPosition(spawnPoint.x, spawnPoint.y);
        this.spriteManager.scaleSprite(playerSprite, 1.5);
        console.log('Adding player sprite to LayerManager at position:', spawnPoint);
        this.layerManager.addObject(playerSprite as any);
        
        // Set world bounds for player movement
        const mapBounds = this.currentMap.getBounds();
        this.player.setWorldBounds(mapBounds.width, mapBounds.height);
        
        // Set player as camera target and center camera on player
        if (this.camera) {
          this.camera.setTarget(this.player);
          this.camera.centerOnTarget();
        }
      }
    } else {
      // Fallback to center if no map loaded
      this.player = new Player(this.spriteManager);
      const playerSprite = this.player.getSprite();
      if (playerSprite) {
        this.player.setPosition(this.app.screen.width / 2, this.app.screen.height / 2);
        this.spriteManager.scaleSprite(playerSprite, 1.5);
        this.layerManager.addObject(playerSprite as any);
      }
    }

    // Set up input handling with Y-sorting updates
    this.inputManager.onMovement((movement: MovementState) => {
      if (this.player) {
        this.player.updateDirection(movement.direction, movement.isMoving);
        if (movement.isMoving) {
          this.player.move(movement.velocity);
          // Update Y-sorting when player moves
          this.layerManager.updateYSorting();
        }
      }
    });

    // Add UI text (directly to stage so it's fixed on screen)
    const style = new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: 0xffffff,
      padding: 8
    });

    const uiText = new Text('Exploration Mode\nUse WASD or Arrow keys to move!', style);
    uiText.x = 10;
    uiText.y = 10;
    // Add UI directly to stage so it doesn't move with camera
    this.app.stage.addChild(uiText);
  }


  private update(): void {
    if (!this.isLoaded && this.spriteManager.isReady()) {
      this.isLoaded = true;
      this.setupInitialScreen();
    }
    
    // Update camera to follow player
    if (this.camera && this.currentState === GameState.Exploration) {
      this.camera.update();
    }
  }
}