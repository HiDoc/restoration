# Extended Documentation — EcoSim: Ecological Simulation Game

This document lays out the architecture, mechanics, and systems for **EcoSim**, a sophisticated ecological simulation game featuring dynamic species reproduction, environmental adaptation, and realistic biological systems. It is structured as a **living guide** for iterative development with scientific accuracy and engaging gameplay.

---

## 1. Core Game Identity

EcoSim has three foundational pillars:

1. **Ecological Realism** — Species are authentic biological entities with lifecycle stages, environmental requirements, and adaptive behaviors.
2. **Dynamic Environments** — The world responds to climate, hydrology, canopy systems, and species interactions in real-time.
3. **Scientific Discovery** — Players research species traits, optimize conditions, and manage ecosystem succession through environmental manipulation.

The goal is to create an engaging simulation that teaches ecological principles through hands-on experimentation and observation.

---

## 2. Project Architecture

### Current Stack

* **Frontend**: Vue 3 with Composition API for reactive UI components
* **Language**: TypeScript with strict type checking for scientific accuracy
* **Database**: SQLite for species data, traits, and biome associations
* **Build Tool**: Vite for fast development and hot module replacement
* **Testing**: Vitest for comprehensive simulation testing

### Folder Structure

```
/src
  /simulation      # Ecological simulation engine
    - SimulationEngine.ts     # Master orchestrator
    - WorldChunk.ts           # Spatial world units
    - SpeciesRegistry.ts      # Species definitions
    - VegetationSystem.ts     # Growth, reproduction, mortality
    - WeatherSystem.ts        # Seasonal weather + events
    - HydrologySystem.ts      # Water flow and moisture
    - CanopySystem.ts         # Light attenuation and canopy
    - PollinatorSystem.ts     # Pollinator density field
    - BirdsSystem.ts          # Seed dispersal, pest control
  /database        # SQLite species database
  /components      # Vue UI components
  /views           # Game screens and interfaces
  /tests           # Comprehensive test suites
```

---

## 3. Species System

Each species is defined by **scientifically-grounded traits** stored in the SQLite database:

* **Species ID/Name** — Unique identifier with common and scientific names
* **Biome Preferences** — Temperature, moisture, light, and nutrient requirements
* **Lifecycle Stages** — Seed → Vegetative → Flowering → Fruiting progression
* **Reproduction Mechanics** — Environmental quality thresholds and reproductive urge
* **Ecological Interactions** — Pollination, seed dispersal, and competitive relationships
* **Physical Traits** — Growth rate, canopy height, root depth, seed dispersal mechanisms

### Example Species Entry

```
Species: Festuca pratensis (Meadow Fescue)
Type: Pioneer Grass
Biome: Grassland (0.8 weight), Forest Edge (0.3)
Temperature: 15-25°C optimal, 5-35°C tolerance
Moisture: 0.3-0.7 (moderate drought tolerance)
Light: Full sun preferred, shade tolerance: 0.2
Reproduction: Threshold 0.4, builds urge over failed attempts
Lifecycle: Fast vegetative growth, wind pollination, seed dispersal
Interactions: Soil preparation for shrubs and trees
```

---

## 4. Environmental Systems

### World Chunks

* Simulation space divided into **WorldChunk** spatial units
* Each chunk maintains environmental state: temperature, moisture, light, nutrients
* Dynamic interactions between chunks through weather and hydrology systems

### Environmental Simulation

* **WeatherSystem**: Seasonal temperature cycles, precipitation events, climate gradients
* **HydrologySystem**: Water flow, moisture distribution, drought/flood effects
* **CanopySystem**: Light attenuation through forest layers, shade effects
* **PollinatorSystem**: Pollinator density fields affecting plant reproduction

### Biome Types

* **Grassland**: Pioneer species, open conditions, frequent disturbance
* **Forest**: Multi-layer canopy, succession from pioneer to climax species
* **Wetland**: High moisture, specialized hydrophytic species
* **Urban**: Disturbed habitats, edge species, human influence

---

## 5. Reproduction and Population Dynamics

The core gameplay revolves around **dynamic reproduction mechanics**:

