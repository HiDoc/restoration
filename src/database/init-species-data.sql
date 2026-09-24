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
 'insect', 'animal', 'late spring-summer', 'summer-autumn',
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
 'green', 'brown', 'low'),

-- Congeners of the plants above. Species of one genus can hybridise, as these pairs do in the wild.
('spanish_bluebell', 'Hyacinthoides hispanica', 'Spanish Bluebell', 'Asparagaceae', 'flower', 'mid',
 0.7, 0.13, 15, 4, 0.45,
 -5.0, 25.0, 14.0, 0.3, 0.8, 0.5,
 0.2, 0.9, 0.5, 0.7,
 5.0, 7.5, 6.3, 0.4,
 0.2, 0.5, 0.6, 0.3,
 'insect', 'animal', 'spring', 'summer',
 0.0, FALSE, TRUE,
 'blue', 'white', 'ground'),

('midland_hawthorn', 'Crataegus laevigata', 'Midland Hawthorn', 'Rosaceae', 'shrub', 'early',
 3.5, 0.15, 60, 8, 0.6,
 -15.0, 28.0, 17.0, 0.3, 0.9, 0.5,
 0.2, 1.0, 0.6, 0.7,
 5.5, 8.0, 6.8, 0.5,
 0.4, 0.6, 0.7, 0.7,
 'insect', 'animal', 'spring', 'autumn',
 0.1, FALSE, TRUE,
 'white', 'red', 'medium'),

('downy_birch', 'Betula pubescens', 'Downy Birch', 'Betulaceae', 'tree', 'early',
 7.0, 0.28, 80, 10, 0.5,
 -30.0, 22.0, 11.0, 0.5, 1.0, 0.75,
 0.5, 1.0, 0.9, 0.2,
 3.5, 7.0, 5.5, 0.4,
 0.3, 0.3, 1.0, 0.5,
 'wind', 'wind', 'spring', 'autumn',
 0.2, FALSE, TRUE,
 'white', 'green', 'tall'),

('sessile_oak', 'Quercus petraea', 'Sessile Oak', 'Fagaceae', 'tree', 'mid',
 14.0, 0.07, 250, 30, 0.7,
 -20.0, 27.0, 15.0, 0.2, 0.7, 0.45,
 0.4, 1.0, 0.8, 0.4,
 4.0, 7.0, 5.5, 0.5,
 0.2, 0.7, 0.8, 0.7,
 'wind', 'animal', 'late spring', 'autumn',
 0.1, FALSE, TRUE,
 'brown', 'green', 'canopy');

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

-- Spring ephemerals: flower and set seed in spring, then die back to a dormant bulb until late winter.
UPDATE vegetal_species SET fruit_season = 'late spring', dormant_season = 'summer-autumn' WHERE id IN ('wild_bluebell', 'spanish_bluebell');

-- Vegetative spread: how each plant makes new shoots without seed.
UPDATE vegetal_species SET clonal_method = 'rhizome' WHERE id IN ('common_grass', 'bracken_fern');
UPDATE vegetal_species SET clonal_method = 'stolon' WHERE id = 'white_clover';
UPDATE vegetal_species SET clonal_method = 'bulb' WHERE id IN ('wild_bluebell', 'spanish_bluebell');

-- Flood tolerance: how long roots survive under standing water. Willows, downy birch and pedunculate oak
-- grow on floodplains and wet heath; beech and bracken die in waterlogged ground.
UPDATE vegetal_species SET flood_tolerance = 0.6 WHERE id IN ('pioneer_willow', 'downy_birch');
UPDATE vegetal_species SET flood_tolerance = 0.5 WHERE id = 'english_oak';
UPDATE vegetal_species SET flood_tolerance = 0.4 WHERE id = 'lady_fern';
UPDATE vegetal_species SET flood_tolerance = 0.3 WHERE id IN ('common_grass', 'moss_cushion');
UPDATE vegetal_species SET flood_tolerance = 0.2 WHERE id IN ('silver_birch', 'white_clover', 'hawthorn', 'midland_hawthorn');
UPDATE vegetal_species SET flood_tolerance = 0.1 WHERE id IN ('wild_bluebell', 'spanish_bluebell', 'sessile_oak', 'scots_pine');

-- SIMULATION OVERRIDES (optional)
INSERT OR REPLACE INTO simulation_species_overrides (
  species_id, seed_production, reproduction_threshold, seed_maturity_ticks, dispersal_range, reproduction_seasons, rarity
) VALUES
('common_grass', 40, 0.05, 0, 2.0, '["spring","summer","autumn"]', 'common');

-- SPECIES INTERACTIONS DATA
-- POLLINATOR SPECIES DATA
INSERT OR REPLACE INTO pollinator_species (
    id, name, common_name, pollinator_group, flight_seasons, temp_min, temp_max, pollution_tolerance, foraging_range
) VALUES
('buff_tailed_bumblebee', 'Bombus terrestris', 'Buff-tailed Bumblebee', 'bee', '["spring","summer","autumn"]', 6.0, 32.0, 0.5, 2),
('red_mason_bee', 'Osmia bicornis', 'Red Mason Bee', 'bee', '["spring"]', 10.0, 30.0, 0.4, 1),
('common_blue', 'Polyommatus icarus', 'Common Blue', 'butterfly', '["spring","summer"]', 13.0, 32.0, 0.3, 1),
('marmalade_hoverfly', 'Episyrphus balteatus', 'Marmalade Hoverfly', 'hoverfly', '["spring","summer","autumn"]', 10.0, 30.0, 0.6, 3);

