import { describe, expect, it, vi } from 'vitest';
import { FixedStepLoop, type FrameScheduler } from '@/core/FixedStepLoop';

function clock() {
  let time = 0;
  let nextHandle = 0;
  const callbacks = new Map<number, (timestamp: number) => void>();
  const scheduler: FrameScheduler = {
    now: () => time,
    request(callback) {
      const handle = ++nextHandle;
      callbacks.set(handle, callback);
      return handle;
    },
    cancel: handle => { callbacks.delete(handle); },
  };
  return {
    scheduler,
    pending: () => callbacks.size,
    advance(ms: number) {
      time += ms;
      const frame = Array.from(callbacks.values());
      callbacks.clear();
      frame.forEach(callback => callback(time));
    },
  };
}

describe('FixedStepLoop', () => {
  it('advances identical tick sequences across uneven frame timing', () => {
    function replay(frames: number[]) {
      const timer = clock();
      const states: number[] = [];
      let state = 12345;
      const loop = new FixedStepLoop(() => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        states.push(state);
      }, { scheduler: timer.scheduler });
      loop.start();
      frames.forEach(timer.advance);
      return states;
    }
    expect(replay([33, 167, 40, 60, 100])).toEqual(replay([100, 100, 100, 100]));
    expect(replay([33, 167, 40, 60, 100])).toHaveLength(4);
  });

  it('caps delayed frames and discards excess debt without skipping simulation ticks', () => {
    const timer = clock();
    const update = vi.fn();
    const loop = new FixedStepLoop(update, { scheduler: timer.scheduler, maxCatchUpSteps: 3 });
    loop.start();
    timer.advance(60_000);
    expect(update).toHaveBeenCalledTimes(3);
    timer.advance(50);
    expect(update).toHaveBeenCalledTimes(3);
    timer.advance(50);
    expect(update).toHaveBeenCalledTimes(4);
  });

  it('drops paused and hidden time while preserving play intent', () => {
    const timer = clock();
    const update = vi.fn();
    const loop = new FixedStepLoop(update, { scheduler: timer.scheduler });
    loop.start();
    timer.advance(90);
    loop.pause();
    timer.advance(30_000);
    loop.start();
    timer.advance(10);
    expect(update).not.toHaveBeenCalled();
    timer.advance(90);
    expect(update).toHaveBeenCalledTimes(1);
    loop.setSuspended(true);
    expect(loop.isRunning).toBe(true);
    expect(timer.pending()).toBe(0);
    timer.advance(30_000);
    loop.setSuspended(false);
    timer.advance(100);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('stops catch-up immediately when a year-end callback pauses the loop', () => {
    const timer = clock();
    let ticks = 0;
    const loop = new FixedStepLoop(() => {
      ticks += 1;
      if (ticks === 2) loop.pause();
    }, { scheduler: timer.scheduler });
    loop.start();
    timer.advance(500);
    expect(ticks).toBe(2);
    expect(timer.pending()).toBe(0);
    loop.start();
    timer.advance(100);
    expect(ticks).toBe(3);
  });

  it('changes playback pacing and allows one manual tick only while paused', () => {
    const timer = clock();
    const update = vi.fn();
    const loop = new FixedStepLoop(update, { scheduler: timer.scheduler });
    expect(loop.step()).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    loop.start();
    loop.start();
    expect(timer.pending()).toBe(1);
    expect(loop.step()).toBe(false);
    loop.setStepMs(50);
    timer.advance(100);
    expect(update).toHaveBeenCalledTimes(3);
    loop.setStepMs(200);
    timer.advance(100);
    expect(update).toHaveBeenCalledTimes(3);
    timer.advance(100);
    expect(update).toHaveBeenCalledTimes(4);
  });

  it('pauses and reports failed updates without scheduling another frame', () => {
    const timer = clock();
    const error = new Error('Simulation failed');
    const onError = vi.fn();
    const loop = new FixedStepLoop(() => { throw error; }, { scheduler: timer.scheduler, onError });
    loop.start();
    timer.advance(100);
    expect(loop.isRunning).toBe(false);
    expect(timer.pending()).toBe(0);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('rejects invalid pacing instead of creating an infinite loop', () => {
    expect(() => new FixedStepLoop(() => {}, { stepMs: 0 })).toThrow(RangeError);
    expect(() => new FixedStepLoop(() => {}, { maxCatchUpSteps: 0.5 })).toThrow(RangeError);
    const loop = new FixedStepLoop(() => {}, { scheduler: clock().scheduler });
    expect(() => loop.setStepMs(Number.NaN)).toThrow(RangeError);
  });
});
