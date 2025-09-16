# EcoSim - Ecological Simulation Game

A sophisticated ecological simulation game with Pokémon-inspired mechanics, featuring dynamic species reproduction, environmental adaptation, and realistic biological systems.

## Quick Start

```bash
# Install dependencies
npm install

# Initialize species database
npm run init-db

# Start development server
npm run dev

# Run tests (Vitest)
npm test

# Build for production
npm run build

# Run linting
npm run lint

# Type check
npm run typecheck
```

## Project Structure

```
/src
  /simulation      # Ecological simulation engine (orchestrator + systems)
    - SimulationEngine.ts     # Master orchestrator
    - WorldChunk.ts           # Spatial world units
    - SpeciesRegistry.ts      # Species definitions
    - VegetationSystem.ts     # Growth, reproduction, mortality
    - WeatherSystem.ts        # Seasonal weather + events
    - HydrologySystem.ts      # Water flow and moisture
    - CanopySystem.ts         # Light attenuation and canopy
    - PollinatorSystem.ts     # Pollinator density field
    - BirdsSystem.ts          # Seed dispersal, pest control, migration
  /database        # SQLite species database
    - SpeciesDatabase.ts      # Database adapter
    - schema.sql              # Database schema
    - init-species-data.sql   # Seed data
  /core            # Game scaffolding (engine shell, camera, input)
  /world           # Tile map, layers, loaders
  /render          # Sprite loader/manager
  /components      # Vue components
  /views           # Routed screens (UI layer)
  /utils           # Helpers
  /tests           # Vitest suites (src/**/*.spec.ts)
```

## Key Features

### 🧬 Dynamic Reproduction System
- **Reproduction Need**: Each species has environmental quality thresholds for reproduction
- **Reproductive Urge**: Time-based urge system that builds over failed reproduction attempts
- **Adaptive Thresholds**: Species lower their standards when desperate to reproduce
- **Environmental Quality**: Geometric mean assessment of temperature, moisture, light, and nutrients

### 🌿 Advanced Species Simulation
- **10 Unique Species**: From pioneer grasses to climax trees, each with distinct traits
- **Phenology Stages**: Seed → Vegetative → Flowering → Fruiting lifecycle
- **Environmental Adaptation**: Species respond to temperature, moisture, light, and soil conditions
- **Competition**: Dynamic resource competition between neighboring species

### 🌍 Realistic Ecological Systems
- **Biome Simulation**: Grassland, forest, wetland, and urban environments
- **Climate Systems**: Temperature gradients, rainfall patterns, seasonal changes
- **Succession**: Pioneer species prepare environments for climax communities
- **Species Interactions**: Pollination, seed dispersal, and competitive relationships

## Tech Stack

- **Vue 3** - Reactive UI framework with Composition API
- **TypeScript** - Strict, type-safe development
- **SQLite** - Species database management
- **Vite** - Fast dev server and bundler (port 3000)
- **Vitest** - Unit testing framework
- **ESLint** - Code quality enforcement

## Game Mechanics

### Species Collection & Research
- Discover species through environmental exploration
- Research species traits and optimal conditions
- Track population dynamics and reproductive success
- Unlock rare species through ecological achievements

### Environmental Management
- Modify habitat conditions to favor different species
- Balance competing species for ecosystem health
- Create optimal conditions for reproduction and growth
- Manage succession from pioneer to climax communities

### Simulation Controls
- Real-time environmental parameter adjustment
- Species population monitoring and analysis
- Reproduction rate tracking and optimization
- Environmental stress and adaptation visualization

## Testing

The project includes a growing Vitest suite:

- 60+ tests across 17 test files
- Reproduction system tests — species breeding mechanics
- Environmental system tests — climate and habitat simulation
- Species behavior tests — growth, survival, adaptation
- Database integration tests — species data management

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run a specific test file
npm test src/tests/reproduction.spec.ts

# Coverage (if needed)
npx vitest run --coverage
```

## Database Setup

The game uses SQLite to manage species data:

```bash
# Initialize database with schema and species data
npm run init-db

# Verify database and print examples
npm run test-db
```

The database includes:
- **Vegetal Species** - 10 species with detailed ecological traits
- **Species Interactions** - Pollination, seed dispersal, and feeding relationships
- **Biome Associations** - Species abundance weights per biome type
- **Simulation Overrides** - Fine-tuning parameters for game balance

## Development Philosophy

This project follows **minimal, high-impact code** principles:
- Eliminate unnecessary abstractions
- Reuse existing tested components
- Prioritize code readability and maintainability
- Implement robust biological realism within game constraints

## Getting Started

1. **Clone and Setup**:
   ```bash
   git clone <repository>
   cd pokemon-vibe-game
   npm install
   npm run init-db
   ```

2. **Start Development**:
   ```bash
   npm run dev
   ```

3. **Open the Game**: Navigate to `http://localhost:3000` and explore the ecological simulation

4. **Run Tests**: Ensure everything works with `npm test`

The simulation starts with basic grassland conditions. Experiment with environmental parameters to see how different species respond, reproduce, and compete for resources!
