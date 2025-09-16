import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameState } from '@/game/GameState'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
})

describe('GameState', () => {
  let gameState: GameState

  beforeEach(() => {
    vi.clearAllMocks()
    gameState = new GameState()
  })

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(gameState.getCurrentScene()).toBe('exploration')
      expect(gameState.getPlayerPosition()).toEqual({ x: 0, y: 0 })
      expect(gameState.getCodexEntries()).toEqual([])
      expect(gameState.getInventory()).toEqual([])
    })

    it('should load from localStorage if available', () => {
      const savedData = {
        currentScene: 'encounter',
        playerPosition: { x: 100, y: 200 },
        codexEntries: [{ id: 'oak', discovered: true }],
        inventory: [{ id: 'potion', quantity: 3 }],
        gameProgress: { sealsUnlocked: 2 },
        settings: { soundEnabled: false }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData))

      const loadedGameState = new GameState()

      expect(loadedGameState.getCurrentScene()).toBe('encounter')
      expect(loadedGameState.getPlayerPosition()).toEqual({ x: 100, y: 200 })
      expect(loadedGameState.getCodexEntries()).toEqual([{ id: 'oak', discovered: true }])
      expect(loadedGameState.getInventory()).toEqual([{ id: 'potion', quantity: 3 }])
    })

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      expect(() => {
        new GameState()
      }).not.toThrow()

      const gameState = new GameState()
      expect(gameState.getCurrentScene()).toBe('exploration')
    })
  })

  describe('Scene Management', () => {
    it('should set current scene', () => {
      gameState.setCurrentScene('encounter')
      expect(gameState.getCurrentScene()).toBe('encounter')
    })

    it('should validate scene types', () => {
      const validScenes = ['exploration', 'encounter', 'codex', 'ritual', 'menu']

      validScenes.forEach(scene => {
        gameState.setCurrentScene(scene as any)
        expect(gameState.getCurrentScene()).toBe(scene)
      })
    })

    it('should track scene history', () => {
      gameState.setCurrentScene('encounter')
      gameState.setCurrentScene('codex')
      gameState.setCurrentScene('ritual')

      const history = gameState.getSceneHistory()
      expect(history).toEqual(['exploration', 'encounter', 'codex'])
    })

    it('should return to previous scene', () => {
      gameState.setCurrentScene('encounter')
      gameState.setCurrentScene('codex')

      gameState.returnToPreviousScene()
      expect(gameState.getCurrentScene()).toBe('encounter')

      gameState.returnToPreviousScene()
      expect(gameState.getCurrentScene()).toBe('exploration')
    })

    it('should not go beyond initial scene', () => {
      gameState.returnToPreviousScene()
      expect(gameState.getCurrentScene()).toBe('exploration')
    })
  })

  describe('Player Position', () => {
    it('should update player position', () => {
      gameState.setPlayerPosition(150, 250)
      expect(gameState.getPlayerPosition()).toEqual({ x: 150, y: 250 })
    })

    it('should track position history for quick travel', () => {
      gameState.setPlayerPosition(100, 100)
      gameState.setPlayerPosition(200, 200)
      gameState.setPlayerPosition(300, 300)

      const history = gameState.getPositionHistory()
      expect(history).toHaveLength(4) // Including initial position
      expect(history[history.length - 1]).toEqual({ x: 300, y: 300 })
    })

    it('should limit position history size', () => {
      // Add more than the limit (assume limit is 10)
      for (let i = 0; i < 15; i++) {
        gameState.setPlayerPosition(i * 10, i * 10)
      }

      const history = gameState.getPositionHistory()
      expect(history.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Event System', () => {
    it('should emit events on state changes', () => {
      const mockCallback = vi.fn()
      gameState.on('sceneChanged', mockCallback)

      gameState.setCurrentScene('encounter')

      expect(mockCallback).toHaveBeenCalledWith({
        from: 'exploration',
        to: 'encounter'
      })
    })

    it('should emit events on codex updates', () => {
      const mockCallback = vi.fn()
      gameState.on('codexEntryAdded', mockCallback)

      const entry = { id: 'oak', name: 'Oak', discovered: true, category: 'trees' }
      gameState.addCodexEntry(entry)

      expect(mockCallback).toHaveBeenCalledWith(entry)
    })

    it('should allow removing event listeners', () => {
      const mockCallback = vi.fn()
      gameState.on('sceneChanged', mockCallback)
      gameState.off('sceneChanged', mockCallback)

      gameState.setCurrentScene('encounter')

      expect(mockCallback).not.toHaveBeenCalled()
    })
  })
})