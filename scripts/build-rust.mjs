import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = resolve(root, 'rust/target')
const destination = resolve(root, 'src/simulation/wasm/generated/ecosim_core.wasm')
const result = spawnSync('cargo', [
  'build',
  '--locked',
  '--release',
  '--target', 'wasm32-unknown-unknown',
  '--manifest-path', resolve(root, 'rust/ecosim-core/Cargo.toml'),
  '--target-dir', target,
], { cwd: root, stdio: 'inherit' })

if (result.error) {
  console.error('Building EcoSim requires Rust. Install it from https://rustup.rs, then run rustup target add wasm32-unknown-unknown.')
  console.error(result.error.message)
  process.exit(1)
}
if (result.status !== 0) {
  console.error('Rust simulation build failed. Ensure the WebAssembly target is installed: rustup target add wasm32-unknown-unknown')
  process.exit(result.status ?? 1)
}

mkdirSync(dirname(destination), { recursive: true })
copyFileSync(resolve(target, 'wasm32-unknown-unknown/release/ecosim_core.wasm'), destination)
console.log('Rust simulation compiled to src/simulation/wasm/generated/ecosim_core.wasm')
