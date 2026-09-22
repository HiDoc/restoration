import { readFile } from 'node:fs/promises'
import { initializeSimulationRuntime } from '@/simulation/rust/SimulationRuntime'

const bytes = await readFile(new URL('../simulation/wasm/generated/ecosim_core.wasm', import.meta.url))
await initializeSimulationRuntime(bytes)
