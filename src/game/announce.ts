import type { Discovery } from './knowledge'
import type { CodexTab } from './codex'
import { list } from './hexDescription'
import { speciesInfo } from './speciesInfo'
import { MYSTERIES } from './mysteries'

export interface Announcement { icon: string; text: string; opens: CodexTab }

/** Up to this many names in one line; the rest are counted. */
const NAMED = 3

const named = (names: string[]) =>
  names.length > NAMED ? `${names.slice(0, NAMED).join(', ')} and ${names.length - NAMED} more` : list(names)

const tabOf = (id: string): CodexTab => {
  const info = speciesInfo(id)
  return info.kind === 'fungus' ? 'fungus' : !info.animal ? 'plant' : info.kind === 'bird' ? 'bird' : 'pollinator'
}

/** What was newly learned, one line per kind of discovery however many came at once. */
export function announcements(found: Discovery[]): Announcement[] {
  const lines: Announcement[] = []
  const of = <K extends Discovery['kind']>(kind: K) => found.filter((d): d is Extract<Discovery, { kind: K }> => d.kind === kind)
  const species = of('species')
  if (species.length) {
    const names = species.map(d => speciesInfo(d.id).name)
    lines.push({ icon: 'icon-observe', text: species.length === 1 ? `New in your Codex: ${names[0]}` : `${species.length} new in your Codex: ${named(names)}`, opens: tabOf(species[0].id) })
  }
  const heard = of('heard')
  if (heard.length) lines.push({ icon: 'icon-observe', text: `Heard, not yet seen: ${named(heard.map(d => speciesInfo(d.id).name))}`, opens: tabOf(heard[0].id) })
  const pairs = of('interaction')
  if (pairs.length) {
    const names = pairs.map(d => `${speciesInfo(d.animal).name} ↔ ${speciesInfo(d.plant).name}`)
    lines.push({ icon: 'icon-diversity', text: pairs.length === 1 ? `New interaction: ${names[0]}` : `${pairs.length} new interactions: ${named(names)}`, opens: 'interaction' })
  }
  for (const mystery of of('mystery')) {
    const question = MYSTERIES.find(m => m.id === mystery.id)?.question
    lines.push({ icon: 'icon-journal', text: mystery.solved ? 'A mystery is solved. The Codex explains.' : `A mystery: ${question}`, opens: 'mystery' })
  }
  return lines
}
