-- Species Data Initialization
-- Realistic ecological data for simulation

-- VEGETAL SPECIES DATA
-- Pioneer/Early Succession Species
INSERT OR REPLACE INTO vegetal_species (
    id, name, common_name, family, type, succession_stage,
    max_biomass, growth_rate, max_age, reproduction_age, reproduction_need,
    temp_min, temp_max, temp_optimal, moisture_min, moisture_max, moisture_optimal,
    light_min, light_max, light_optimal, shade_tolerance,
    soil_ph_min, soil_ph_max, soil_ph_optimal, nutrient_requirement,
    pollution_tolerance, drought_resistance, cold_hardiness, wind_resistance,
    pollination_type, seed_dispersal, flowering_season, fruit_season,
    allelopathy, nitrogen_fixation, mycorrhizal_association,
    color_primary, color_secondary, height_category
) VALUES
('common_grass', 'Festuca rubra', 'Red Fescue', 'Poaceae', 'grass', 'pioneer',
 0.3, 0.15, 8, 2, 0.3,
 -15.0, 30.0, 18.0, 0.2, 0.9, 0.5,
 0.3, 1.0, 0.8, 0.4,
 5.0, 8.5, 6.8, 0.3,
 0.6, 0.8, 0.9, 0.7,
 'wind', 'wind', 'late spring', 'summer',
 0.1, FALSE, TRUE,
 'green', 'brown', 'ground'),

('pioneer_willow', 'Salix caprea', 'Goat Willow', 'Salicaceae', 'shrub', 'pioneer',
 2.5, 0.25, 25, 3, 0.4,
 -20.0, 25.0, 15.0, 0.4, 1.0, 0.8,
 0.4, 1.0, 0.9, 0.3,
 5.5, 8.0, 6.5, 0.4,
 0.4, 0.6, 0.8, 0.5,
 'insect', 'wind', 'early spring', 'late spring',
 0.0, FALSE, TRUE,
 'gray', 'yellow', 'medium'),

('white_clover', 'Trifolium repens', 'White Clover', 'Fabaceae', 'flower', 'pioneer',
 0.4, 0.2, 5, 1, 0.2,
 -10.0, 28.0, 20.0, 0.3, 0.9, 0.6,
 0.4, 1.0, 0.8, 0.5,
 5.5, 7.5, 6.2, 0.2,
 0.5, 0.7, 0.6, 0.6,
 'insect', 'animal', 'spring', 'autumn',
 0.0, TRUE, TRUE,
 'white', 'green', 'ground'),

-- Early to Mid Succession Species
('silver_birch', 'Betula pendula', 'Silver Birch', 'Betulaceae', 'tree', 'early',
 8.0, 0.3, 80, 10, 0.5,
 -25.0, 25.0, 12.0, 0.3, 0.8, 0.5,
 0.5, 1.0, 0.9, 0.2,
 5.0, 7.5, 6.0, 0.5,
 0.3, 0.5, 0.9, 0.4,
 'wind', 'wind', 'spring', 'autumn',
 0.2, FALSE, TRUE,
 'white', 'green', 'tall'),

('hawthorn', 'Crataegus monogyna', 'Common Hawthorn', 'Rosaceae', 'shrub', 'early',
 4.0, 0.18, 60, 8, 0.6,
 -15.0, 30.0, 18.0, 0.2, 0.8, 0.4,
 0.3, 1.0, 0.7, 0.6,
 6.0, 8.0, 7.0, 0.4,
 0.5, 0.8, 0.7, 0.8,
 'insect', 'animal', 'late spring', 'autumn',
 0.1, FALSE, TRUE,
 'white', 'red', 'medium'),

('bracken_fern', 'Pteridium aquilinum', 'Bracken Fern', 'Dennstaedtiaceae', 'fern', 'early',
 1.2, 0.12, 12, 3, 0.4,
 -5.0, 25.0, 16.0, 0.4, 0.9, 0.7,
 0.2, 0.8, 0.5, 0.8,
 4.5, 7.0, 5.8, 0.3,
 0.2, 0.4, 0.6, 0.3,
 'wind', 'wind', 'none', 'autumn',
 0.4, FALSE, FALSE,
 'green', 'brown', 'low'),

