#!/usr/bin/env node
/**
 * Create simple placeholder sprites for testing
 * Uses Canvas API to generate colored rectangles
 */

import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const assetsDir = path.join(__dirname, '..', 'public', 'assets', 'sprites')

// Ensure directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

function createColoredRectangle(width, height, color) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  // Fill with color
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  
  // Add simple border
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, width, height)
  
  return canvas.toBuffer('image/png')
}

function createPlantSprite() {
  // Create a sprite sheet with different plant types
  const canvas = createCanvas(384, 128) // 3 columns x 1 row, each 128x128
  const ctx = canvas.getContext('2d')
  
  // Background
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, 384, 128)
  
  // Large trees (first column) - 4 variants in 2x2 grid
  const treeColors = ['#2d5a2d', '#1f4a1f', '#3d6a3d', '#4d7a4d']
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 64
    const y = Math.floor(i / 2) * 64
    ctx.fillStyle = treeColors[i]
    ctx.fillRect(x, y, 64, 64)
    // Add trunk
    ctx.fillStyle = '#4a3c28'
    ctx.fillRect(x + 24, y + 48, 16, 16)
  }
  
  // Medium bushes (second column)
  const bushColors = ['#4a7c4a', '#3a6c3a', '#5a8c5a', '#2a5c2a']
  for (let i = 0; i < 4; i++) {
    const x = 128 + (i % 2) * 64
    const y = Math.floor(i / 2) * 64
    ctx.fillStyle = bushColors[i]
    ctx.beginPath()
    ctx.arc(x + 32, y + 32, 24, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // Small grass (third column)
  const grassColors = ['#4a7c59', '#3a6c49', '#5a8c69', '#2a5c39']
  for (let i = 0; i < 4; i++) {
    const x = 256 + (i % 2) * 64
    const y = Math.floor(i / 2) * 64
    ctx.fillStyle = grassColors[i]
    // Draw grass blades
    for (let j = 0; j < 8; j++) {
      const gx = x + (j % 4) * 16 + 8
      const gy = y + Math.floor(j / 4) * 32 + 16
      ctx.fillRect(gx - 2, gy, 4, 32)
    }
  }
  
  return canvas.toBuffer('image/png')
}

function createPlayerSprite() {
  // Simple 4-frame walking animation
  const canvas = createCanvas(128, 64) // 4 frames x 1 row, each 32x64
  const ctx = canvas.getContext('2d')
  
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, 128, 64)
  
  for (let i = 0; i < 4; i++) {
    const x = i * 32
    
    // Body
    ctx.fillStyle = '#4a90e2'
    ctx.fillRect(x + 8, y + 20, 16, 32)
    
    // Head
    ctx.fillStyle = '#fdbcb4'
    ctx.beginPath()
    ctx.arc(x + 16, y + 12, 8, 0, Math.PI * 2)
    ctx.fill()
    
    // Legs (different positions for animation)
    ctx.fillStyle = '#2c5aa0'
    const legOffset = i % 2 === 0 ? 0 : 2
    ctx.fillRect(x + 10, y + 52 - legOffset, 4, 12)
    ctx.fillRect(x + 18, y + 52 + legOffset, 4, 12)
  }
  
  return canvas.toBuffer('image/png')
}

console.log('Creating placeholder sprites...')

try {
  // Create plant sprite sheet
  const plantSprite = createPlantSprite()
  fs.writeFileSync(path.join(assetsDir, 'plant.png'), plantSprite)
  console.log('✅ Created plant.png')
  
  // Create player sprite sheet
  const playerSprite = createPlayerSprite()
  fs.writeFileSync(path.join(assetsDir, 'player.png'), playerSprite)
  console.log('✅ Created player.png')
  
  console.log('🎉 Placeholder sprites created successfully!')
  
} catch (error) {
  console.error('❌ Error creating sprites:', error.message)
  process.exit(1)
}