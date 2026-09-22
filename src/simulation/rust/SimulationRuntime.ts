import wasmUrl from '../wasm/generated/ecosim_core.wasm?url';

let compiledModule: WebAssembly.Module | undefined;
let initialization: Promise<void> | undefined;

/** Load once before constructing engines. Every engine receives its own Wasm instance. */
export function initializeSimulationRuntime(source?: BufferSource | WebAssembly.Module): Promise<void> {
  if (compiledModule) return Promise.resolve();
  if (!initialization) {
    initialization = (async () => {
      if (source instanceof WebAssembly.Module) {
        compiledModule = source;
      } else {
        let bytes = source;
        if (!bytes) {
          const response = await fetch(wasmUrl);
          if (!response.ok) throw new Error(`Could not load the simulation runtime (${response.status})`);
          bytes = await response.arrayBuffer();
        }
        compiledModule = await WebAssembly.compile(bytes);
      }
    })().catch(error => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

export function encodeSimulationState(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item instanceof Map ? { __ecosimMap: Array.from(item.entries()) } : item);
}

export function decodeSimulationState<T = any>(value: string): T {
  // A JSON reviver invokes JavaScript for every numeric/string trait field. Dense
  // worlds repeat thousands of these records; native parsing plus object-only
  // restoration avoids that callback cost without changing the save format.
  const restoreMaps = (item: any): any => {
    if (!item || typeof item !== 'object') return item;
    if (Array.isArray(item.__ecosimMap)) {
      return new Map(item.__ecosimMap.map(([key, entry]: [unknown, unknown]) => [key, restoreMaps(entry)]));
    }
    if (item.traits && Array.isArray(item.traits.__ecosimMap) && typeof item.generation === 'number' && Array.isArray(item.mutations)) {
      // GeneticTrait records contain scalar metadata, never nested Maps.
      item.traits = new Map(item.traits.__ecosimMap);
      return item;
    }
    for (const key of Object.keys(item)) {
      if (item[key] && typeof item[key] === 'object') item[key] = restoreMaps(item[key]);
    }
    return item;
  };
  return restoreMaps(JSON.parse(value)) as T;
}

export interface RuntimeSnapshot {
  tick: number;
  simTimeDays: number;
  chunks: any[];
  weatherEvents?: any[];
  hybridizationEvents?: number;
}

export interface RuntimeResponse {
  ok: boolean;
  error?: string;
  snapshot?: RuntimeSnapshot;
  events?: Array<{ tick: number; type: string; chunkId?: string; data: unknown }>;
  state?: unknown;
}

interface RuntimeExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  alloc(length: number): number;
  dealloc(pointer: number, length: number): void;
  request(pointer: number, length: number): number;
  response_len(): number;
}

/** Thin transport only: ecological state and evolution are owned by Rust. */
export class RustSimulationRuntime {
  private readonly exports: RuntimeExports;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  constructor() {
    if (!compiledModule) {
      throw new Error('Simulation runtime is not initialized. Await initializeSimulationRuntime() before creating an engine.');
    }
    this.exports = new WebAssembly.Instance(compiledModule, {}).exports as RuntimeExports;
  }

  request(message: Record<string, unknown>): RuntimeResponse {
    const bytes = this.encoder.encode(encodeSimulationState(message));
    const pointer = this.exports.alloc(bytes.length);
    try {
      new Uint8Array(this.exports.memory.buffer, pointer, bytes.length).set(bytes);
      const resultPointer = this.exports.request(pointer, bytes.length);
      // request may grow memory, so read from its current buffer.
      const resultBytes = new Uint8Array(this.exports.memory.buffer, resultPointer, this.exports.response_len());
      const result = decodeSimulationState<RuntimeResponse>(this.decoder.decode(resultBytes));
      if (!result.ok) throw new Error(result.error || 'Rust simulation request failed');
      return result;
    } finally {
      this.exports.dealloc(pointer, bytes.length);
    }
  }
}