-- Mid to Late Succession Species
('english_oak', 'Quercus robur', 'English Oak', 'Fagaceae', 'tree', 'mid',
 15.0, 0.08, 200, 25, 0.7,
 -20.0, 28.0, 16.0, 0.3, 0.8, 0.5,
 0.4, 1.0, 0.8, 0.4,
 5.5, 7.5, 6.5, 0.6,
 0.2, 0.6, 0.8, 0.7,
 'wind', 'animal', 'late spring', 'autumn',
 0.1, FALSE, TRUE,
 'brown', 'green', 'canopy'),

('beech', 'Fagus sylvatica', 'European Beech', 'Fagaceae', 'tree', 'late',
 18.0, 0.06, 300, 30, 0.8,
 -15.0, 25.0, 14.0, 0.4, 0.8, 0.6,
 0.3, 0.9, 0.6, 0.8,
 6.0, 7.5, 6.8, 0.7,
 0.1, 0.4, 0.7, 0.6,
 'wind', 'animal', 'spring', 'autumn',
 0.3, FALSE, TRUE,
 'gray', 'green', 'canopy'),

('wild_bluebell', 'Hyacinthoides non-scripta', 'Bluebell', 'Asparagaceae', 'flower', 'mid',
 0.6, 0.1, 15, 4, 0.5,
 0.0, 20.0, 12.0, 0.4, 0.8, 0.6,
 0.1, 0.6, 0.3, 0.9,
 5.5, 7.0, 6.2, 0.4,
 0.1, 0.3, 0.8, 0.2,
 'insect', 'animal', 'spring', 'summer',
 0.0, FALSE, TRUE,
 'blue', 'white', 'ground'),

-- Climax/Specialist Species
('scots_pine', 'Pinus sylvestris', 'Scots Pine', 'Pinaceae', 'tree', 'climax',
 12.0, 0.05, 400, 20, 0.9,
 -30.0, 22.0, 10.0, 0.2, 0.7, 0.4,
 0.5, 1.0, 0.9, 0.3,
 4.5, 7.5, 5.5, 0.5,
 0.3, 0.9, 0.9, 0.8,
 'wind', 'wind', 'spring', 'autumn',
 0.2, FALSE, TRUE,
 'brown', 'green', 'canopy'),

('moss_cushion', 'Leucobryum glaucum', 'Cushion Moss', 'Leucobryaceae', 'moss', 'climax',
 0.1, 0.05, 20, 2, 0.6,
 -10.0, 25.0, 15.0, 0.6, 1.0, 0.8,
 0.1, 0.7, 0.4, 0.9,
 4.0, 6.5, 5.0, 0.2,
 0.0, 0.2, 0.8, 0.1,
 'wind', 'wind', 'none', 'none',
 0.0, FALSE, FALSE,
 'green', 'white', 'ground'),

('lady_fern', 'Athyrium filix-femina', 'Lady Fern', 'Athyriaceae', 'fern', 'mid',
 1.8, 0.08, 25, 4, 0.5,
 -15.0, 22.0, 14.0, 0.5, 0.9, 0.7,
 0.1, 0.6, 0.4, 0.9,
 5.0, 7.0, 6.0, 0.3,
 0.1, 0.3, 0.7, 0.2,
 'wind', 'wind', 'none', 'autumn',
 0.0, FALSE, FALSE,
 'green', 'brown', 'low');

-- BIRD SPECIES DATA
INSERT OR REPLACE INTO bird_species (
    id, name, common_name, family, order_name,
    body_mass_g, wingspan_cm, length_cm,
    diet_type, feeding_strategy, social_behavior,
    habitat_type, canopy_preference, territory_size_ha,
    migration_pattern, breeding_season, clutch_size_min, clutch_size_max,
    temp_range_min, temp_range_max, elevation_min_m, elevation_max_m,
    pollinator_effectiveness, seed_dispersal_effectiveness, pest_control_effectiveness,
    abundance_category, conservation_status, activity_period, foraging_time
) VALUES
('robin_european', 'Erithacus rubecula', 'European Robin', 'Muscicapidae', 'Passeriformes',
 18.0, 22.0, 14.0,
 'omnivore', 'ground', 'solitary',
 'forest', 'understory', 0.3,
 'resident', 'spring', 3, 6,
 -15.0, 25.0, 0, 2000,
 0.1, 0.3, 0.7,
 'common', 'LC', 'diurnal', '[6,7,8,16,17,18]'),

