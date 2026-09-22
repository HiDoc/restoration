import { computed, type ComputedRef } from 'vue';

export interface SeasonalPalette {
  sky: string;
  skyGradient: string;
  light: string;
  accent: string;
  shadow: string;
  ground: string;
}

export interface SeasonalAtmosphere {
  palette: SeasonalPalette;
  overlayIntensity: number;
  transitionDuration: string;
}

const SEASON_PALETTES: Record<string, SeasonalPalette> = {
  spring: {
    sky: '#87CEEB',
    skyGradient: 'linear-gradient(to bottom, #87CEEB 0%, #B8D8BA 100%)',
    light: 'rgba(255, 255, 200, 0.12)',
    accent: '#90EE90',
    shadow: 'rgba(80, 100, 80, 0.15)',
    ground: '#9BC184',
  },
  summer: {
    sky: '#4A90E2',
    skyGradient: 'linear-gradient(to bottom, #4A90E2 0%, #F4E4C1 100%)',
    light: 'rgba(255, 220, 100, 0.18)',
    accent: '#FFD700',
    shadow: 'rgba(100, 80, 40, 0.2)',
    ground: '#C8B273',
  },
  autumn: {
    sky: '#B8860B',
    skyGradient: 'linear-gradient(to bottom, #B8860B 0%, #CD853F 100%)',
    light: 'rgba(200, 140, 60, 0.16)',
    accent: '#D2691E',
    shadow: 'rgba(80, 50, 30, 0.25)',
    ground: '#A67B5B',
  },
  fall: {
    // Alias for autumn
    sky: '#B8860B',
    skyGradient: 'linear-gradient(to bottom, #B8860B 0%, #CD853F 100%)',
    light: 'rgba(200, 140, 60, 0.16)',
    accent: '#D2691E',
    shadow: 'rgba(80, 50, 30, 0.25)',
    ground: '#A67B5B',
  },
  winter: {
    sky: '#B0C4DE',
    skyGradient: 'linear-gradient(to bottom, #B0C4DE 0%, #D4E3ED 100%)',
    light: 'rgba(200, 220, 255, 0.12)',
    accent: '#E0E8F0',
    shadow: 'rgba(100, 120, 140, 0.2)',
    ground: '#C0CAD0',
  },
};

const DEFAULT_PALETTE: SeasonalPalette = {
  sky: '#708090',
  skyGradient: 'linear-gradient(to bottom, #708090 0%, #A8B8C0 100%)',
  light: 'rgba(200, 200, 200, 0.1)',
  accent: '#B0BEC5',
  shadow: 'rgba(60, 60, 60, 0.15)',
  ground: '#98A8A8',
};

export function useSeasonalAtmosphere(
  seasonName: ComputedRef<string> | string
): ComputedRef<SeasonalAtmosphere> {
  return computed(() => {
    const season = typeof seasonName === 'string' ? seasonName : seasonName.value;
    const normalizedSeason = season.toLowerCase().trim();

    const palette = SEASON_PALETTES[normalizedSeason] || DEFAULT_PALETTE;

    return {
      palette,
      overlayIntensity: 0.25,
      transitionDuration: '800ms',
    };
  });
}

export function getHexOverlayColor(
  biomeType: string,
  seasonName: string,
  vitality: number = 0.5
): string {
  const normalizedSeason = seasonName.toLowerCase().trim();

  // Base colors by biome type
  const biomeColors: Record<string, { base: string; seasonal: boolean }> = {
    grassland: { base: 'rgba(139, 172, 93, ', seasonal: true },
    forest: { base: 'rgba(76, 117, 63, ', seasonal: true },
    wetland: { base: 'rgba(86, 156, 156, ', seasonal: false },
    savanna: { base: 'rgba(189, 154, 94, ', seasonal: true },
    wasteland: { base: 'rgba(120, 110, 100, ', seasonal: false },
  };

  const biomeColor = biomeColors[biomeType] || biomeColors.grassland;
  const baseOpacity = 0.35 + vitality * 0.25;

  // If biome is seasonal, blend with seasonal lighting
  if (biomeColor.seasonal) {
    // Parse seasonal light color and apply as a tint
    const seasonalBoost = normalizedSeason === 'summer' ? 0.1 :
                         normalizedSeason === 'autumn' ? 0.05 :
                         normalizedSeason === 'winter' ? -0.05 : 0;
    return `${biomeColor.base}${Math.max(0.2, Math.min(0.7, baseOpacity + seasonalBoost))})`;
  }

  return `${biomeColor.base}${baseOpacity})`;
}

export function getBiomeTexturePath(
  moisture: number,
  pollution: number,
  canopy: number
): string {
  if (pollution > 0.65) return '/assets/terrain/wasteland.png';
  if (moisture > 0.75) return '/assets/terrain/wetland.png';
  if (canopy > 0.55) return '/assets/terrain/forest.png';
  if (moisture < 0.3) return '/assets/terrain/savanna.png';
  return '/assets/terrain/grassland.png';
}
