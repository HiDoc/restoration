import type { Tag } from './journal'
import type { Cross } from './notebook'

/** What the player has made in a hex, for markers on the map. */
export interface HexMarks { tagged: number; crossing: boolean }

/** A cross waits for its seedlings this long before its marker goes, in days. */
const CROSS_WAIT_DAYS = 360

/** Living tagged plants and waiting crosses per hex id. */
export function hexMarks(tags: Record<string, Tag>, crosses: readonly Cross[], day: number): Record<string, HexMarks> {
  const marks: Record<string, HexMarks> = {}
  const at = (hex: string) => (marks[hex] ??= { tagged: 0, crossing: false })
  for (const tag of Object.values(tags)) if (tag.hex && !tag.died) at(tag.hex).tagged += 1
  for (const cross of crosses) {
    if (cross.hex && cross.seedlings.length === 0 && day - cross.tick < CROSS_WAIT_DAYS) at(cross.hex).crossing = true
  }
  return marks
}
