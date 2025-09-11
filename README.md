# EcoSim - Ecological Simulation Game

A sophisticated ecological simulation game with Pokémon-inspired mechanics, featuring dynamic species reproduction, environmental adaptation, and realistic biological systems.

## Quick Start

```bash
# Install dependencies
npm install

# Initialize species database
npm run setup-db

# Start development server
npm run dev

# Run tests
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
  /simulation     # Core ecological simulation engine
    - VegetationSystem.ts    # Species growth and reproduction
    - SpeciesRegistry.ts     # Species definitions and traits
    - WorldChunk.ts          # Environmental simulation units
    - SimulationEngine.ts    # Main simulation coordinator
  /database       # SQLite species database
    - SpeciesDatabase.ts     # Database management
    - schema.sql             # Database schema
    - init-species-data.sql  # Species data
  /views          # Vue.js components
    - EcoSimGameView.vue     # Main game interface
    - SimulationView.vue     # Simulation controls
  /tests          # Comprehensive test suite
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
- **TypeScript** - Type-safe development
- **SQLite** - Species database management
- **Vite** - Fast development server and bundler
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

The project includes comprehensive test coverage:

- **36 tests** across 15 test files
- **Reproduction system tests** - Species breeding mechanics
- **Environmental system tests** - Climate and habitat simulation
- **Species behavior tests** - Growth, survival, and adaptation
- **Database integration tests** - Species data management

```bash
# Run all tests
npm test

# Run specific test suite
npm test src/tests/reproduction.spec.ts

# Run tests with coverage
npm run test:coverage
```

## Database Setup

The game uses SQLite to manage species data:

```bash
# Initialize database with schema and species data
npm run setup-db

# Reset database to defaults
npm run reset-db
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
   npm run setup-db
   ```

2. **Start Development**:
   ```bash
   npm run dev
   ```

3. **Open the Game**: Navigate to `http://localhost:5173` and explore the ecological simulation

4. **Run Tests**: Ensure everything works with `npm test`

The simulation starts with basic grassland conditions. Experiment with environmental parameters to see how different species respond, reproduce, and compete for resources!