/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import ChunkHex from '@/components/simulation/ChunkHex.vue';
import type { ChunkGridEntry } from '@/components/simulation/chunkGridLayout';
import type { VizMode } from '@/components/simulation/types';

type RenderOptions = Partial<{
  chunk: ChunkGridEntry;
  vizMode: VizMode;
  isSelected: boolean;
  isHovered: boolean;
}>;

describe('ChunkHex', () => {
  const baseChunk: ChunkGridEntry = {
    id: '0-0',
    x: 0,
    y: 0,
    biomeState: {
      vitality: 0.5,
      moisture: 0.4,
      pollution: 0.2,
      canopy: 0.3,
      succession: 0.1,
      diversity: 0.25,
    },
    pollinatorDensity: 0.6,
    birds: { owl: 0.4, swift: 0.2 },
    birdsActivity: 0.7,
    speciesLabel: 'Common Grass',
    seedBankCount: 3,
  };

  const renderHex = (overrides: RenderOptions = {}) => {
    const chunk = { ...baseChunk, ...overrides.chunk } as ChunkGridEntry;
    const container = document.createElement('div');
    document.body.appendChild(container);

    const events = {
      hover: vi.fn(),
      unhover: vi.fn(),
      select: vi.fn(),
    };

    const app = createApp(ChunkHex, {
      chunk,
      vizMode: overrides.vizMode ?? 'vitality',
      showLabels: true,
      pollinators: { showBees: true, showArrows: true },
      engine: {
        getChunk: vi.fn().mockReturnValue({ pollinatorDensity: 0.65 }),
      },
      isSelected: overrides.isSelected ?? false,
      isHovered: overrides.isHovered ?? false,
      onHover: events.hover,
      onUnhover: events.unhover,
      onSelect: events.select,
    });

    app.mount(container);

    const cell = container.querySelector('[role="gridcell"]') as HTMLElement | null;
    if (!cell) throw new Error('Failed to render ChunkHex gridcell');

    return {
      container,
      cell,
      chunk,
      events,
      unmount: () => {
        app.unmount();
        if (container.parentNode) container.parentNode.removeChild(container);
      },
    };
  };

  it('renders coordinates, species label, and stats when emphasised', async () => {
    const { container, unmount } = renderHex({ isHovered: true });
    await nextTick();

    expect(container.textContent).toContain('0,0');
    expect(container.textContent).toContain('Common Grass');
    expect(container.textContent).toContain('Sp');

    unmount();
  });

  it('emits hover, unhover, and select events with coordinates', async () => {
    const { cell, events, unmount } = renderHex();

    cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await nextTick();
    cell.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await nextTick();
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(events.hover).toHaveBeenCalledWith({ x: 0, y: 0 });
    expect(events.unhover).toHaveBeenCalledTimes(1);
    expect(events.select).toHaveBeenCalledWith({ x: 0, y: 0 });

    unmount();
  });

  it('shows pollinator, bird, and seed badges when data present', async () => {
    const { container, unmount } = renderHex({ vizMode: 'pollinators' });
    await nextTick();

    expect(container.textContent).toMatch(/🐝+/);
    expect(container.textContent).toContain('🌱3');
    expect(container.textContent).toMatch(/🦉/);

    unmount();
  });
});