('blackbird', 'Turdus merula', 'Common Blackbird', 'Turdidae', 'Passeriformes',
 95.0, 36.0, 25.0,
 'omnivore', 'ground', 'pair',
 'forest', 'ground', 0.2,
 'resident', 'spring', 3, 5,
 -10.0, 30.0, 0, 1500,
 0.0, 0.5, 0.4,
 'abundant', 'LC', 'diurnal', '[5,6,7,8,17,18,19]'),

('blue_tit', 'Cyanistes caeruleus', 'Blue Tit', 'Paridae', 'Passeriformes',
 11.0, 18.0, 12.0,
 'insectivore', 'foliage', 'small_flock',
 'forest', 'midstory', 0.1,
 'resident', 'spring', 7, 12,
 -20.0, 25.0, 0, 1800,
 0.2, 0.1, 0.9,
 'common', 'LC', 'diurnal', '[6,7,8,9,16,17,18]'),

('great_tit', 'Parus major', 'Great Tit', 'Paridae', 'Passeriformes',
 20.0, 24.0, 14.0,
 'omnivore', 'foliage', 'small_flock',
 'forest', 'midstory', 0.15,
 'resident', 'spring', 5, 12,
 -25.0, 30.0, 0, 2200,
 0.1, 0.2, 0.8,
 'common', 'LC', 'diurnal', '[6,7,8,9,16,17,18]'),

('chaffinch', 'Fringilla coelebs', 'Common Chaffinch', 'Fringillidae', 'Passeriformes',
 24.0, 26.0, 15.0,
 'granivore', 'mixed', 'small_flock',
 'forest', 'canopy', 0.2,
 'short_distance', 'spring', 3, 6,
 -15.0, 28.0, 0, 2000,
 0.0, 0.4, 0.3,
 'common', 'LC', 'diurnal', '[6,7,8,16,17,18]'),

('wren', 'Troglodytes troglodytes', 'Eurasian Wren', 'Troglodytidae', 'Passeriformes',
 10.0, 15.0, 9.5,
 'insectivore', 'foliage', 'solitary',
 'forest', 'understory', 0.05,
 'resident', 'spring', 5, 8,
 -20.0, 20.0, 0, 2500,
 0.0, 0.1, 0.8,
 'common', 'LC', 'diurnal', '[5,6,7,8,17,18,19]'),

('wood_pigeon', 'Columba palumbus', 'Common Wood Pigeon', 'Columbidae', 'Columbiformes',
 520.0, 78.0, 42.0,
 'herbivore', 'foliage', 'small_flock',
 'forest', 'canopy', 2.0,
 'short_distance', 'spring', 1, 3,
 -5.0, 30.0, 0, 1200,
 0.0, 0.8, 0.1,
 'common', 'LC', 'diurnal', '[7,8,9,16,17,18]'),

('goldfinch', 'Carduelis carduelis', 'European Goldfinch', 'Fringillidae', 'Passeriformes',
 16.0, 23.0, 12.0,
 'granivore', 'foliage', 'small_flock',
 'mixed', 'midstory', 0.1,
 'short_distance', 'spring', 4, 6,
 -10.0, 25.0, 0, 1500,
 0.3, 0.6, 0.2,
 'common', 'LC', 'diurnal', '[7,8,9,15,16,17]'),

('nuthatch', 'Sitta europaea', 'Eurasian Nuthatch', 'Sittidae', 'Passeriformes',
 23.0, 27.0, 14.0,
 'omnivore', 'bark', 'pair',
 'forest', 'midstory', 0.8,
 'resident', 'spring', 5, 9,
 -20.0, 20.0, 0, 2000,
 0.0, 0.3, 0.6,
 'common', 'LC', 'diurnal', '[6,7,8,16,17,18]'),

