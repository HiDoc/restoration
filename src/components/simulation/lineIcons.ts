/**
 * Line icons for what the kit has no art for, drawn on a 24-unit grid with round 1.6-unit strokes so they sit
 * beside the kit's glyphs. Each is a list of SVG path strings.
 */
export const LINE_ICONS = {
  sites: ['M3 6.5 9 4.5l6 2 6-2v13l-6 2-6-2-6 2z', 'M9 4.5v13', 'M15 6.5v13'],
  seeds: ['M12 3c4 3 6.5 7 6.5 11a6.5 6.5 0 0 1-13 0C5.5 10 8 6 12 3z', 'M12 9.5v8'],
  sample: ['M9.5 3h5', 'M10.5 3v12.5a1.5 1.5 0 0 0 3 0V3', 'M10.5 10h3', 'M4 20.5h16', 'M7 18h10'],
  trace: ['M12 3.5s5 5.8 5 9.8a5 5 0 0 1-10 0c0-4 5-9.8 5-9.8z', 'M9.5 13.5l2.5 2.5 2.5-2.5'],
  listen: ['M7.5 9.5a4.5 4.5 0 1 1 9 0c0 3.5-3.5 4.2-3.5 7.5a3 3 0 0 1-5.5 1.6', 'M10 9.5a2 2 0 1 1 4 0'],
  photo: ['M3.5 8h3.5l2-2.5h6l2 2.5h3.5v11h-17z', 'M12 16.5a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z'],
  follow: ['M4 19c3-1 4-6.5 7-6.5s3.5 3 7.5-4.5', 'M19.5 6.2a1.7 1.7 0 1 1-.01 0'],
  fungi: ['M3.5 12a8.5 7 0 0 1 17 0z', 'M10 12v6a2 2 0 0 0 4 0v-6', 'M8 8.5h.01', 'M14.5 7.5h.01'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8.5 3.5v4', 'M15.5 3.5v4', 'M8 14h3'],
  tag: ['M4 4h7.5l8.5 8.5-7.5 7.5L4 11.5z', 'M8.2 8.2h.01'],
  cross: ['M5 19l7.5-7.5', 'M12.5 11.5l3-3a2.1 2.1 0 0 1 3 3l-3 3z', 'M6.5 6.5h.01', 'M9.5 4.5h.01', 'M4.5 9.5h.01'],
  collect: ['M4 11h16l-2.2 9H6.2z', 'M8.5 11l3.5-5.5 3.5 5.5', 'M10 15h.01', 'M14 15h.01'],
  plant: ['M12 20.5v-9', 'M12 11.5c0-4.2 3-6.5 7.5-6.5 0 4.2-3 6.5-7.5 6.5z', 'M12 14c0-3.3-2.3-5.3-6.5-5.3 0 3.3 2.3 5.3 6.5 5.3z'],
  inspect: ['M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20.5 20.5l-5-5'],
  note: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  deadwood: ['M4 15h12.5a3 3 0 0 0 0-6H4a3 3 0 0 0 0 6z', 'M16.5 9a3 3 0 0 1 0 6', 'M16.5 11.2a.8.8 0 1 0 0 1.6', 'M8 9l-1.5-2.5', 'M11 15l1 2.5'],
  more: ['M4.5 12h1.5', 'M11.25 12h1.5', 'M18 12h1.5'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
} as const

export type LineIconName = keyof typeof LINE_ICONS

const svg = (name: LineIconName) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${LINE_ICONS[name].map(d => `<path d="${d}"/>`).join('')}</svg>`

/** The icon as a CSS mask image, for glyph slots tinted by currentColor (`.nv-glyph`). */
export function lineIconMask(name: LineIconName): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg(name))}")`
}
