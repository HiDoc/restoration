import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { initializeSimulationRuntime } from '@/simulation/rust/SimulationRuntime'

// Resolve from the project root: under jsdom, URL is jsdom's and rejects file: paths for readFile.
const bytes = await readFile(resolve(process.cwd(), 'src/simulation/wasm/generated/ecosim_core.wasm'))
await initializeSimulationRuntime(bytes)

// Node has no Web Storage; stores persist to localStorage, so give each test file an in-memory one.
if (typeof globalThis.localStorage === 'undefined') {
  const data = new Map<string, string>()
  globalThis.localStorage = {
    get length() { return data.size },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, String(value)) },
    removeItem: (key: string) => { data.delete(key) },
    clear: () => { data.clear() },
  } satisfies Storage
}