('jay', 'Garrulus glandarius', 'Eurasian Jay', 'Corvidae', 'Passeriformes',
 170.0, 55.0, 34.0,
 'omnivore', 'mixed', 'pair',
 'forest', 'canopy', 5.0,
 'resident', 'spring', 3, 7,
 -15.0, 25.0, 0, 1800,
 0.0, 0.9, 0.4,
 'uncommon', 'LC', 'diurnal', '[6,7,8,9,16,17]'),

('greenfinch', 'Chloris chloris', 'European Greenfinch', 'Fringillidae', 'Passeriformes',
 28.0, 27.0, 15.0,
 'granivore', 'foliage', 'small_flock',
 'mixed', 'midstory', 0.3,
 'short_distance', 'spring', 3, 6,
 -10.0, 28.0, 0, 1600,
 0.1, 0.5, 0.2,
 'common', 'LC', 'diurnal', '[7,8,9,15,16,17]'),

('song_thrush', 'Turdus philomelos', 'Song Thrush', 'Turdidae', 'Passeriformes',
 75.0, 33.0, 23.0,
 'omnivore', 'ground', 'solitary',
 'forest', 'ground', 0.4,
 'short_distance', 'spring', 3, 6,
 -5.0, 25.0, 0, 1500,
 0.0, 0.4, 0.6,
 'common', 'LC', 'diurnal', '[5,6,7,18,19,20]');

-- SIMULATION OVERRIDES (optional)
INSERT OR REPLACE INTO simulation_species_overrides (
  species_id, seed_production, reproduction_threshold, seed_maturity_ticks, dispersal_range, reproduction_seasons, rarity
) VALUES
('common_grass', 120, 0.05, 0, 2.0, '["spring","summer","autumn"]', 'common');

-- SPECIES INTERACTIONS DATA
-- Pollination relationships
INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
('white_clover', 'vegetal', 'blue_tit', 'bird', 'pollination', 0.3, 'Occasional nectar feeding'),
('hawthorn', 'vegetal', 'blue_tit', 'bird', 'pollination', 0.6, 'Important spring nectar source'),
('hawthorn', 'vegetal', 'great_tit', 'bird', 'pollination', 0.4, 'Spring flowering period overlap'),
('wild_bluebell', 'vegetal', 'goldfinch', 'bird', 'pollination', 0.5, 'Early spring nectar'),
('goldfinch', 'bird', 'white_clover', 'vegetal', 'pollination', 0.7, 'Primary food source in summer');

-- Seed dispersal relationships  
INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
('hawthorn', 'vegetal', 'blackbird', 'bird', 'seed_dispersal', 0.8, 'Primary disperser of hawthorn berries'),
('hawthorn', 'vegetal', 'robin_european', 'bird', 'seed_dispersal', 0.6, 'Secondary disperser'),
('hawthorn', 'vegetal', 'song_thrush', 'bird', 'seed_dispersal', 0.7, 'Important autumn disperser'),
('english_oak', 'vegetal', 'jay', 'bird', 'seed_dispersal', 0.9, 'Primary acorn disperser and cacher'),
('beech', 'vegetal', 'jay', 'bird', 'seed_dispersal', 0.8, 'Important beechnut disperser'),
('wood_pigeon', 'bird', 'english_oak', 'vegetal', 'seed_dispersal', 0.6, 'Long-distance acorn dispersal');

-- Nesting relationships
INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
('hawthorn', 'vegetal', 'robin_european', 'bird', 'nesting', 0.7, 'Dense thorny branches provide protection'),
('silver_birch', 'vegetal', 'blue_tit', 'bird', 'nesting', 0.5, 'Cavity nesting in older trees'),
('english_oak', 'vegetal', 'blue_tit', 'bird', 'nesting', 0.8, 'Primary nesting tree'),
('english_oak', 'vegetal', 'great_tit', 'bird', 'nesting', 0.8, 'Cavity nesting preference'),
('english_oak', 'vegetal', 'nuthatch', 'bird', 'nesting', 0.9, 'Specialized cavity nester'),
('scots_pine', 'vegetal', 'chaffinch', 'bird', 'nesting', 0.6, 'Conifer nesting preference');