-- Pollination relationships (species_a = plant, species_b = pollinator)
INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
('white_clover', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.8, 'Major summer nectar and pollen source'),
('white_clover', 'vegetal', 'common_blue', 'pollinator', 'pollination', 0.5, 'Adults take nectar from clover flowers'),
('white_clover', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.3, 'Visits open clover heads'),
('wild_bluebell', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.7, 'Key early nectar for queens'),
('pioneer_willow', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.6, 'Catkins give queens their first pollen of the year'),
('pioneer_willow', 'vegetal', 'red_mason_bee', 'pollinator', 'pollination', 0.6, 'Early spring pollen for nest provisioning'),
('hawthorn', 'vegetal', 'red_mason_bee', 'pollinator', 'pollination', 0.6, 'Pollinates hawthorn blossom in late spring'),
('hawthorn', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.5, 'Feeds on the open, shallow flowers'),
('hawthorn', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Visits blossom alongside solitary bees'),
('spanish_bluebell', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.6, 'Open, upright bells are easy for bumblebees to work'),
('midland_hawthorn', 'vegetal', 'red_mason_bee', 'pollinator', 'pollination', 0.6, 'Flowers a week before common hawthorn'),
('midland_hawthorn', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.4, 'Feeds on the open flowers');

-- Larval host relationships (species_b caterpillars feed on species_a)
INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
('white_clover', 'vegetal', 'common_blue', 'pollinator', 'larval_host', 0.4, 'Caterpillars eat clovers; bird''s-foot trefoil is preferred where present');

-- Seed dispersal relationships  
INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
('hawthorn', 'vegetal', 'blackbird', 'bird', 'seed_dispersal', 0.8, 'Primary disperser of hawthorn berries'),
('hawthorn', 'vegetal', 'robin_european', 'bird', 'seed_dispersal', 0.6, 'Secondary disperser'),
('hawthorn', 'vegetal', 'song_thrush', 'bird', 'seed_dispersal', 0.7, 'Important autumn disperser'),
('english_oak', 'vegetal', 'jay', 'bird', 'seed_dispersal', 0.9, 'Primary acorn disperser and cacher'),
('beech', 'vegetal', 'jay', 'bird', 'seed_dispersal', 0.8, 'Important beechnut disperser'),
('midland_hawthorn', 'vegetal', 'blackbird', 'bird', 'seed_dispersal', 0.7, 'Eats the haws like those of common hawthorn'),
('midland_hawthorn', 'vegetal', 'song_thrush', 'bird', 'seed_dispersal', 0.6, 'Autumn disperser'),
('sessile_oak', 'vegetal', 'jay', 'bird', 'seed_dispersal', 0.9, 'Caches acorns as it does those of English oak');

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
('common_grass', 'vegetal', 'greenfinch', 'bird', 'feeding', 0.6, 'Grass seed specialist'),
('hawthorn', 'vegetal', 'blue_tit', 'bird', 'feeding', 0.4, 'Forages insects among the blossom'),
('english_oak', 'vegetal', 'wood_pigeon', 'bird', 'feeding', 0.6, 'Eats acorns but digests the seed, so a predator rather than a disperser'),
('sessile_oak', 'vegetal', 'blue_tit', 'bird', 'feeding', 0.8, 'Caterpillars on the spring leaves feed its chicks'),
('sessile_oak', 'vegetal', 'wood_pigeon', 'bird', 'feeding', 0.5, 'Eats acorns'),
('downy_birch', 'vegetal', 'blue_tit', 'bird', 'feeding', 0.6, 'Aphids and small insects in the canopy');

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
('sessile_oak', 'vegetal', 'temperate_forest', 1.8),
('downy_birch', 'vegetal', 'temperate_forest', 1.2),
('midland_hawthorn', 'vegetal', 'temperate_forest', 1.5),
('spanish_bluebell', 'vegetal', 'forest_edge', 1.2),
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

-- ============================================================================
-- MEADOW, WOODLAND AND WETLAND FLORA
-- Real species with values from their ecology. Congeners are added only where they hybridise in the wild,
-- because the game crosses any two species of one genus: Primrose × Cowslip gives the false oxlip
-- (Primula × polyantha), Grey × Goat Willow gives Salix × reichardtii.
-- An annual (Yellow Rattle) has reproduction_age 0: it flowers in the year it germinates.
-- ============================================================================
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
-- Meadow
('common_knapweed', 'Centaurea nigra', 'Common Knapweed', 'Asteraceae', 'flower', 'early',
 0.5, 0.14, 10, 2, 0.35,  -15.0, 30.0, 18.0, 0.2, 0.8, 0.45,  0.4, 1.0, 0.85, 0.3,  5.0, 8.0, 6.5, 0.35,
 0.4, 0.7, 0.8, 0.6,  'insect', 'wind', 'summer', 'autumn',  0.0, FALSE, TRUE,  'purple', 'green', 'low'),
('birds_foot_trefoil', 'Lotus corniculatus', 'Bird''s-foot Trefoil', 'Fabaceae', 'flower', 'pioneer',
 0.25, 0.12, 8, 1, 0.3,  -15.0, 30.0, 18.0, 0.15, 0.75, 0.4,  0.5, 1.0, 0.9, 0.2,  5.0, 8.5, 6.8, 0.15,
 0.4, 0.8, 0.8, 0.6,  'insect', 'ballistic', 'late spring-summer', 'summer',  0.0, TRUE, TRUE,  'yellow', 'red', 'ground'),
('oxeye_daisy', 'Leucanthemum vulgare', 'Oxeye Daisy', 'Asteraceae', 'flower', 'pioneer',
 0.3, 0.16, 5, 1, 0.3,  -15.0, 30.0, 18.0, 0.2, 0.8, 0.45,  0.5, 1.0, 0.9, 0.2,  5.5, 8.0, 6.8, 0.3,
 0.5, 0.6, 0.8, 0.6,  'insect', 'wind', 'late spring-summer', 'summer',  0.0, FALSE, TRUE,  'white', 'yellow', 'low'),
('yellow_rattle', 'Rhinanthus minor', 'Yellow Rattle', 'Orobanchaceae', 'flower', 'pioneer',
 0.15, 0.2, 1, 0, 0.25,  -15.0, 28.0, 17.0, 0.2, 0.7, 0.45,  0.5, 1.0, 0.9, 0.2,  5.5, 8.0, 6.8, 0.2,
 0.3, 0.5, 0.8, 0.5,  'insect', 'gravity', 'late spring-summer', 'summer',  0.3, FALSE, FALSE,  'yellow', 'green', 'low'),
('meadow_buttercup', 'Ranunculus acris', 'Meadow Buttercup', 'Ranunculaceae', 'flower', 'pioneer',
 0.3, 0.15, 6, 1, 0.3,  -20.0, 28.0, 16.0, 0.3, 0.9, 0.55,  0.4, 1.0, 0.85, 0.35,  5.0, 7.5, 6.3, 0.4,
 0.4, 0.4, 0.9, 0.6,  'insect', 'gravity', 'late spring-summer', 'summer',  0.1, FALSE, TRUE,  'yellow', 'green', 'low'),
('common_sorrel', 'Rumex acetosa', 'Common Sorrel', 'Polygonaceae', 'flower', 'pioneer',
 0.35, 0.15, 6, 1, 0.3,  -20.0, 28.0, 15.0, 0.3, 0.85, 0.55,  0.4, 1.0, 0.8, 0.35,  4.5, 7.5, 6.0, 0.4,
 0.5, 0.5, 0.9, 0.6,  'wind', 'wind', 'late spring-summer', 'summer',  0.0, FALSE, FALSE,  'red', 'green', 'low'),
('yarrow', 'Achillea millefolium', 'Yarrow', 'Asteraceae', 'flower', 'pioneer',
 0.3, 0.15, 10, 1, 0.25,  -25.0, 32.0, 18.0, 0.1, 0.7, 0.35,  0.5, 1.0, 0.9, 0.2,  5.0, 8.5, 6.8, 0.25,
 0.6, 0.85, 0.9, 0.7,  'insect', 'wind', 'summer', 'autumn',  0.2, FALSE, TRUE,  'white', 'green', 'low'),
('cowslip', 'Primula veris', 'Cowslip', 'Primulaceae', 'flower', 'mid',
 0.15, 0.08, 20, 3, 0.4,  -20.0, 26.0, 14.0, 0.25, 0.7, 0.45,  0.4, 1.0, 0.8, 0.4,  6.0, 8.5, 7.2, 0.3,
 0.2, 0.6, 0.9, 0.5,  'insect', 'gravity', 'spring', 'summer',  0.0, FALSE, TRUE,  'yellow', 'green', 'ground'),
-- Woodland
('primrose', 'Primula vulgaris', 'Primrose', 'Primulaceae', 'flower', 'mid',
 0.15, 0.08, 20, 3, 0.4,  -15.0, 24.0, 13.0, 0.4, 0.85, 0.6,  0.15, 0.8, 0.4, 0.8,  5.0, 8.0, 6.5, 0.4,
 0.2, 0.3, 0.8, 0.4,  'insect', 'animal', 'early spring', 'late spring',  0.0, FALSE, TRUE,  'yellow', 'green', 'ground'),
('wood_anemone', 'Anemone nemorosa', 'Wood Anemone', 'Ranunculaceae', 'flower', 'climax',
 0.1, 0.07, 30, 4, 0.5,  -20.0, 22.0, 12.0, 0.4, 0.85, 0.6,  0.1, 0.8, 0.4, 0.9,  4.5, 7.5, 6.0, 0.4,
 0.1, 0.3, 0.9, 0.3,  'insect', 'gravity', 'spring', 'late spring',  0.1, FALSE, TRUE,  'white', 'pink', 'ground'),
('hazel', 'Corylus avellana', 'Hazel', 'Betulaceae', 'shrub', 'early',
 4.0, 0.2, 80, 7, 0.5,  -20.0, 28.0, 14.0, 0.3, 0.8, 0.55,  0.2, 1.0, 0.6, 0.6,  5.0, 8.0, 6.5, 0.5,
 0.3, 0.5, 0.9, 0.7,  'wind', 'animal', 'early spring', 'autumn',  0.0, FALSE, TRUE,  'brown', 'green', 'medium'),
('holly', 'Ilex aquifolium', 'Holly', 'Aquifoliaceae', 'shrub', 'mid',
 5.0, 0.08, 200, 12, 0.6,  -15.0, 28.0, 13.0, 0.3, 0.8, 0.55,  0.1, 1.0, 0.4, 0.9,  4.5, 7.5, 6.0, 0.4,
 0.4, 0.6, 0.7, 0.8,  'insect', 'animal', 'late spring', 'autumn',  0.0, FALSE, TRUE,  'green', 'red', 'medium'),
('honeysuckle', 'Lonicera periclymenum', 'Honeysuckle', 'Caprifoliaceae', 'shrub', 'mid',
 1.5, 0.18, 40, 4, 0.45,  -15.0, 28.0, 15.0, 0.3, 0.8, 0.5,  0.2, 1.0, 0.6, 0.7,  4.5, 7.5, 6.0, 0.4,
 0.3, 0.5, 0.8, 0.6,  'insect', 'animal', 'summer', 'autumn',  0.0, FALSE, TRUE,  'cream', 'red', 'medium'),
('dog_violet', 'Viola riviniana', 'Common Dog-violet', 'Violaceae', 'flower', 'mid',
 0.08, 0.1, 10, 1, 0.35,  -20.0, 25.0, 14.0, 0.3, 0.8, 0.5,  0.2, 1.0, 0.5, 0.7,  4.5, 8.0, 6.3, 0.3,
 0.3, 0.5, 0.9, 0.4,  'insect', 'ballistic', 'spring', 'late spring',  0.0, FALSE, TRUE,  'violet', 'green', 'ground'),
('bramble', 'Rubus fruticosus', 'Bramble', 'Rosaceae', 'shrub', 'early',
 2.0, 0.3, 20, 2, 0.4,  -15.0, 30.0, 16.0, 0.2, 0.85, 0.5,  0.2, 1.0, 0.7, 0.6,  4.5, 8.0, 6.5, 0.5,
 0.6, 0.6, 0.8, 0.7,  'insect', 'animal', 'summer', 'late summer-autumn',  0.1, FALSE, TRUE,  'white', 'black', 'medium'),
-- Wetland
('alder', 'Alnus glutinosa', 'Alder', 'Betulaceae', 'tree', 'early',
 9.0, 0.25, 100, 10, 0.5,  -25.0, 26.0, 13.0, 0.6, 1.0, 0.85,  0.4, 1.0, 0.8, 0.3,  5.0, 7.5, 6.3, 0.3,
 0.3, 0.2, 0.9, 0.6,  'wind', 'water', 'early spring', 'autumn',  0.0, TRUE, TRUE,  'green', 'brown', 'tall'),
('marsh_marigold', 'Caltha palustris', 'Marsh Marigold', 'Ranunculaceae', 'flower', 'pioneer',
 0.3, 0.12, 15, 2, 0.35,  -25.0, 25.0, 13.0, 0.7, 1.0, 0.9,  0.3, 1.0, 0.7, 0.5,  5.0, 8.0, 6.5, 0.5,
 0.3, 0.1, 1.0, 0.5,  'insect', 'water', 'spring', 'late spring',  0.1, FALSE, FALSE,  'yellow', 'green', 'low'),
('yellow_flag', 'Iris pseudacorus', 'Yellow Flag', 'Iridaceae', 'flower', 'early',
 0.8, 0.15, 20, 2, 0.4,  -15.0, 28.0, 16.0, 0.7, 1.0, 0.95,  0.3, 1.0, 0.8, 0.4,  5.0, 8.0, 6.5, 0.5,
 0.6, 0.2, 0.8, 0.6,  'insect', 'water', 'late spring-summer', 'autumn',  0.0, FALSE, FALSE,  'yellow', 'green', 'medium'),
('purple_loosestrife', 'Lythrum salicaria', 'Purple Loosestrife', 'Lythraceae', 'flower', 'early',
 0.7, 0.18, 15, 1, 0.35,  -20.0, 30.0, 18.0, 0.6, 1.0, 0.85,  0.4, 1.0, 0.9, 0.3,  5.0, 8.0, 6.5, 0.5,
 0.5, 0.3, 0.9, 0.6,  'insect', 'water', 'summer', 'autumn',  0.0, FALSE, FALSE,  'purple', 'green', 'medium'),
('meadowsweet', 'Filipendula ulmaria', 'Meadowsweet', 'Rosaceae', 'flower', 'early',
 0.8, 0.18, 15, 2, 0.35,  -25.0, 28.0, 16.0, 0.55, 1.0, 0.8,  0.3, 1.0, 0.8, 0.4,  5.0, 8.0, 6.5, 0.5,
 0.4, 0.2, 0.9, 0.6,  'insect', 'water', 'summer', 'autumn',  0.1, FALSE, TRUE,  'cream', 'green', 'medium'),
('ragged_robin', 'Silene flos-cuculi', 'Ragged-Robin', 'Caryophyllaceae', 'flower', 'early',
 0.2, 0.12, 5, 1, 0.35,  -20.0, 26.0, 15.0, 0.55, 1.0, 0.8,  0.4, 1.0, 0.85, 0.3,  5.0, 7.5, 6.3, 0.35,
 0.2, 0.2, 0.9, 0.5,  'insect', 'gravity', 'late spring-summer', 'summer',  0.0, FALSE, FALSE,  'pink', 'green', 'low'),
('grey_willow', 'Salix cinerea', 'Grey Willow', 'Salicaceae', 'shrub', 'pioneer',
 3.0, 0.28, 30, 3, 0.4,  -25.0, 25.0, 14.0, 0.5, 1.0, 0.85,  0.4, 1.0, 0.9, 0.3,  4.5, 8.0, 6.3, 0.4,
 0.4, 0.4, 0.9, 0.5,  'insect', 'wind', 'early spring', 'late spring',  0.0, FALSE, TRUE,  'gray', 'yellow', 'medium'),
('cuckooflower', 'Cardamine pratensis', 'Cuckooflower', 'Brassicaceae', 'flower', 'pioneer',
 0.12, 0.12, 5, 1, 0.3,  -20.0, 25.0, 14.0, 0.5, 1.0, 0.8,  0.3, 1.0, 0.8, 0.4,  5.0, 8.0, 6.5, 0.4,
 0.3, 0.2, 0.9, 0.4,  'insect', 'ballistic', 'spring', 'late spring',  0.0, FALSE, FALSE,  'pink', 'white', 'ground'),
('alder_buckthorn', 'Frangula alnus', 'Alder Buckthorn', 'Rhamnaceae', 'shrub', 'early',
 3.0, 0.18, 60, 5, 0.45,  -25.0, 26.0, 14.0, 0.4, 1.0, 0.75,  0.2, 1.0, 0.6, 0.6,  4.0, 7.5, 5.5, 0.3,
 0.3, 0.3, 0.9, 0.6,  'insect', 'animal', 'late spring-summer', 'autumn',  0.0, FALSE, TRUE,  'green', 'black', 'medium'),
-- Edges: the larval food of Peacock and Small Tortoiseshell
('common_nettle', 'Urtica dioica', 'Common Nettle', 'Urticaceae', 'flower', 'pioneer',
 0.8, 0.3, 10, 1, 0.35,  -20.0, 28.0, 17.0, 0.4, 0.9, 0.65,  0.2, 1.0, 0.6, 0.6,  5.5, 8.0, 6.8, 0.8,
 0.6, 0.3, 0.9, 0.6,  'wind', 'wind', 'summer', 'autumn',  0.0, FALSE, FALSE,  'green', 'green', 'medium');

-- Wood Anemone dies back by midsummer; plants that spread by rhizome or rooting stems.
UPDATE vegetal_species SET dormant_season = 'summer-autumn' WHERE id = 'wood_anemone';
UPDATE vegetal_species SET clonal_method = 'rhizome' WHERE id IN ('yarrow', 'wood_anemone', 'yellow_flag', 'meadowsweet', 'common_nettle');
UPDATE vegetal_species SET clonal_method = 'stolon' WHERE id = 'bramble';

-- Flood tolerance for the new flora: marsh plants root in standing water; meadow and woodland plants do not.
UPDATE vegetal_species SET flood_tolerance = 1.0 WHERE id = 'yellow_flag';
UPDATE vegetal_species SET flood_tolerance = 0.9 WHERE id IN ('alder', 'marsh_marigold');
UPDATE vegetal_species SET flood_tolerance = 0.8 WHERE id IN ('purple_loosestrife', 'grey_willow');
UPDATE vegetal_species SET flood_tolerance = 0.7 WHERE id = 'meadowsweet';
UPDATE vegetal_species SET flood_tolerance = 0.6 WHERE id IN ('ragged_robin', 'cuckooflower', 'alder_buckthorn');
UPDATE vegetal_species SET flood_tolerance = 0.4 WHERE id = 'meadow_buttercup';
UPDATE vegetal_species SET flood_tolerance = 0.3 WHERE id = 'common_nettle';
UPDATE vegetal_species SET flood_tolerance = 0.2 WHERE id IN ('common_sorrel', 'primrose', 'wood_anemone', 'hazel', 'bramble');
UPDATE vegetal_species SET flood_tolerance = 0.1 WHERE id IN ('common_knapweed', 'birds_foot_trefoil', 'oxeye_daisy', 'yellow_rattle', 'yarrow', 'cowslip', 'holly', 'honeysuckle', 'dog_violet');

INSERT OR REPLACE INTO pollinator_species (
    id, name, common_name, pollinator_group, flight_seasons, temp_min, temp_max, pollution_tolerance, foraging_range
) VALUES
('red_tailed_bumblebee', 'Bombus lapidarius', 'Red-tailed Bumblebee', 'bee', '["spring","summer","autumn"]', 8.0, 32.0, 0.5, 2),
('common_carder_bee', 'Bombus pascuorum', 'Common Carder Bee', 'bee', '["spring","summer","autumn"]', 6.0, 32.0, 0.5, 2),
('tawny_mining_bee', 'Andrena fulva', 'Tawny Mining Bee', 'bee', '["spring"]', 10.0, 28.0, 0.4, 1),
('meadow_brown', 'Maniola jurtina', 'Meadow Brown', 'butterfly', '["summer"]', 13.0, 32.0, 0.5, 1),
('orange_tip', 'Anthocharis cardamines', 'Orange-tip', 'butterfly', '["spring"]', 12.0, 30.0, 0.4, 1),
('small_copper', 'Lycaena phlaeas', 'Small Copper', 'butterfly', '["spring","summer","autumn"]', 13.0, 32.0, 0.4, 1),
('brimstone', 'Gonepteryx rhamni', 'Brimstone', 'butterfly', '["spring","summer","autumn"]', 10.0, 32.0, 0.4, 2),
('peacock', 'Aglais io', 'Peacock', 'butterfly', '["spring","summer","autumn"]', 12.0, 32.0, 0.5, 2),
('silver_washed_fritillary', 'Argynnis paphia', 'Silver-washed Fritillary', 'butterfly', '["summer"]', 15.0, 32.0, 0.3, 2),
('six_spot_burnet', 'Zygaena filipendulae', 'Six-spot Burnet', 'moth', '["summer"]', 14.0, 32.0, 0.4, 1),
('drone_fly', 'Eristalis tenax', 'Drone Fly', 'hoverfly', '["spring","summer","autumn"]', 8.0, 32.0, 0.7, 2);

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
('siskin', 'Spinus spinus', 'Eurasian Siskin', 'Fringillidae', 'Passeriformes',
 12.0, 21.0, 12.0,  'granivore', 'foliage', 'small_flock',  'forest', 'canopy', 0.5,
 'short_distance', 'spring', 3, 5,  -20.0, 25.0, 0, 2000,  0.0, 0.3, 0.2,  'common', 'LC', 'diurnal', '[7,8,9,15,16,17]'),
('reed_bunting', 'Emberiza schoeniclus', 'Common Reed Bunting', 'Emberizidae', 'Passeriformes',
 19.0, 24.0, 15.0,  'granivore', 'ground', 'pair',  'wetland', 'ground', 0.5,
 'resident', 'spring', 4, 5,  -15.0, 28.0, 0, 1500,  0.0, 0.3, 0.3,  'common', 'LC', 'diurnal', '[6,7,8,16,17,18]'),
('reed_warbler', 'Acrocephalus scirpaceus', 'Eurasian Reed Warbler', 'Acrocephalidae', 'Passeriformes',
 12.0, 19.0, 13.0,  'insectivore', 'foliage', 'pair',  'wetland', 'understory', 0.05,
 'long_distance', 'spring', 3, 5,  5.0, 32.0, 0, 800,  0.0, 0.1, 0.8,  'common', 'LC', 'diurnal', '[5,6,7,8,18,19,20]');

INSERT INTO species_interactions (species_a_id, species_a_type, species_b_id, species_b_type, interaction_type, interaction_strength, notes) VALUES
-- Pollination
('common_knapweed', 'vegetal', 'red_tailed_bumblebee', 'pollinator', 'pollination', 0.7, 'A mainstay of summer bumblebees'),
('common_knapweed', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.6, 'Long tongue reaches the florets'),
('common_knapweed', 'vegetal', 'meadow_brown', 'pollinator', 'pollination', 0.6, 'Favourite nectar of meadow butterflies'),
('common_knapweed', 'vegetal', 'six_spot_burnet', 'pollinator', 'pollination', 0.6, 'Burnets cluster on knapweed heads'),
('common_knapweed', 'vegetal', 'small_copper', 'pollinator', 'pollination', 0.4, 'Nectar in late summer'),
('birds_foot_trefoil', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.7, 'Needs a bee heavy enough to open the keel'),
('birds_foot_trefoil', 'vegetal', 'red_tailed_bumblebee', 'pollinator', 'pollination', 0.5, 'Opens the keel flowers'),
('birds_foot_trefoil', 'vegetal', 'common_blue', 'pollinator', 'pollination', 0.5, 'Adults nectar on their larval plant'),
('oxeye_daisy', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.5, 'Open flat flowers suit short tongues'),
('oxeye_daisy', 'vegetal', 'drone_fly', 'pollinator', 'pollination', 0.4, 'Visits open composite flowers'),
('yellow_rattle', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.6, 'Bumblebee-pollinated hooded flowers'),
('yellow_rattle', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Robs or pollinates the hood'),
('meadow_buttercup', 'vegetal', 'drone_fly', 'pollinator', 'pollination', 0.5, 'Open cups visited by flies'),
('meadow_buttercup', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.4, 'Pollen and nectar'),
('yarrow', 'vegetal', 'drone_fly', 'pollinator', 'pollination', 0.5, 'Flat umbels of tiny flowers'),
('yarrow', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.5, 'Frequent visitor'),
('cowslip', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.6, 'Queens take early nectar'),
('cowslip', 'vegetal', 'brimstone', 'pollinator', 'pollination', 0.4, 'Long tongue reaches the tube'),
('primrose', 'vegetal', 'brimstone', 'pollinator', 'pollination', 0.6, 'The classic primrose pollinator'),
('primrose', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Early queens'),
('wood_anemone', 'vegetal', 'tawny_mining_bee', 'pollinator', 'pollination', 0.3, 'Collects pollen in early spring'),
('wood_anemone', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.3, 'Pollen feeder'),
('holly', 'vegetal', 'red_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Small scented flowers'),
('holly', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Bees work the female trees'),
('honeysuckle', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Robs or reaches the nectar'),
('dog_violet', 'vegetal', 'brimstone', 'pollinator', 'pollination', 0.4, 'Spring nectar'),
('bramble', 'vegetal', 'silver_washed_fritillary', 'pollinator', 'pollination', 0.8, 'Fritillaries feed on bramble blossom in woodland rides'),
('bramble', 'vegetal', 'meadow_brown', 'pollinator', 'pollination', 0.6, 'Summer nectar'),
('bramble', 'vegetal', 'peacock', 'pollinator', 'pollination', 0.4, 'Summer nectar'),
('bramble', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.6, 'Heavily worked by bumblebees'),
('bramble', 'vegetal', 'red_tailed_bumblebee', 'pollinator', 'pollination', 0.5, 'Summer forage'),
('bramble', 'vegetal', 'drone_fly', 'pollinator', 'pollination', 0.4, 'Open flowers'),
('marsh_marigold', 'vegetal', 'drone_fly', 'pollinator', 'pollination', 0.5, 'Flies pollinate the open cups'),
('marsh_marigold', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Early nectar'),
('yellow_flag', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.6, 'Bumblebees enter the falls'),
('yellow_flag', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.5, 'Bumblebees enter the falls'),
('purple_loosestrife', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.7, 'Long-tongued bumblebees'),
('purple_loosestrife', 'vegetal', 'brimstone', 'pollinator', 'pollination', 0.6, 'Summer-brood Brimstones feed here'),
('purple_loosestrife', 'vegetal', 'peacock', 'pollinator', 'pollination', 0.5, 'Summer nectar'),
('purple_loosestrife', 'vegetal', 'red_tailed_bumblebee', 'pollinator', 'pollination', 0.5, 'Summer forage'),
('meadowsweet', 'vegetal', 'drone_fly', 'pollinator', 'pollination', 0.6, 'Pollen-rich, nectarless flowers draw flies'),
('meadowsweet', 'vegetal', 'marmalade_hoverfly', 'pollinator', 'pollination', 0.5, 'Pollen feeder'),
('ragged_robin', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.4, 'Long-tongued bees'),
('ragged_robin', 'vegetal', 'orange_tip', 'pollinator', 'pollination', 0.4, 'Nectar in damp meadows'),
('grey_willow', 'vegetal', 'tawny_mining_bee', 'pollinator', 'pollination', 0.7, 'Willow catkins feed the first mining bees'),
('grey_willow', 'vegetal', 'buff_tailed_bumblebee', 'pollinator', 'pollination', 0.6, 'Queens'' first pollen'),
('grey_willow', 'vegetal', 'red_mason_bee', 'pollinator', 'pollination', 0.5, 'Early provisioning'),
('grey_willow', 'vegetal', 'peacock', 'pollinator', 'pollination', 0.4, 'Nectar for butterflies out of hibernation'),
('pioneer_willow', 'vegetal', 'tawny_mining_bee', 'pollinator', 'pollination', 0.7, 'Willow catkins feed the first mining bees'),
('pioneer_willow', 'vegetal', 'peacock', 'pollinator', 'pollination', 0.4, 'Nectar for butterflies out of hibernation'),
('pioneer_willow', 'vegetal', 'brimstone', 'pollinator', 'pollination', 0.4, 'Early spring nectar'),
('cuckooflower', 'vegetal', 'orange_tip', 'pollinator', 'pollination', 0.7, 'Adults nectar on their larval plant'),
('alder_buckthorn', 'vegetal', 'brimstone', 'pollinator', 'pollination', 0.5, 'Nectar on its larval plant'),
('alder_buckthorn', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.5, 'Inconspicuous flowers bees love'),
('alder_buckthorn', 'vegetal', 'red_tailed_bumblebee', 'pollinator', 'pollination', 0.4, 'Summer forage'),
('white_clover', 'vegetal', 'red_tailed_bumblebee', 'pollinator', 'pollination', 0.5, 'Summer forage'),
('white_clover', 'vegetal', 'common_carder_bee', 'pollinator', 'pollination', 0.5, 'Summer forage'),
('hawthorn', 'vegetal', 'tawny_mining_bee', 'pollinator', 'pollination', 0.3, 'Late-flying mining bees on blossom'),
('midland_hawthorn', 'vegetal', 'tawny_mining_bee', 'pollinator', 'pollination', 0.4, 'Flowers early enough for mining bees'),
-- Larval hosts: each butterfly and moth needs its food plant nearby to breed
('common_grass', 'vegetal', 'meadow_brown', 'pollinator', 'larval_host', 0.7, 'Caterpillars eat fine grasses including fescues'),
('cuckooflower', 'vegetal', 'orange_tip', 'pollinator', 'larval_host', 0.8, 'Eggs laid singly on the flower stalks'),
('common_sorrel', 'vegetal', 'small_copper', 'pollinator', 'larval_host', 0.8, 'Caterpillars feed on sorrels and docks'),
('alder_buckthorn', 'vegetal', 'brimstone', 'pollinator', 'larval_host', 0.9, 'One of its only two food plants'),
('common_nettle', 'vegetal', 'peacock', 'pollinator', 'larval_host', 0.9, 'Caterpillars feed in webs on sunny nettle beds'),
('dog_violet', 'vegetal', 'silver_washed_fritillary', 'pollinator', 'larval_host', 0.9, 'Eggs laid on tree bark above violets'),
('birds_foot_trefoil', 'vegetal', 'six_spot_burnet', 'pollinator', 'larval_host', 0.9, 'Its main food plant'),
('birds_foot_trefoil', 'vegetal', 'common_blue', 'pollinator', 'larval_host', 0.8, 'The preferred food plant'),
-- Birds: fruit carried off, seed and insects taken, nest sites
('bramble', 'vegetal', 'blackbird', 'bird', 'seed_dispersal', 0.8, 'Blackberries in late summer'),
('bramble', 'vegetal', 'song_thrush', 'bird', 'seed_dispersal', 0.6, 'Autumn fruit'),
('bramble', 'vegetal', 'robin_european', 'bird', 'seed_dispersal', 0.5, 'Autumn fruit'),
('holly', 'vegetal', 'blackbird', 'bird', 'seed_dispersal', 0.7, 'Berries in winter'),
('holly', 'vegetal', 'song_thrush', 'bird', 'seed_dispersal', 0.5, 'Berries in winter'),
('honeysuckle', 'vegetal', 'blackbird', 'bird', 'seed_dispersal', 0.5, 'Red berries in autumn'),
('alder_buckthorn', 'vegetal', 'blackbird', 'bird', 'seed_dispersal', 0.6, 'Berries ripen red to black'),
('hazel', 'vegetal', 'jay', 'bird', 'seed_dispersal', 0.7, 'Caches hazelnuts'),
('hazel', 'vegetal', 'nuthatch', 'bird', 'seed_dispersal', 0.6, 'Wedges and caches hazelnuts'),
('alder', 'vegetal', 'siskin', 'bird', 'feeding', 0.9, 'Prises seed from alder cones through winter'),
('silver_birch', 'vegetal', 'siskin', 'bird', 'feeding', 0.7, 'Birch seed'),
('downy_birch', 'vegetal', 'siskin', 'bird', 'feeding', 0.7, 'Birch seed'),
('common_knapweed', 'vegetal', 'goldfinch', 'bird', 'feeding', 0.8, 'Goldfinches strip knapweed seed heads'),
('common_grass', 'vegetal', 'reed_bunting', 'bird', 'feeding', 0.5, 'Grass seed'),
('common_sorrel', 'vegetal', 'reed_bunting', 'bird', 'feeding', 0.4, 'Seed in winter'),
('meadowsweet', 'vegetal', 'reed_bunting', 'bird', 'feeding', 0.3, 'Seed heads in autumn'),
('grey_willow', 'vegetal', 'reed_warbler', 'bird', 'feeding', 0.6, 'Insects among willow scrub'),
('purple_loosestrife', 'vegetal', 'reed_warbler', 'bird', 'feeding', 0.5, 'Insects in tall fen plants'),
('meadowsweet', 'vegetal', 'reed_warbler', 'bird', 'feeding', 0.5, 'Insects in tall fen plants'),
('alder', 'vegetal', 'blue_tit', 'bird', 'feeding', 0.5, 'Insects in the canopy'),
('bramble', 'vegetal', 'wren', 'bird', 'feeding', 0.5, 'Insects in thickets'),
('holly', 'vegetal', 'blackbird', 'bird', 'nesting', 0.6, 'Evergreen cover'),
('bramble', 'vegetal', 'wren', 'bird', 'nesting', 0.6, 'Nests deep in thickets'),
('yellow_flag', 'vegetal', 'reed_bunting', 'bird', 'nesting', 0.5, 'Nests low in fen vegetation'),
('grey_willow', 'vegetal', 'reed_bunting', 'bird', 'nesting', 0.4, 'Nests in scrub by water');

INSERT INTO biome_associations (species_id, species_type, biome_type, abundance_weight) VALUES
('common_knapweed', 'vegetal', 'grassland', 1.8), ('birds_foot_trefoil', 'vegetal', 'grassland', 1.8),
('oxeye_daisy', 'vegetal', 'grassland', 1.6), ('yellow_rattle', 'vegetal', 'grassland', 1.4),
('meadow_buttercup', 'vegetal', 'grassland', 1.8), ('common_sorrel', 'vegetal', 'grassland', 1.5),
('yarrow', 'vegetal', 'grassland', 1.6), ('cowslip', 'vegetal', 'grassland', 1.2),
('primrose', 'vegetal', 'temperate_forest', 1.4), ('wood_anemone', 'vegetal', 'temperate_forest', 1.6),
('hazel', 'vegetal', 'temperate_forest', 1.6), ('holly', 'vegetal', 'temperate_forest', 1.3),
('honeysuckle', 'vegetal', 'forest_edge', 1.4), ('dog_violet', 'vegetal', 'temperate_forest', 1.3),
('bramble', 'vegetal', 'forest_edge', 1.8), ('common_nettle', 'vegetal', 'forest_edge', 1.4),
('alder', 'vegetal', 'wetland', 2.0), ('marsh_marigold', 'vegetal', 'wetland', 1.6),
('yellow_flag', 'vegetal', 'wetland', 1.8), ('purple_loosestrife', 'vegetal', 'wetland', 1.6),
('meadowsweet', 'vegetal', 'wetland', 1.8), ('ragged_robin', 'vegetal', 'wetland', 1.2),
('grey_willow', 'vegetal', 'wetland', 1.8), ('cuckooflower', 'vegetal', 'wetland', 1.3),
('alder_buckthorn', 'vegetal', 'wetland', 1.1),
('siskin', 'bird', 'temperate_forest', 1.2), ('reed_bunting', 'bird', 'wetland', 1.6), ('reed_warbler', 'bird', 'wetland', 1.8);
