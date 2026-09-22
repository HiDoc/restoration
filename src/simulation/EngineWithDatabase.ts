import type { SimulationConfig } from './SimulationEngine'
import { initializeSimulationRuntime } from './rust/SimulationRuntime'

/**
 * Helper factory to create a SimulationEngine and attach the DB-backed species adapter.
 * Uses dynamic import to keep sqlite dependencies out of browser bundles unless explicitly used.
 */
export async function createEngineWithDatabase(config: SimulationConfig, databasePath?: string) {
  const { SimulationEngine } = await import('./SimulationEngine')
  const { createSpeciesDataAdapter } = await import('./SpeciesDataAdapter')

  await initializeSimulationRuntime()
  const engine = new SimulationEngine(config)
  const adapter = await createSpeciesDataAdapter(databasePath)
  await engine.setSpeciesAdapter(adapter)
  return engine
}