-- Feeding relationships (pest control)
INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
('english_oak', 'vegetal', 'blue_tit', 'bird', 'feeding', 0.9, 'Caterpillar control during breeding'),
('english_oak', 'vegetal', 'great_tit', 'bird', 'feeding', 0.8, 'Insect pest management'),
('silver_birch', 'vegetal', 'blue_tit', 'bird', 'feeding', 0.7, 'Aphid and small insect control'),
('bracken_fern', 'vegetal', 'wren', 'bird', 'feeding', 0.6, 'Ground insect foraging'),
('common_grass', 'vegetal', 'chaffinch', 'bird', 'feeding', 0.5, 'Seed feeding relationship'),
('common_grass', 'vegetal', 'goldfinch', 'bird', 'feeding', 0.7, 'Primary seed source'),
('common_grass', 'vegetal', 'greenfinch', 'bird', 'feeding', 0.6, 'Grass seed specialist');

-- BIOME ASSOCIATIONS
-- Forest biome associations
INSERT INTO biome_associations (species_id, species_type, biome_type, abundance_weight) VALUES
-- Vegetal species in forest
('english_oak', 'vegetal', 'temperate_forest', 2.0),
('beech', 'vegetal', 'temperate_forest', 1.8),
('silver_birch', 'vegetal', 'temperate_forest', 1.5),
('hawthorn', 'vegetal', 'temperate_forest', 1.2),
('wild_bluebell', 'vegetal', 'temperate_forest', 1.5),
('bracken_fern', 'vegetal', 'temperate_forest', 1.3),
('lady_fern', 'vegetal', 'temperate_forest', 1.1),
('moss_cushion', 'vegetal', 'temperate_forest', 1.0),
('scots_pine', 'vegetal', 'coniferous_forest', 2.0),
-- Bird species in forest  
('robin_european', 'bird', 'temperate_forest', 1.8),
('blackbird', 'bird', 'temperate_forest', 1.6),
('blue_tit', 'bird', 'temperate_forest', 2.0),
('great_tit', 'bird', 'temperate_forest', 1.8),
('wren', 'bird', 'temperate_forest', 1.5),
('nuthatch', 'bird', 'temperate_forest', 1.2),
('jay', 'bird', 'temperate_forest', 1.0),
('song_thrush', 'bird', 'temperate_forest', 1.4);

-- Grassland biome associations
INSERT INTO biome_associations (species_id, species_type, biome_type, abundance_weight) VALUES
-- Vegetal species in grassland
('common_grass', 'vegetal', 'grassland', 2.5),
('white_clover', 'vegetal', 'grassland', 2.0),
('pioneer_willow', 'vegetal', 'grassland', 0.8),
('hawthorn', 'vegetal', 'grassland', 0.6),
-- Bird species in grassland
('chaffinch', 'bird', 'grassland', 1.8),
('goldfinch', 'bird', 'grassland', 2.0),
('greenfinch', 'bird', 'grassland', 1.8),
('wood_pigeon', 'bird', 'grassland', 1.2);

-- Mixed/Edge habitat associations  
INSERT INTO biome_associations (species_id, species_type, biome_type, abundance_weight) VALUES
-- Edge species
('hawthorn', 'vegetal', 'forest_edge', 2.0),
('silver_birch', 'vegetal', 'forest_edge', 1.8),
('pioneer_willow', 'vegetal', 'forest_edge', 1.5),
('white_clover', 'vegetal', 'forest_edge', 1.2),
('robin_european', 'bird', 'forest_edge', 1.6),
('blackbird', 'bird', 'forest_edge', 1.8),
('chaffinch', 'bird', 'forest_edge', 1.4),
('goldfinch', 'bird', 'forest_edge', 1.6);
