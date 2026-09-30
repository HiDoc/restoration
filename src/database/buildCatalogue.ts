import { SpeciesDatabase } from './SpeciesDatabase'
import { SpeciesDataAdapter } from '../simulation/SpeciesDataAdapter'

/** The single species catalogue the game reads: plants, fauna, fungi and the interactions linking them. */
export async function buildCatalogue() {
  const db = new SpeciesDatabase(':memory:')
  await db.setup()
  try {
    const adapter = new SpeciesDataAdapter(db)
    await adapter.initialize()
    return {
      plants: adapter.getAllVegetalSpecies(),
      // Drop the row timestamp so the committed catalogue only changes when the data does.
      birds: adapter.getAllBirdSpecies().map(({ created_at: _, ...bird }) => bird),
      pollinators: await db.getPollinatorSpecies(),
      fungi: await db.getFungalSpecies(),
      interactions: await db.getSpeciesInteractions(),
    }
  } finally {
    await db.close()
  }
}
