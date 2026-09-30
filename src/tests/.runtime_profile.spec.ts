import { it } from 'vitest';
import { SimulationEngine } from '@/simulation/SimulationEngine';

it('profiles simulation boundary', () => {
  const engine: any = new SimulationEngine({worldWidth:6, worldHeight:6, chunkSize:32, tickRate:10, masterSeed:1337, maxActiveChunks:36, seasonLengthTicks:90, timePerTickMinutes:1440});
  engine.activateAllChunks();
  const timings: Record<string, number> = {};
  function wrap(object: any, name: string, label: string) {
    const original = object[name].bind(object);
    object[name] = (...args: unknown[]) => {
      const start = performance.now();
      try { return original(...args); }
      finally { timings[label] = (timings[label] || 0) + performance.now() - start; }
    };
  }
  wrap(engine, 'syncRuntime', 'sync');
  wrap(engine, 'applyRuntimeResponse', 'projection');
  wrap(engine.runtime, 'request', 'request');
  engine.runtime.exports = { ...engine.runtime.exports };
  wrap(engine.runtime.exports, 'request', 'wasm');
  const times: number[] = [];
  for (let i = 0; i < 200; i++) { const start=performance.now();engine.update();times.push(performance.now()-start); }
  times.sort((a,b)=>a-b);
  console.log(JSON.stringify({timings, median:times[100],p95:times[190], population:engine.getStatistics().totalSpecies}));
}, 60000);
