-- Research and Discovery System Extensions
-- Adds progressive learning and achievement tracking to the ecological simulation

-- Extend vegetal_species with discovery metadata
-- Note: Use ALTER TABLE for existing databases, or integrate into main schema for new setups

-- Discovery and research fields for species
CREATE TABLE IF NOT EXISTS species_discovery_metadata (
    species_id TEXT PRIMARY KEY,
    species_type TEXT CHECK (species_type IN ('vegetal', 'bird')) DEFAULT 'vegetal',
    discovery_method TEXT CHECK (discovery_method IN ('initial', 'environmental', 'succession', 'intervention', 'hybrid')) DEFAULT 'environmental',
    discovery_hint TEXT, -- Human-readable hint for how to discover this species
    rarity_tier INTEGER DEFAULT 1 CHECK (rarity_tier BETWEEN 1 AND 5), -- 1=common, 5=legendary
    educational_note TEXT, -- What this species teaches about ecology
    unlock_requirements TEXT, -- JSON describing environmental/succession requirements

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (species_id) REFERENCES vegetal_species(id) ON DELETE CASCADE
);

-- Research achievements (educational milestones)
CREATE TABLE IF NOT EXISTS research_achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('discovery', 'succession', 'biodiversity', 'genetics', 'mastery', 'environmental')) NOT NULL,

    -- Achievement trigger conditions (JSON)
    unlock_condition TEXT NOT NULL, -- JSON describing condition

    -- Educational value
    educational_note TEXT NOT NULL, -- What ecological principle this teaches
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),

    -- Optional rewards
    reward_type TEXT CHECK (reward_type IN ('species_unlock', 'intervention_unlock', 'cosmetic', 'none')) DEFAULT 'none',
    reward_data TEXT, -- JSON with reward details

    -- Metadata
    icon TEXT, -- Icon identifier for UI
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Research questions (guided learning)
CREATE TABLE IF NOT EXISTS research_questions (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    hint TEXT,
    detailed_hint TEXT, -- More detailed explanation if player is stuck

    -- Educational design
    educational_goal TEXT NOT NULL, -- What ecological principle this teaches
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    category TEXT CHECK (category IN ('observation', 'experimentation', 'succession', 'interactions', 'genetics')),

    -- Success conditions
    success_condition TEXT NOT NULL, -- JSON describing solution
    prerequisite_species TEXT, -- JSON array of required discovered species
    prerequisite_achievements TEXT, -- JSON array of required achievements

    -- Metadata
    estimated_duration_ticks INTEGER, -- How long this typically takes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Achievement dependencies (optional progression tree)
CREATE TABLE IF NOT EXISTS achievement_dependencies (
    achievement_id TEXT NOT NULL,
    required_achievement_id TEXT NOT NULL,

    PRIMARY KEY (achievement_id, required_achievement_id),
    FOREIGN KEY (achievement_id) REFERENCES research_achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (required_achievement_id) REFERENCES research_achievements(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovery_rarity ON species_discovery_metadata(rarity_tier);
CREATE INDEX IF NOT EXISTS idx_discovery_method ON species_discovery_metadata(discovery_method);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON research_achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_difficulty ON research_achievements(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_category ON research_questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON research_questions(difficulty);

-- Initial seed data for discovery metadata
-- Common pioneer species (always available)
INSERT OR IGNORE INTO species_discovery_metadata (species_id, discovery_method, rarity_tier, discovery_hint, educational_note) VALUES
('common_grass', 'initial', 1, 'Available from the start', 'Pioneer species that colonizes disturbed habitats and prepares soil for other plants'),
('shadow_moss', 'initial', 1, 'Available from the start', 'Ground cover that thrives in shade and retains moisture'),
('healing_fern', 'initial', 2, 'Look for shaded, moist areas', 'Understory species that benefits from forest canopy'),
('silver_birch', 'environmental', 2, 'Appears in moderate light with good moisture', 'Early successional tree that provides shade for later species'),
('crimson_oak', 'succession', 3, 'Emerges in mature forests with established canopy', 'Late successional species requiring specific conditions created by earlier plants');

-- Sample achievements
INSERT OR IGNORE INTO research_achievements (id, name, description, category, unlock_condition, educational_note, difficulty) VALUES
('first_discovery', 'First Discovery', 'Discovered your first species in the field', 'discovery', '{"type": "species_count", "count": 1}', 'Ecological observation is the foundation of understanding ecosystems', 1),
('pioneer_observer', 'Pioneer Observer', 'Observed a pioneer species preparing habitat for succession', 'succession', '{"type": "succession_event", "stage": "pioneer"}', 'Pioneer species modify their environment, enabling later successional species', 2),
('stable_ecosystem', 'Stable Ecosystem', 'Maintained 5+ coexisting species for 10 years', 'biodiversity', '{"type": "biodiversity_duration", "min_species": 5, "duration_years": 10}', 'Biodiversity creates ecosystem resilience through niche partitioning', 3),
('pollinator_dependency', 'Pollinator Crisis', 'Observed reproduction failure due to lack of pollinators', 'environmental', '{"type": "failed_pollination", "reason": "no_pollinators"}', 'Many flowering plants depend on animal pollinators for reproduction', 2),
('genetic_diversity', 'Genetic Diversity', 'Observed genetic mutations adapting to environmental stress', 'genetics', '{"type": "mutation_observed", "count": 5}', 'Genetic variation enables populations to adapt to changing conditions', 4),
('forest_succession', 'Forest Builder', 'Guided succession from grassland to forest', 'succession', '{"type": "succession_complete", "from": "grassland", "to": "forest"}', 'Ecological succession transforms ecosystems through predictable stages', 4),
('hybrid_creator', 'Hybrid Creator', 'Successfully created a hybrid species', 'genetics', '{"type": "hybrid_created", "count": 1}', 'Hybridization can create novel trait combinations', 3),
('master_ecologist', 'Master Ecologist', 'Completed all basic ecological achievements', 'mastery', '{"type": "achievement_count", "category": "all", "min_count": 15}', 'Deep understanding of ecological principles and interactions', 5);

-- Sample research questions
INSERT OR IGNORE INTO research_questions (id, question, hint, educational_goal, difficulty, category, success_condition) VALUES
('why_no_reproduction', 'Why isn''t Silver Birch reproducing in your ecosystem?', 'Check environmental conditions against species requirements', 'Understand species-specific environmental tolerances', 2, 'observation', '{"type": "reproduction_success", "species": "silver_birch", "duration_ticks": 100}'),
('create_succession', 'Can you guide the succession from grassland to forest?', 'Pioneer species prepare soil and create shade for trees', 'Learn ecological succession stages and mechanisms', 3, 'succession', '{"type": "succession_progress", "target_stage": 0.7, "duration_ticks": 500}'),
('maximize_diversity', 'How many species can coexist in a single ecosystem?', 'Different species occupy different niches', 'Understand niche partitioning and resource competition', 3, 'biodiversity', '{"type": "max_diversity", "min_species": 8, "duration_ticks": 200}'),
('pollinator_impact', 'What happens when pollinator populations decline?', 'Observe insect-pollinated species reproduction rates', 'Learn about pollination mutualisms', 2, 'interactions', '{"type": "pollinator_manipulation", "success_metric": "observed_decline"}'),
('genetic_adaptation', 'Can species adapt to environmental stress through mutation?', 'Expose populations to challenging conditions over many generations', 'Understand natural selection and genetic adaptation', 4, 'genetics', '{"type": "adaptive_mutations", "stress_type": "any", "mutation_count": 3}');
