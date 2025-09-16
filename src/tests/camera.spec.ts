import { describe, it, expect } from 'vitest'
import { Container } from 'pixi.js'
import { Camera } from '@/core/Camera'

describe('Camera', () => {
  it('centers on target within world bounds', () => {
    const container = new Container()
    const cam = new Camera(container, 200, 150)
    cam.setWorldBounds(1000, 800)
    cam.setTarget({ x: 300, y: 200 })

    cam.centerOnTarget()

    // Camera moves container opposite to world position
    const pos = cam.getPosition()
    expect(pos.x).toBeCloseTo(300 - 100) // targetX - viewport/2
    expect(pos.y).toBeCloseTo(200 - 75)
  })

  it('respects world bounds when centering', () => {
    const container = new Container()
    const cam = new Camera(container, 300, 300)
    cam.setWorldBounds(500, 400)
    cam.setTarget({ x: 50, y: 50 })

    cam.centerOnTarget()

    const pos = cam.getPosition()
    // Cannot go negative
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(0)

    cam.setTarget({ x: 490, y: 390 })
    cam.centerOnTarget()
    const pos2 = cam.getPosition()
    // Clamp to max (world - viewport)
    expect(pos2.x).toBe(500 - 300)
    expect(pos2.y).toBe(400 - 300)
  })

  it('converts between world and screen coordinates', () => {
    const container = new Container()
    const cam = new Camera(container, 200, 100)
    cam.setWorldBounds(1000, 1000)
    cam.setTarget({ x: 400, y: 300 })
    cam.centerOnTarget() // container.x/y become negative of position

    const world = { x: 420, y: 310 }
    const screen = cam.worldToScreen(world.x, world.y)
    const back = cam.screenToWorld(screen.x, screen.y)
    expect(back.x).toBeCloseTo(world.x)
    expect(back.y).toBeCloseTo(world.y)
  })

  it('visibility check uses viewport and padding', () => {
    const container = new Container()
    const cam = new Camera(container, 100, 100)
    cam.setWorldBounds(1000, 1000)
    cam.setTarget({ x: 50, y: 50 })
    cam.centerOnTarget()

    // Viewport 0..100 in both axes
    expect(cam.isVisible(10, 10)).toBe(true)
    expect(cam.isVisible(110, 10)).toBe(false)
    expect(cam.isVisible(110, 10, 10)).toBe(true)
  })

  it('clamps zoom level and applies to container scale', () => {
    const container = new Container()
    const cam = new Camera(container, 100, 100)
    cam.setZoom(10)
    expect(cam.getZoom()).toBeCloseTo(5.0)
    expect(container.scale.x).toBeCloseTo(5.0)
    expect(container.scale.y).toBeCloseTo(5.0)

    cam.setZoom(0.01)
    expect(cam.getZoom()).toBeCloseTo(0.1)
  })
})
