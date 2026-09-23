/**
 * Writes src/database/catalogue.json from the SQLite seed data. Run after editing src/database/*.sql:
 *   npm run build:catalogue
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildCatalogue } from '../src/database/buildCatalogue'

const catalogue = await buildCatalogue()
const out = resolve(process.cwd(), 'src/database/catalogue.json')
await writeFile(out, `${JSON.stringify(catalogue, null, 2)}\n`)
console.log(`catalogue: ${catalogue.plants.length} plants, ${catalogue.birds.length} birds, ${catalogue.pollinators.length} pollinators, ${catalogue.interactions.length} interactions → ${out}`)