* **Environmental Quality Assessment**: Geometric mean of temperature, moisture, light, and nutrients
* **Reproduction Thresholds**: Each species has minimum quality requirements for successful reproduction
* **Reproductive Urge**: Time-based system that builds when reproduction fails, lowering thresholds
* **Adaptive Behavior**: Desperate species reduce their environmental standards to reproduce
* **Population Pressure**: Competition for resources affects reproduction success rates

This creates emergent population cycles and succession patterns without artificial game mechanics.

---

## 6. Research and Discovery

### Species Discovery

* Species are revealed through environmental exploration and observation
* Research system unlocks detailed trait information and optimal conditions
* Population monitoring reveals reproductive patterns and success factors
* Achievement system rewards ecological understanding and management

### Progression Mechanics

* **Environmental Mastery**: Learn to optimize conditions for different species
* **Succession Management**: Guide ecosystem development from pioneer to climax communities
* **Biodiversity Goals**: Achieve stable multi-species ecosystems
* **Research Milestones**: Unlock advanced environmental controls and rare species

---

## 7. Game States and Interface

The simulation maintains clear separation between:

* **Simulation View** (primary interface): Real-time environmental monitoring and species observation
* **Research Interface**: Species database, trait analysis, and population graphs
* **Environmental Controls**: Parameter adjustment tools for temperature, moisture, interventions
* **Event Log**: Chronological record of reproduction events, deaths, and environmental changes
* **Settings/Menu**: Game configuration and simulation parameters

All states are deterministic and supported by comprehensive event journaling for reproducibility.

---

## 8. Visual Design and User Experience

* **Scientific Clarity**: Clean, data-focused interface design emphasizing charts and environmental visualization
* **Real-time Feedback**: Dynamic population graphs, environmental parameter displays, event notifications
* **Ecological Authenticity**: Species representations based on real botanical characteristics
* **Information Density**: Comprehensive data presentation without overwhelming complexity
* **Theme Support**: Light/dark modes for different research environments and user preferences

---

## 9. Development Workflow

1. **Core Systems**: SimulationEngine orchestration, WorldChunk spatial management, species database integration
2. **Environmental Simulation**: WeatherSystem, HydrologySystem, CanopySystem implementation with realistic parameters
3. **Species Behavior**: VegetationSystem with reproduction mechanics, lifecycle stages, environmental adaptation
4. **UI Development**: Population monitoring, environmental controls, species research interface
5. **Testing Framework**: Comprehensive Vitest suites covering reproduction, genetics, environmental systems
6. **Database Population**: Expand from 10 to 50+ species with detailed ecological traits and interactions
7. **Advanced Systems**: PollinatorSystem, BirdsSystem, inter-species ecological relationships
8. **Performance Optimization**: Efficient chunk-based simulation, data visualization optimization
9. **Educational Content**: Research milestones, ecological achievement system, biodiversity goals

---

## 10. Technical Constraints and Boundaries

* **Scientific Accuracy**: All species behaviors and environmental interactions must be ecologically realistic
* **Performance Scaling**: Simulation must handle hundreds of species across multiple chunks efficiently
* **Deterministic Simulation**: Reproducible results through event journaling and seeded random generation
* **Database Integrity**: SQLite schema must support complex species relationships and biome associations
* **Testing Coverage**: Critical simulation mechanics require comprehensive test suites to prevent regressions
* **Educational Value**: Game mechanics must teach authentic ecological principles through engaging interaction

---

## 11. Scientific and Game Inspirations

* **Ecological Research**: Real-world plant ecology, succession theory, population dynamics studies
* **SimCity/Cities Skylines**: System-driven simulation with emergent complexity from simple rules
* **Kerbal Space Program**: Educational gameplay that teaches scientific principles through experimentation
* **Dwarf Fortress**: Complex, realistic simulation systems with emergent narratives
* **Two Point Hospital**: Data visualization and management of complex systems
* **Scientific Databases**: Real botanical databases, ecological research papers, species interaction studies

---

This document provides the **architectural foundation** for EcoSim: you can develop any system layer (environmental simulation, species behavior, UI/UX, database design) with confidence in how it integrates with the ecological simulation as a whole.

## Testing and Quality Assurance

The project maintains scientific accuracy through:
- **60+ comprehensive tests** across all simulation systems
- **Database validation** ensuring species data integrity
- **Reproduction behavior verification** with realistic population dynamics
- **Environmental system testing** for realistic climate and habitat simulation
- **Performance benchmarks** for scalable simulation with hundreds of species