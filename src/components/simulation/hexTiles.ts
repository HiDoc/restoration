/**
 * Map tiles and sprites drawn as Art Nouveau stained glass: flat colour fields, whiplash curves, Mucha-style trees,
 * a dark lead outline (neighbouring tiles read as one leaded panel) and a gilt inner rim with curled corners.
 * Tiles are pointy-top hexes in the kit's 78×92 proportion.
 */
import type { Habitat } from '@/game/hexDescription'

const LEAD = '#231d14'
const GILT = '#e2c26a'

const svg = (viewBox: string, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`)}`

const ground = (top: string, bottom: string) =>
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="78" height="92" fill="url(#g)"/>`

/** A rolling band of land across the tile, from height y down. */
const band = (y: number, fill: string, swing = 7) =>
  `<path d="M0 ${y} C14 ${y - swing} 26 ${y + swing} 39 ${y} S64 ${y - swing} 78 ${y} V92 H0Z" fill="${fill}"/>`

/** A sinuous blade of grass or reed. */
const blades = (stroke: string, spots: Array<[number, number, number]>) =>
  `<g fill="none" stroke="${stroke}" stroke-width="0.9" stroke-linecap="round">${spots
    .map(([x, y, h]) => `<path d="M${x} ${y} c-2 ${-h * 0.4} 2 ${-h * 0.6} ${h * 0.15} ${-h}"/><path d="M${x + 1.5} ${y} c2 ${-h * 0.35} -1 ${-h * 0.5} 1.5 ${-h * 0.75}"/>`)
    .join('')}</g>`

/** Five round petals about a gold heart. */
const flower = (x: number, y: number, r: number, color: string) =>
  `<g stroke="${LEAD}" stroke-width="0.4">${[0, 72, 144, 216, 288]
    .map(a => `<circle cx="${(x + Math.sin((a * Math.PI) / 180) * r).toFixed(2)}" cy="${(y - Math.cos((a * Math.PI) / 180) * r).toFixed(2)}" r="${r * 0.75}" fill="${color}"/>`)
    .join('')}<circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="#e9c45a"/></g>`

/** A tall tree with a round crown turned in a spiral, standing at (x, y). */
const tree = (x: number, y: number, s: number) =>
  `<g transform="translate(${x} ${y}) scale(${s})" stroke="${LEAD}" stroke-width="0.8"><path d="M-2.5 0 C-1 -4 -1.4 -10 -1.1 -15 H1.1 C1.4 -10 1 -4 2.5 0 C1 -0.8 -1 -0.8 -2.5 0Z" fill="#6a4a2c"/><circle cy="-23" r="10" fill="#6f9150"/><path d="M0 -23 a1.5 1.5 0 0 1 3 0 a3 3 0 0 1 -6 0 a4.5 4.5 0 0 1 9 0 a6 6 0 0 1 -12 0" fill="none" stroke="#b4cc8c" stroke-width="0.9"/></g>`

/** A low bush of three rounded lobes. */
const bush = (x: number, y: number) =>
  `<g stroke="#2f4424" stroke-width="0.7" fill="#4f6b3a"><circle cx="${x - 4}" cy="${y}" r="4.5"/><circle cx="${x + 4}" cy="${y}" r="4.5"/><circle cx="${x}" cy="${y - 4}" r="5"/><path d="M${x - 3} ${y - 5} q3 -3 6 0" fill="none" stroke="#8fae6a"/></g>`

const lilyPad = (x: number, y: number, r: number) =>
  `<path d="M${x} ${y} L${x + r} ${y - r * 0.35} A${r} ${r * 0.6} 0 1 0 ${x + r} ${y + r * 0.35} Z" fill="#6f9150" stroke="#2f4424" stroke-width="0.7"/>`

const waves = (stroke: string) =>
  `<g fill="none" stroke="${stroke}" stroke-width="1" stroke-linecap="round">${[14, 26, 38, 50, 62, 74, 86]
    .map((y, i) => `<path d="M${i % 2 ? -12 : -2} ${y} c6 -5 12 -5 16 0 s10 5 16 0 s10 -5 16 0 s10 5 16 0 s10 -5 16 0"/>`)
    .join('')}</g>`

const reeds = (spots: Array<[number, number]>) =>
  spots
    .map(([x, y]) => `<path d="M${x} ${y} q-1 -9 1 -18" fill="none" stroke="#4c6a3a" stroke-width="1"/><ellipse cx="${x + 0.8}" cy="${y - 14}" rx="1.3" ry="3.2" fill="#6b4a2a" stroke="${LEAD}" stroke-width="0.4"/>`)
    .join('')

const cracks = (stroke: string) =>
  `<g fill="none" stroke="${stroke}" stroke-width="0.8" stroke-linecap="round"><path d="M8 40 c8 2 10 8 18 8 s10 -6 16 -2"/><path d="M26 48 c-2 6 2 10 -2 16"/><path d="M42 46 c6 6 14 4 22 10 s4 10 10 12"/><path d="M20 72 c8 -2 14 4 22 2"/><path d="M50 26 c-4 4 0 8 -4 12"/></g>`

const pebbles = `<g fill="#d4c3a0" stroke="#6b5639" stroke-width="0.5"><ellipse cx="18" cy="58" rx="2.4" ry="1.6"/><ellipse cx="56" cy="40" rx="2" ry="1.3"/><ellipse cx="46" cy="74" rx="2.6" ry="1.7"/><ellipse cx="32" cy="30" rx="1.6" ry="1.1"/></g>`

const MEADOW_GROUND = ground('#bccd92', '#7f9c5c') + band(58, '#6f8c4e') + band(74, '#58753f', 6)

const BODIES: Record<Habitat, string> = {
  meadow:
    MEADOW_GROUND +
    blades('#3f5a2e', [[12, 72, 12], [30, 80, 10], [50, 76, 12], [66, 70, 10], [40, 62, 9]]) +
    flower(22, 42, 2.2, '#f1e6c8') + flower(52, 34, 2, '#d9918a') + flower(36, 52, 2.4, '#a992c4') + flower(60, 56, 2, '#f1e6c8') + flower(16, 60, 1.8, '#d9918a'),
  scrub:
    MEADOW_GROUND +
    blades('#3f5a2e', [[14, 78, 10], [62, 76, 10], [38, 86, 8]]) +
    bush(24, 48) + bush(54, 62) + bush(40, 30) + flower(58, 38, 1.8, '#f1e6c8') + flower(20, 68, 1.8, '#d9918a'),
  dry_grassland:
    ground('#e0cd93', '#b99a5c') + band(62, '#a88a4e') +
    blades('#7d6436', [[14, 70, 14], [28, 60, 12], [44, 72, 14], [60, 62, 12], [36, 84, 10], [52, 44, 10], [22, 44, 9]]) +
    flower(40, 34, 1.8, '#f3ead0') + flower(62, 50, 1.6, '#f3ead0'),
  woodland:
    ground('#5f7d4a', '#3b5530') + band(70, '#33492a', 5) +
    tree(39, 40, 0.75) + tree(21, 60, 1) + tree(57, 58, 1.05) + tree(39, 86, 0.95),
  wetland:
    ground('#a3bb90', '#6f9676') +
    `<g stroke="#3e6f73" stroke-width="0.8"><ellipse cx="28" cy="62" rx="17" ry="6.5" fill="#6fa3a4"/><ellipse cx="54" cy="38" rx="12" ry="5" fill="#6fa3a4"/></g>` +
    `<g fill="none" stroke="#d3e6de" stroke-width="0.6"><path d="M20 61 q6 -2 12 0"/><path d="M50 37 q5 -2 9 0"/></g>` +
    reeds([[12, 56], [16, 58], [46, 64], [50, 66], [60, 46], [30, 36], [66, 74]]) +
    flower(40, 74, 1.9, '#8f77b5') + flower(22, 40, 1.7, '#8f77b5'),
  open_water:
    ground('#86b8b3', '#3f7c86') + waves('#d3e8e1') +
    lilyPad(24, 50, 6) + lilyPad(54, 66, 5) + lilyPad(46, 30, 4) + flower(24, 49, 1.8, '#f6eedb'),
  bare:
    ground('#bba27a', '#8c7453') + band(66, '#7f6749', 5) + cracks('#6b5639') + pebbles,
  blighted:
    ground('#8d8276', '#5f564c') + band(64, '#6e6353', 5) + cracks('#3d352b') +
    `<g fill="none" stroke="#3d352b" stroke-width="0.9" stroke-linecap="round"><path d="M22 70 c0 -8 -4 -10 -1 -16 c2 -4 5 -2 3 1"/><path d="M52 60 c0 -8 4 -10 1 -15 c-2 -3 -5 -1 -3 2"/></g>` +
    `<g fill="#3d352b" opacity="0.6"><circle cx="34" cy="36" r="1.4"/><circle cx="60" cy="78" r="1.2"/><circle cx="16" cy="48" r="1"/></g>`,
}

/** A curl at each corner, drawn at the top and turned about the centre. */
const CURL = `<path d="M39 5.5 C39 10 35 12 33 10.5 C31.5 9.3 33 7.6 34.5 8.6"/><path d="M39 5.5 C39 10 43 12 45 10.5 C46.5 9.3 45 7.6 43.5 8.6"/>`
const FRAME =
  `<g fill="none" stroke="${GILT}" stroke-width="0.8" stroke-linecap="round"><polygon points="39,5.5 73.3,25.8 73.3,66.2 39,86.5 4.7,66.2 4.7,25.8" stroke-width="0.9"/>${[0, 60, 120, 180, 240, 300]
    .map(a => `<g transform="rotate(${a} 39 46)">${CURL}</g>`)
    .join('')}</g><polygon points="39,0 78,23 78,69 39,92 0,69 0,23" fill="none" stroke="${LEAD}" stroke-width="3.2"/>`

const byHabitat = (draw: (body: string) => string) =>
  Object.fromEntries(Object.entries(BODIES).map(([habitat, body]) => [habitat, svg('0 0 78 92', draw(body))])) as Record<Habitat, string>

/** The framed tile for the map, and the bare scene for photographs. */
export const HEX_TILE = byHabitat(body => body + FRAME)
export const HEX_SCENE = byHabitat(body => body)

const BEE = svg(
  '0 0 24 24',
  `<g stroke="${LEAD}" stroke-width="0.8"><ellipse cx="9" cy="7.5" rx="4.5" ry="3" fill="#f6eedb" opacity="0.85" transform="rotate(-25 9 7.5)"/><ellipse cx="14.5" cy="7" rx="4" ry="2.6" fill="#f6eedb" opacity="0.85" transform="rotate(20 14.5 7)"/><ellipse cx="12" cy="14" rx="6.5" ry="4.5" fill="#e0b24a"/><path d="M9.5 10 q-1 4 0 8 M12.5 9.6 q-1 4.4 0 8.8" fill="none" stroke-width="1.6"/><circle cx="18" cy="13" r="2.4" fill="${LEAD}"/><path d="M19.5 11 q1.5 -3 3 -3.5" fill="none"/></g>`,
)

const BIRD = svg(
  '0 0 24 24',
  `<g stroke="${LEAD}" stroke-width="0.8" stroke-linejoin="round"><path d="M3 17 L8 14.5 L6 18.5Z" fill="#5d4a38"/><path d="M6.5 15 C7 9 11 6.5 15.5 7 C19 7.3 20 9.5 19.5 11.5 C18.5 16 13 18.5 6.5 15Z" fill="#7a6048"/><path d="M12 16.6 C15.5 16.4 18.5 14.5 19.3 11.8 C16 12.5 13 14 12 16.6Z" fill="#d0845a"/><path d="M8.5 13.5 C11 10.5 14 10 16 11.5 C13 11.8 10.5 13 8.5 13.5Z" fill="#5d4a38"/><path d="M19.3 9.2 L22 9.8 L19.4 10.8Z" fill="#e9c45a"/><circle cx="17.2" cy="9.3" r="0.9" fill="${LEAD}" stroke="none"/><path d="M12 17.5 v2.5 M14 17.2 v2.8" fill="none"/></g>`,
)

/** Sprite drawn for an animal group; butterflies have none and are drawn as an inline shape. */
export const SPRITE_ICON: Record<string, string> = { bird: BIRD, bee: BEE, hoverfly: BEE }
