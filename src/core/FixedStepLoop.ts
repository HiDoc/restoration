export interface FrameScheduler {
  now(): number;
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
}

export interface FixedStepLoopOptions {
  stepMs?: number;
  maxCatchUpSteps?: number;
  scheduler?: FrameScheduler;
  onError?: (error: unknown) => void;
}

/**
 * Wall-clock pacing only: each update advances exactly one simulation tick.
 * Excess frame debt is discarded, never converted into a larger simulation delta.
 */
export class FixedStepLoop {
  private readonly scheduler: FrameScheduler;
  private readonly maxCatchUpSteps: number;
  private readonly onError?: (error: unknown) => void;
  private interval: number;
  private handle: number | null = null;
  private elapsed = 0;
  private lastTimestamp = 0;
  private running = false;
  private suspended = false;

  constructor(private readonly update: () => void, options: FixedStepLoopOptions = {}) {
    this.interval = this.validateStep(options.stepMs ?? 100);
    this.maxCatchUpSteps = options.maxCatchUpSteps ?? 5;
    if (!Number.isInteger(this.maxCatchUpSteps) || this.maxCatchUpSteps < 1) {
      throw new RangeError('maxCatchUpSteps must be a positive integer');
    }
    this.scheduler = options.scheduler ?? {
      now: () => performance.now(),
      request: callback => requestAnimationFrame(callback),
      cancel: handle => cancelAnimationFrame(handle),
    };
    this.onError = options.onError;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.resetClock();
    this.schedule();
  }

  pause(): void {
    this.running = false;
    this.cancelFrame();
    this.resetClock();
  }

  /** Hidden tabs preserve the player's play/pause choice without accumulating debt. */
  setSuspended(suspended: boolean): void {
    if (this.suspended === suspended) return;
    this.suspended = suspended;
    this.cancelFrame();
    this.resetClock();
    this.schedule();
  }

  setStepMs(stepMs: number): void {
    this.interval = this.validateStep(stepMs);
    this.resetClock();
  }

  /** Manual advancement is only permitted while paused. */
  step(): boolean {
    if (this.running) return false;
    this.resetClock();
    return this.runUpdate();
  }

  private validateStep(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('stepMs must be a finite positive number');
    }
    return value;
  }

  private resetClock(): void {
    this.elapsed = 0;
    this.lastTimestamp = this.scheduler.now();
  }

  private cancelFrame(): void {
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  private schedule(): void {
    if (this.running && !this.suspended && this.handle === null) {
      this.handle = this.scheduler.request(this.frame);
    }
  }

  private runUpdate(): boolean {
    try {
      this.update();
      return true;
    } catch (error) {
      this.pause();
      if (!this.onError) throw error;
      this.onError(error);
      return false;
    }
  }

  private readonly frame = (timestamp: number): void => {
    this.handle = null;
    if (!this.running || this.suspended) return;
    const delta = Math.max(0, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    this.elapsed += Math.min(delta, this.interval * this.maxCatchUpSteps);

    let steps = 0;
    while (this.running && !this.suspended && this.elapsed >= this.interval && steps < this.maxCatchUpSteps) {
      this.elapsed -= this.interval;
      steps += 1;
      if (!this.runUpdate()) return;
    }
    this.schedule();
  };
}
