import { describe, it, expect } from 'vitest'
import { SeededRNG, RNGManager } from '@/simulation/SeededRNG'

describe('SeededRNG', () => {
  it('produces deterministic sequences for same seed', () => {
    const a = new SeededRNG(123)
    const b = new SeededRNG(123)
    const seqA = Array.from({ length: 5 }, () => a.next())
    const seqB = Array.from({ length: 5 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('creates deterministic sub-RNGs with domain separation via RNGManager', () => {
    const mgr1 = RNGManager.initialize(42)
    const rngA1 = mgr1.getRNG('weather')
    const rngB1 = mgr1.getRNG('world-gen')
    const out1 = [rngA1.next(), rngB1.next(), rngA1.next(), rngB1.next()]

    const mgr2 = RNGManager.initialize(42)
    const rngA2 = mgr2.getRNG('weather')
    const rngB2 = mgr2.getRNG('world-gen')
    const out2 = [rngA2.next(), rngB2.next(), rngA2.next(), rngB2.next()]

    expect(out1).toEqual(out2)
  })

  it('exports and imports RNGManager state with matching hash', () => {
    const mgr = RNGManager.initialize(99)
    mgr.getRNG('species').next();
    mgr.getRNG('weather').next();
    const state = mgr.exportState()

    const mgrReloaded = RNGManager.initialize(0)
    mgrReloaded.importState(state)
    expect(mgrReloaded.generateStateHash()).toBe(state.stateHash)
  })
})

