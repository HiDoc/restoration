-- Species Database Schema
-- Ecological simulation database for vegetal and bird species

-- Vegetal Species Table
CREATE TABLE IF NOT EXISTS vegetal_species (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    common_name TEXT,
    family TEXT,
    type TEXT CHECK (type IN ('grass', 'shrub', 'tree', 'fern', 'moss', 'flower')),
    succession_stage TEXT CHECK (succession_stage IN ('pioneer', 'early', 'mid', 'late', 'climax')),
    
    -- Growth characteristics
    max_biomass REAL NOT NULL DEFAULT 1.0,
    growth_rate REAL NOT NULL DEFAULT 0.1,
    max_age INTEGER DEFAULT 100,
    reproduction_age INTEGER DEFAULT 10,
    reproduction_need REAL DEFAULT 0.5, -- Environmental threshold needed to reproduce (0.0-1.0)
    
    -- Environmental preferences
    temp_min REAL DEFAULT -10.0,
    temp_max REAL DEFAULT 35.0,
    temp_optimal REAL DEFAULT 20.0,
    moisture_min REAL DEFAULT 0.1,
    moisture_max REAL DEFAULT 1.0,
    moisture_optimal REAL DEFAULT 0.6,
    
    -- Light requirements
    light_min REAL DEFAULT 0.1,
    light_max REAL DEFAULT 1.0,
    light_optimal REAL DEFAULT 0.8,
    shade_tolerance REAL DEFAULT 0.3,
    
    -- Soil preferences
    soil_ph_min REAL DEFAULT 5.5,
    soil_ph_max REAL DEFAULT 8.0,
    soil_ph_optimal REAL DEFAULT 6.5,
    nutrient_requirement REAL DEFAULT 0.5,
    
    -- Ecological attributes
    pollution_tolerance REAL DEFAULT 0.3,
    drought_resistance REAL DEFAULT 0.4,
    cold_hardiness REAL DEFAULT 0.5,
    wind_resistance REAL DEFAULT 0.6,
    
    -- Reproductive characteristics
    -- Allow explicit asexual markers; adapter maps these to self-pollination logic
    pollination_type TEXT CHECK (pollination_type IN (
      'wind', 'insect', 'bird', 'self', 'mixed',
      'asexual', 'rhizome', 'stolon', 'vegetative'
    )),
    seed_dispersal TEXT CHECK (seed_dispersal IN ('wind', 'animal', 'water', 'gravity', 'ballistic')),
    flowering_season TEXT,
    fruit_season TEXT,
    
    -- Interaction factors
    allelopathy REAL DEFAULT 0.0, -- Chemical inhibition of other plants
    nitrogen_fixation BOOLEAN DEFAULT FALSE,
    mycorrhizal_association BOOLEAN DEFAULT FALSE,
    
    -- Visual attributes
    color_primary TEXT,
    color_secondary TEXT,
    height_category TEXT CHECK (height_category IN ('ground', 'low', 'medium', 'tall', 'canopy')),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bird Species Table
CREATE TABLE IF NOT EXISTS bird_species (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    common_name TEXT,
    family TEXT,
    order_name TEXT,
    
    -- Physical characteristics
    body_mass_g REAL, -- grams
    wingspan_cm REAL, -- centimeters
    length_cm REAL, -- centimeters
    
    -- Behavioral characteristics
    diet_type TEXT CHECK (diet_type IN ('carnivore', 'herbivore', 'omnivore', 'granivore', 'nectarivore', 'insectivore', 'frugivore')),
    feeding_strategy TEXT CHECK (feeding_strategy IN ('ground', 'aerial', 'foliage', 'bark', 'nectar', 'water', 'mixed')),
    social_behavior TEXT CHECK (social_behavior IN ('solitary', 'pair', 'small_flock', 'large_flock', 'colonial')),
    
    -- Habitat preferences
    habitat_type TEXT CHECK (habitat_type IN ('forest', 'grassland', 'wetland', 'urban', 'agricultural', 'mountain', 'coastal', 'mixed')),
    canopy_preference TEXT CHECK (canopy_preference IN ('ground', 'understory', 'midstory', 'canopy', 'emergent', 'aerial')),
    territory_size_ha REAL, -- hectares
    
    -- Migration and seasonality
    migration_pattern TEXT CHECK (migration_pattern IN ('resident', 'short_distance', 'long_distance', 'nomadic', 'altitudinal')),
    breeding_season TEXT,
    clutch_size_min INTEGER,
    clutch_size_max INTEGER,
    
    -- Environmental tolerances
    temp_range_min REAL,
    temp_range_max REAL,
    elevation_min_m INTEGER,
    elevation_max_m INTEGER,
    
    -- Ecological role
    pollinator_effectiveness REAL DEFAULT 0.0, -- 0.0 to 1.0
    seed_dispersal_effectiveness REAL DEFAULT 0.0, -- 0.0 to 1.0
    pest_control_effectiveness REAL DEFAULT 0.0, -- 0.0 to 1.0
    
    -- Population characteristics
    abundance_category TEXT CHECK (abundance_category IN ('rare', 'uncommon', 'common', 'abundant', 'very_abundant')),
    conservation_status TEXT CHECK (conservation_status IN ('LC', 'NT', 'VU', 'EN', 'CR', 'EX')), -- IUCN categories
    
    -- Activity patterns
    activity_period TEXT CHECK (activity_period IN ('diurnal', 'nocturnal', 'crepuscular', 'mixed')),
    foraging_time TEXT, -- JSON array of active hours
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Species Interactions Table (many-to-many relationships)
CREATE TABLE IF NOT EXISTS species_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_a_id TEXT NOT NULL,
    species_a_type TEXT CHECK (species_a_type IN ('vegetal', 'bird')),
    species_b_id TEXT NOT NULL,
    species_b_type TEXT CHECK (species_b_type IN ('vegetal', 'bird')),
    interaction_type TEXT CHECK (interaction_type IN ('pollination', 'seed_dispersal', 'nesting', 'feeding', 'competition', 'facilitation', 'neutral')),
    interaction_strength REAL DEFAULT 0.5, -- 0.0 to 1.0
    seasonal_modifier TEXT, -- JSON object with seasonal variations
    notes TEXT,
    
    FOREIGN KEY (species_a_id) REFERENCES vegetal_species(id) ON DELETE CASCADE,
    FOREIGN KEY (species_b_id) REFERENCES bird_species(id) ON DELETE CASCADE
);

-- Biome Associations Table
CREATE TABLE IF NOT EXISTS biome_associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id TEXT NOT NULL,
    species_type TEXT CHECK (species_type IN ('vegetal', 'bird')),
    biome_type TEXT NOT NULL,
    abundance_weight REAL DEFAULT 1.0, -- Relative abundance in this biome
    
    UNIQUE(species_id, species_type, biome_type)
);

-- Simulation-specific overrides for vegetal species (optional tuning)
CREATE TABLE IF NOT EXISTS simulation_species_overrides (
    species_id TEXT PRIMARY KEY,
    seed_production INTEGER,               -- Seeds per reproductive cycle
    reproduction_threshold REAL,           -- Biomass threshold to reproduce
    seed_maturity_ticks INTEGER,           -- Ticks seeds wait before germination attempt
    dispersal_range REAL,                  -- Base dispersal range in meters (relative units)
    reproduction_seasons TEXT,             -- JSON array of seasons: ["spring","summer",...]
    rarity TEXT CHECK (rarity IN ('common','uncommon','rare','very_rare','legendary')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (species_id) REFERENCES vegetal_species(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vegetal_succession ON vegetal_species(succession_stage);
CREATE INDEX IF NOT EXISTS idx_vegetal_type ON vegetal_species(type);
CREATE INDEX IF NOT EXISTS idx_bird_diet ON bird_species(diet_type);
CREATE INDEX IF NOT EXISTS idx_bird_habitat ON bird_species(habitat_type);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON species_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_biome_assoc_type ON biome_associations(biome_type);
