import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { buildChunkColumns, profileChunkColumnBuild, type ChunkGridEntry } from '@/components/simulation/chunkGridLayout';

describe('chunk grid render instrumentation', () => {
  it('builds stable columns for deterministic chunks', () => {
    const chunks: ChunkGridEntry[] = [
      { id: '0-1', x: 0, y: 1, biomeState: {} },
      { id: '0-0', x: 0, y: 0, biomeState: {} },
      { id: '1-0', x: 1, y: 0, biomeState: {} },
    ];

    const columns = buildChunkColumns(chunks);

    expect(columns).toHaveLength(2);
    expect(columns[0].x).toBe(0);
    expect(columns[0].chunks.map((chunk) => chunk.id)).toEqual(['0-0', '0-1']);
    expect(columns[1].x).toBe(1);
    expect(columns[1].chunks.map((chunk) => chunk.id)).toEqual(['1-0']);
  });

  it('stays within the frame budget under mocked scroll churn', () => {
    const width = 36;
    const height = 28;
    const chunks: ChunkGridEntry[] = [];

    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const vitality = ((x * 13 + y * 17) % 97) / 97;
        const moisture = ((y * 19 + x * 23) % 101) / 101;
        const pollution = ((x * 7 + y * 11) % 89) / 89;
        const canopy = ((x * 5 + y * 3) % 83) / 83;
        const succession = ((x * 31 + y * 29) % 79) / 79;
        const diversity = ((x * 41 + y * 37) % 73) / 73;

        chunks.push({
          id: `${x}-${y}`,
          x,
          y,
          biomeState: { vitality, moisture, pollution, canopy, succession, diversity },
          pollinatorDensity: ((x * 11 + y * 13) % 67) / 67,
          birds: { owl: ((x + y) % 5) / 5, swift: ((x * 2 + y * 3) % 7) / 7 },
          birdsActivity: ((x * 17 + y * 19) % 61) / 61,
          seedBankCount: (x + y) % 4,
        });
      }
    }

    const profile = profileChunkColumnBuild({
      chunks,
      iterations: 24,
      now: () => performance.now(),
      beforeIteration: (iteration) => {
        for (let i = 0; i < chunks.length; i += 1) {
          const chunk = chunks[i];
          const shift = ((iteration + i) % height) / height;
          chunk.biomeState.vitality = (chunk.biomeState.vitality + 0.05 * shift) % 1;
          chunk.pollinatorDensity = ((chunk.pollinatorDensity ?? 0) + 0.03 * shift) % 1;
        }
      },
    });

    expect(profile.iterations).toBe(24);
    expect(profile.maxMs).toBeLessThan(12);
    expect(profile.averageMs).toBeLessThan(8);
  });
});
