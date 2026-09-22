export interface BiomeState {
  vitality?: number;
  moisture?: number;
  pollution?: number;
  canopy?: number;
  succession?: number;
  diversity?: number;
}

export interface SnapshotChunk {
  id: string;
  x: number;
  y: number;
  biomeState: BiomeState;
  pollinatorDensity?: number;
  birds?: Record<string, number>;
  birdsActivity?: number;
  speciesLabel?: string;
  seedBankCount?: number;
  seedBank?: Array<unknown>;
  climateState?: Record<string, number>;
  species?: Map<string, any> | Array<any> | { size: number };
}

export type ChunkGridEntry = SnapshotChunk & Record<string, unknown>;

export interface ChunkColumn {
  x: number;
  chunks: ChunkGridEntry[];
}

export function buildChunkColumns(chunkGrid: ChunkGridEntry[]): ChunkColumn[] {
  const byColumn = new Map<number, ChunkGridEntry[]>();
  for (const chunk of chunkGrid) {
    const column = byColumn.get(chunk.x);
    if (column) {
      column.push(chunk);
    } else {
      byColumn.set(chunk.x, [chunk]);
    }
  }

  return Array.from(byColumn.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([x, columnChunks]) => ({
      x,
      chunks: columnChunks.sort((left, right) => left.y - right.y),
    }));
}

export interface ProfileChunkColumnsOptions {
  chunks: ChunkGridEntry[];
  iterations?: number;
  now?: () => number;
  beforeIteration?: (iteration: number) => void;
  buildFn?: (chunkGrid: ChunkGridEntry[]) => ChunkColumn[];
}

export interface ChunkColumnProfile {
  iterations: number;
  totalMs: number;
  averageMs: number;
  maxMs: number;
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function profileChunkColumnBuild(options: ProfileChunkColumnsOptions): ChunkColumnProfile {
  const {
    chunks,
    iterations = 1,
    now = defaultNow,
    beforeIteration,
    buildFn = buildChunkColumns,
  } = options;

  let totalMs = 0;
  let maxMs = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    beforeIteration?.(iteration);
    const start = now();
    buildFn(chunks);
    const duration = now() - start;
    totalMs += duration;
    if (duration > maxMs) {
      maxMs = duration;
    }
  }

  return {
    iterations,
    totalMs,
    averageMs: iterations === 0 ? 0 : totalMs / iterations,
    maxMs,
  };
}
