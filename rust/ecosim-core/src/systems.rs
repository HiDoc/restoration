use crate::{crossing::default_genetics, model::*, world::World};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

fn trait_value(extra: &BTreeMap<String, Value>, id: &str) -> f64 {
    extra
        .get("genetics")
        .and_then(|g| g.get("traits"))
        .and_then(|t| t.get("__ecosimMap"))
        .and_then(Value::as_array)
        .and_then(|entries| entries.iter().find(|entry| entry[0] == id))
        .and_then(|entry| entry[1]["value"].as_f64())
        .unwrap_or(0.5)
        .clamp(0.0, 1.0)
}

impl World {
    fn days(&self) -> f64 {
        self.config.time_per_tick_minutes as f64 / 1440.0
    }

    pub(crate) fn climate_system(&mut self) {
        let year_minutes = self.config.season_length_ticks * 1440 * 4;
        let phase = (self.elapsed_minutes % year_minutes) as f64 / year_minutes as f64;
        // Continuous triangular seasons avoid platform-specific transcendental functions.
        let warmth = 1.0 - 4.0 * (phase - 0.375).abs().min(1.0 - (phase - 0.375).abs());
        let days = self.days();
        for weather in &mut self.weather {
            weather.remaining_minutes = weather
                .remaining_minutes
                .saturating_sub(self.config.time_per_tick_minutes);
        }
        self.weather.retain(|weather| weather.remaining_minutes > 0);
        if self.weather.len() < 2 && self.rng.sample() < 0.025 * days {
            let kind = match self.season() {
                "summer" => {
                    if self.rng.sample() < 0.65 {
                        "drought"
                    } else {
                        "storm"
                    }
                }
                "winter" => "cold_snap",
                _ => "storm",
            };
            let duration_days = if kind == "drought" {
                18
            } else if kind == "cold_snap" {
                8
            } else {
                4
            };
            let habitats: Vec<_> = self.components.habitats.keys().copied().collect();
            if !habitats.is_empty() {
                let entity = habitats[(self.rng.sample() * habitats.len() as f64) as usize];
                let habitat = &self.components.habitats[&entity];
                let weather = Weather {
                    id: format!("weather_{}", self.tick),
                    kind: kind.into(),
                    center_x: habitat.x,
                    center_y: habitat.y,
                    radius: 2,
                    intensity: 0.5 + self.rng.sample() * 0.5,
                    start_tick: self.tick,
                    duration: duration_days * 1440 / self.config.time_per_tick_minutes,
                    remaining_minutes: duration_days * 1440,
                };
                self.emit(
                    "weather_change",
                    entity,
                    json!({"type":kind,"intensity":weather.intensity,"duration":weather.duration}),
                );
                self.weather.push(weather);
            }
        }
        for (id, climate) in &mut self.components.climates {
            let habitat = &mut self.components.habitats.get_mut(id).unwrap();
            let latitude = habitat.y as f64 / f64::from(self.config.world_height).max(1.0);
            let modifier = habitat
                .extra
                .get("temperatureModifier")
                .and_then(Value::as_f64)
                .unwrap_or(0.0);
            let weather = self.weather.iter().find(|w| {
                (w.center_x - habitat.x).abs() <= w.radius
                    && (w.center_y - habitat.y).abs() <= w.radius
            });
            let kind = weather.map_or("", |w| w.kind.as_str());
            let intensity = weather.map_or(0.0, |w| w.intensity);
            let weather_temperature = match kind {
                "drought" => 5.0 * intensity,
                "cold_snap" => -9.0 * intensity,
                _ => 0.0,
            };
            let target = 15.0 + 12.0 * warmth - 3.0 * (latitude - 0.5).abs()
                + modifier
                + weather_temperature;
            climate.temperature += (target + (self.rng.sample() - 0.5) * 3.0 - climate.temperature)
                * (0.3 * days).min(1.0);
            climate.light = (0.65 + warmth * 0.25).clamp(0.2, 1.0);
            climate.wind = (0.2 + self.rng.sample() * 0.3).clamp(0.0, 1.0);
            climate.rain_likelihood = (0.15 - warmth * 0.04).clamp(0.0, 1.0);
            if kind == "drought" {
                climate.rain_likelihood *= 0.05;
            }
            if kind == "storm" {
                climate.rain_likelihood = 0.65 + intensity * 0.25;
                climate.wind = 0.65 + intensity * 0.3;
            }
            let rain = self.rng.sample() < climate.rain_likelihood * days;
            habitat.extra.insert("isRaining".into(), json!(rain));
            habitat.extra.insert(
                "weatherType".into(),
                json!(if !kind.is_empty() {
                    kind
                } else if rain {
                    "rain"
                } else if warmth > 0.7 {
                    "clear"
                } else {
                    "cloudy"
                }),
            );
        }
    }

    pub(crate) fn hydrology_system(&mut self) {
        let days = self.days();
        for (id, biome) in &mut self.components.biomes {
            let climate = &self.components.climates[id];
            let habitat = &mut self.components.habitats.get_mut(id).unwrap();
            let rain = habitat
                .extra
                .get("isRaining")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let input = if rain {
                0.05 + self.rng.sample() * 0.08
            } else {
                0.0
            };
            let evaporation =
                (0.004 + climate.temperature.max(0.0) * 0.00025 + climate.wind * 0.004)
                    * (1.0 - biome.canopy * 0.45);
            let drainage = (biome.moisture - 0.6).max(0.0) * 0.025;
            biome.moisture =
                (biome.moisture + input - (evaporation + drainage) * days).clamp(0.0, 1.0);
            habitat
                .extra
                .insert("waterTable".into(), json!(0.15 + biome.moisture * 0.65));
            habitat.extra.insert(
                "surfaceWater".into(),
                json!((biome.moisture - 0.9).max(0.0)),
            );
        }
    }

    pub(crate) fn effect_system(&mut self) {
        let days = self.days();
        for (id, habitat) in &mut self.components.habitats {
            let biome = self.components.biomes.get_mut(id).unwrap();
            habitat.residues.retain_mut(|(_, residue)| {
                let duration = residue["duration"].as_f64().unwrap_or(0.0) - days;
                residue["duration"] = json!(duration);
                let strength = residue["strength"].as_f64().unwrap_or(1.0);
                if let Some(effects) = residue["effects"].as_object() {
                    for (name, value) in effects {
                        biome.apply(name, value.as_f64().unwrap_or(0.0) * strength * days * 0.01);
                    }
                }
                duration > 0.0
            });
        }
    }

    pub(crate) fn growth_system(&mut self) {
        let days = self.days();
        let winter = self.season() == "winter";
        let mut populations = BTreeMap::<Entity, usize>::new();
        for position in self.components.positions.values() {
            *populations.entry(position.chunk).or_default() += 1;
        }
        let mut dead = vec![];
        let mut adaptations = vec![];
        for (entity, organism) in &self.components.organisms {
            let position = &self.components.positions[entity];
            let biome = &self.components.biomes[&position.chunk];
            let climate = &self.components.climates[&position.chunk];
            let fallback = SpeciesDefinition::default();
            let def = self
                .definitions
                .get(&organism.species_id)
                .unwrap_or(&fallback);
            let growth = self.components.growth.get_mut(entity).unwrap();
            growth.age += 1;
            growth.age_days += days;
            let drought = trait_value(&organism.extra, "drought_tolerance");
            let cold = trait_value(&organism.extra, "cold_resistance");
            let moisture_stress = ((def.moisture_range.min - biome.moisture).max(0.0)
                * (1.5 - drought)
                + (biome.moisture - def.moisture_range.max).max(0.0) * 0.4)
                .min(1.0);
            let temperature_stress =
                ((def.temperature_range.min - climate.temperature - cold * 5.0).max(0.0)
                    + (climate.temperature - def.temperature_range.max).max(0.0))
                    / 20.0;
            let ground_light =
                climate.light * (1.0 - biome.canopy * (1.0 - def.shade_tolerance_max));
            let light_stress = (def.light_requirement - ground_light).max(0.0);
            let density =
                populations[&position.chunk] as f64 / self.config.max_population_per_chunk as f64;
            // Dormant plants (winter, or a spring ephemeral's summer bulb) shelter below ground: they
            // neither grow nor feel most of the weather.
            let dormant = self.components.reproduction[entity].stage == "dormant";
            let stress = (moisture_stress * 0.8
                + temperature_stress * 0.7
                + biome.pollution * 0.7
                + light_stress * 0.4)
                * if dormant { 0.25 } else { 1.0 };
            let recovery = if biome.moisture < 0.04 { 0.0 } else { 0.006 };
            growth.health = (growth.health
                + (recovery - stress * 0.06 - (density - 0.8).max(0.0) * 0.025) * days)
                .clamp(0.0, 1.0);
            let nutrient = 0.65 + trait_value(&organism.extra, "nutrient_efficiency") * 0.7;
            let efficiency = 0.6 + trait_value(&organism.extra, "growth_efficiency") * 0.8;
            let suitability =
                (1.0 - stress).max(0.0) * growth.health * (0.3 + biome.soil * 0.7) * nutrient;
            adaptations.push((*entity, suitability.clamp(0.0, 1.0)));
            let growth_rate = def.growth_rate
                * 0.025
                * efficiency
                * suitability
                * (1.0 - density * 0.8).max(0.05)
                * if dormant {
                    0.0
                } else if winter {
                    0.12
                } else {
                    1.0
                };
            growth.biomass = (growth.biomass
                + growth_rate * (1.0 - growth.biomass / def.max_biomass).max(0.0) * days)
                .clamp(0.0, def.max_biomass);
            let lifetime_days = growth.age_days;
            if lifetime_days > def.lifespan_ticks as f64 {
                growth.health = (growth.health - 0.025 * days).max(0.0);
            }
            if growth.health <= 0.0 {
                let cause = if lifetime_days > def.lifespan_ticks as f64 {
                    "natural_aging"
                } else if biome.moisture < def.moisture_range.min {
                    "drought"
                } else if biome.pollution > 0.5 {
                    "pollution"
                } else {
                    "environmental_stress"
                };
                dead.push((
                    *entity,
                    position.chunk,
                    organism.species_id.clone(),
                    cause,
                    growth.biomass,
                    growth.age,
                ));
            }
        }
        for (entity, adaptation) in adaptations {
            if let Some(genetics) = self
                .components
                .organisms
                .get_mut(&entity)
                .unwrap()
                .extra
                .get_mut("genetics")
            {
                if genetics.is_object() {
                    genetics["adaptationScore"] = json!(adaptation);
                }
            }
        }
        for (entity, chunk, species, cause, biomass, age) in dead {
            self.components
                .biomes
                .get_mut(&chunk)
                .unwrap()
                .apply("soil", biomass * 0.003);
            self.emit(
                "species_die",
                chunk,
                json!({"speciesId":species,"cause":cause,"biomass":biomass,"age":age}),
            );
            self.despawn(entity);
        }
    }

    pub(crate) fn inherit_genetics(&mut self, extra: &BTreeMap<String, Value>) -> Value {
        let mut genetics = extra
            .get("genetics")
            .filter(|value| value.is_object())
            .cloned()
            .unwrap_or_else(default_genetics);
        let generation = genetics["generation"]
            .as_u64()
            .unwrap_or(0)
            .saturating_add(1);
        genetics["generation"] = json!(generation);
        let mut changes = vec![];
        if let Some(traits) = genetics["traits"]["__ecosimMap"].as_array_mut() {
            for entry in traits {
                if !entry.is_array()
                    || entry.as_array().is_none_or(|array| array.len() != 2)
                    || !entry[1].is_object()
                {
                    continue;
                }
                if self.rng.sample()
                    < entry[1]["mutationRate"]
                        .as_f64()
                        .unwrap_or(0.08)
                        .clamp(0.0, 1.0)
                {
                    let before = entry[1]["value"].as_f64().unwrap_or(0.5);
                    let after = (before + (self.rng.sample() - 0.5) * 0.24).clamp(0.0, 1.0);
                    entry[1]["value"] = json!(after);
                    changes.push(json!(format!(
                        "{}:{before:.3}->{after:.3}",
                        entry[0].as_str().unwrap_or("trait")
                    )));
                }
            }
        }
        let history = genetics["mutations"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        genetics["mutations"] = Value::Array(
            history
                .into_iter()
                .chain(changes)
                .rev()
                .take(24)
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect(),
        );
        genetics
    }

    pub(crate) fn reproduction_system(&mut self) {
        let days = self.days();
        let season = self.season();
        let season_progress = (self.elapsed_minutes % (self.config.season_length_ticks * 1440))
            as f64
            / (self.config.season_length_ticks * 1440) as f64;
        // A species "starts flowering" (or ripens seed) in a chunk when its first plant there does.
        let stage_before: BTreeSet<(Entity, String, String)> = self
            .components
            .organisms
            .iter()
            .map(|(entity, organism)| {
                (
                    self.components.positions[entity].chunk,
                    organism.species_id.clone(),
                    self.components.reproduction[entity].stage.clone(),
                )
            })
            .collect();
        let mut announcements = BTreeSet::new();
        let visits = self.fauna_service(|link| link.pollinates, 4.0);
        let dispersers = self.fauna_service(|link| link.disperses, 2.0);
        let mut offspring = vec![];
        for (entity, organism) in &self.components.organisms {
            let fallback = SpeciesDefinition::default();
            let def = self
                .definitions
                .get(&organism.species_id)
                .unwrap_or(&fallback);
            let growth = &self.components.growth[entity];
            let position = &self.components.positions[entity];
            let biome = &self.components.biomes[&position.chunk];
            let reproduction = self.components.reproduction.get_mut(entity).unwrap();
            let mature = growth.biomass >= def.reproduction_threshold
                && growth.health > 0.4
                && growth.age_days >= def.maturity_days;
            let stage = phenology_stage(def, season, season_progress, mature);
            if stage == "flowering" {
                // A new bloom starts unpollinated; visits while it flowers decide the later fruit.
                if reproduction.stage != "flowering" {
                    reproduction.pollinated = 0.0;
                    reproduction.pollen = None;
                }
                let visits = visits
                    .get(&(position.chunk, organism.species_id.clone()))
                    .copied()
                    .unwrap_or(0.0)
                    .min(1.0);
                reproduction.pollinated = (reproduction.pollinated + visits * 0.05 * days).min(1.0);
            }
            reproduction.stage = stage.into();
            let event = match stage {
                "flowering" => "flowering_started",
                "fruiting" => "seeds_ripe",
                _ => "",
            };
            let key = (
                position.chunk,
                organism.species_id.clone(),
                stage.to_owned(),
            );
            if !event.is_empty() && !stage_before.contains(&key) {
                announcements.insert((position.chunk, organism.species_id.clone(), event));
            }
            if stage != "fruiting" {
                continue;
            }
            let quality = (biome.soil + biome.moisture + growth.health) / 3.0;
            if quality < def.reproduction_need || biome.moisture < 0.06 {
                continue;
            }
            // Animal-pollinated plants set seed in proportion to how well their bloom was visited.
            let pollination = if def.pollination == "insect" || def.pollination == "bird" {
                0.3 + 0.7 * reproduction.pollinated
            } else {
                1.0
            };
            // seedProduction 120 is the reference rate; species scale their output from it.
            reproduction.reserve += 0.075 * def.seed_production / 120.0
                * quality
                * pollination
                * (0.5 + trait_value(&organism.extra, "reproduction_vigor"))
                * days;
            if reproduction.reserve >= 1.0 {
                reproduction.reserve -= 1.0;
                offspring.push((
                    position.chunk,
                    position.x,
                    position.y,
                    organism.species_id.clone(),
                    def.seed_maturity_ticks,
                    def.dispersal_range,
                    organism.extra.clone(),
                    reproduction.pollen.clone(),
                ));
            }
        }
        let coordinates: BTreeMap<_, _> = self
            .components
            .habitats
            .iter()
            .map(|(id, h)| ((h.x, h.y), *id))
            .collect();
        for (chunk, species, event) in announcements {
            self.emit(event, chunk, json!({ "speciesId": species }));
        }
        for (chunk, x, y, mother, maturity, dispersal, extra, pollen) in offspring {
            let mut target = chunk;
            // Fruit-eating birds carry seed out of the patch.
            let carried = dispersers
                .get(&(chunk, mother.clone()))
                .copied()
                .unwrap_or(0.0)
                .min(1.0);
            if dispersal >= 1.0 && self.rng.sample() < 0.25 + 0.5 * carried {
                let offset = [(1, 0), (-1, 0), (0, 1), (0, -1)][(self.rng.sample() * 4.0) as usize];
                let h = &self.components.habitats[&chunk];
                target = coordinates
                    .get(&(h.x + offset.0, h.y + offset.1))
                    .copied()
                    .unwrap_or(chunk);
            }
            if self.components.habitats[&target].seeds.len() >= 128 {
                continue;
            }
            let (species, genetics) = self.seed_of(&mother, &extra, pollen.as_ref());
            let seed_extra = BTreeMap::from([("genetics".to_owned(), genetics)]);
            self.components
                .habitats
                .get_mut(&target)
                .unwrap()
                .seeds
                .push(Seed {
                    species_id: species.clone(),
                    x: (x + (self.rng.sample() - 0.5) * 0.4).clamp(0.0, 1.0),
                    y: (y + (self.rng.sample() - 0.5) * 0.4).clamp(0.0, 1.0),
                    viability: 0.85,
                    maturity_ticks: maturity.min(60),
                    extra: seed_extra,
                });
            self.emit(
                "species_reproduce",
                chunk,
                json!({"speciesId":species,"targetChunk":self.components.habitats[&target].id}),
            );
        }
    }

    pub(crate) fn germination_system(&mut self) {
        let days = self.days();
        let winter = self.season() == "winter";
        let spring_boost = if self.season() == "spring" { 2.0 } else { 1.0 };
        let mut population = BTreeMap::<Entity, usize>::new();
        let mut conspecifics = BTreeMap::<(Entity, String), usize>::new();
        for (entity, organism) in &self.components.organisms {
            let chunk = self.components.positions[entity].chunk;
            *population.entry(chunk).or_default() += 1;
            *conspecifics
                .entry((chunk, organism.species_id.clone()))
                .or_default() += 1;
        }
        let capacity = self.config.max_population_per_chunk as f64;
        let mut births = vec![];
        for (chunk, habitat) in &mut self.components.habitats {
            let biome = &self.components.biomes[chunk];
            let count = population.entry(*chunk).or_default();
            habitat.seeds.retain_mut(|seed| {
                seed.maturity_ticks = seed.maturity_ticks.saturating_sub(1);
                seed.viability *= 1.0 - 0.0008 * days;
                if seed.viability < 0.05 {
                    return false;
                }
                if seed.maturity_ticks > 0
                    || winter
                    || *count >= self.config.max_population_per_chunk
                    || biome.moisture < 0.08
                {
                    return true;
                }
                let density = *count as f64 / capacity;
                // Crowding by its own species limits a plant more than competition from others,
                // so no species can monopolise a patch.
                let own = conspecifics
                    .entry((*chunk, seed.species_id.clone()))
                    .or_default();
                let crowding = (1.0 - *own as f64 / capacity).max(0.0);
                if self.rng.sample()
                    < seed.viability * 0.14 * days * (1.0 - density) * crowding * spring_boost
                {
                    births.push((*chunk, seed.clone()));
                    *count += 1;
                    *own += 1;
                    return false;
                }
                true
            });
        }
        for (chunk, seed) in births {
            let id = self.spawn(chunk, &seed.species_id, seed.x, seed.y, 0.08);
            if !seed.extra.is_empty() {
                self.components.organisms.get_mut(&id).unwrap().extra = seed.extra;
            }
            self.emit("species_spawn",chunk,json!({"speciesId":seed.species_id,"instanceId":self.components.organisms[&id].id,"source":"germination"}));
        }
    }

    /// Runners, rhizomes and bulbs: established, growing plants add a genetically identical shoot beside
    /// themselves, crowded out like seedlings.
    pub(crate) fn clonal_system(&mut self) {
        let days = self.days();
        let capacity = self.config.max_population_per_chunk as f64;
        let mut population = BTreeMap::<Entity, usize>::new();
        let mut conspecifics = BTreeMap::<(Entity, String), usize>::new();
        for (entity, organism) in &self.components.organisms {
            let chunk = self.components.positions[entity].chunk;
            *population.entry(chunk).or_default() += 1;
            *conspecifics
                .entry((chunk, organism.species_id.clone()))
                .or_default() += 1;
        }
        let mut shoots = vec![];
        for (entity, organism) in &self.components.organisms {
            let Some(def) = self.definitions.get(&organism.species_id) else {
                continue;
            };
            let growth = &self.components.growth[entity];
            if def.clonal_rate <= 0.0
                || self.components.reproduction[entity].stage == "dormant"
                || growth.health < 0.5
                || growth.age_days < def.maturity_days
            {
                continue;
            }
            let position = &self.components.positions[entity];
            let count = population.entry(position.chunk).or_default();
            let own = conspecifics
                .entry((position.chunk, organism.species_id.clone()))
                .or_default();
            let room =
                (1.0 - *count as f64 / capacity).max(0.0) * (1.0 - *own as f64 / capacity).max(0.0);
            if *count < self.config.max_population_per_chunk
                && self.rng.sample() < def.clonal_rate * days * room
            {
                *count += 1;
                *own += 1;
                let x = (position.x + (self.rng.sample() - 0.5) * 0.1).clamp(0.0, 1.0);
                let y = (position.y + (self.rng.sample() - 0.5) * 0.1).clamp(0.0, 1.0);
                shoots.push((
                    position.chunk,
                    organism.species_id.clone(),
                    x,
                    y,
                    organism.extra.clone(),
                ));
            }
        }
        for (chunk, species, x, y, extra) in shoots {
            let id = self.spawn(chunk, &species, x, y, 0.08);
            // A clone carries its parent's genes unchanged.
            self.components.organisms.get_mut(&id).unwrap().extra = extra;
            self.emit(
                "species_spawn",
                chunk,
                json!({"speciesId":species,"instanceId":self.components.organisms[&id].id,"source":"clonal"}),
            );
        }
    }

    pub(crate) fn diffusion_system(&mut self) {
        let days = self.days();
        let coordinates: BTreeMap<_, _> = self
            .components
            .habitats
            .iter()
            .map(|(id, h)| ((h.x, h.y), *id))
            .collect();
        let mut deltas = BTreeMap::<Entity, (f64, f64)>::new();
        // Accumulate flux from the previous state, then commit simultaneously.
        for (entity, h) in &self.components.habitats {
            for offset in [(1, 0), (0, 1)] {
                if let Some(neighbor) = coordinates.get(&(h.x + offset.0, h.y + offset.1)) {
                    let a = &self.components.biomes[entity];
                    let b = &self.components.biomes[neighbor];
                    let moisture = (a.moisture - b.moisture) * 0.025 * days;
                    let pollution = (a.pollution - b.pollution) * 0.01 * days;
                    let d = deltas.entry(*entity).or_default();
                    d.0 -= moisture;
                    d.1 -= pollution;
                    let d = deltas.entry(*neighbor).or_default();
                    d.0 += moisture;
                    d.1 += pollution;
                }
            }
        }
        for (entity, (moisture, pollution)) in deltas {
            let biome = self.components.biomes.get_mut(&entity).unwrap();
            biome.apply("moisture", moisture);
            biome.apply("pollution", pollution);
        }
    }

    /// How much of a service (pollination, seed carrying) each plant species gets per habitat from the animals
    /// active there: Σ abundance × link strength / `saturation`.
    fn fauna_service(
        &self,
        provides: impl Fn(&FaunaLink) -> bool,
        saturation: f64,
    ) -> BTreeMap<(Entity, String), f64> {
        let season = self.season();
        let mut service = BTreeMap::new();
        for (habitat, populations) in &self.components.fauna {
            for (id, abundance) in populations {
                let Some(def) = self.fauna_definitions.get(id) else {
                    continue;
                };
                if *abundance < 1.0 || !def.active_seasons.iter().any(|s| s == season) {
                    continue;
                }
                for link in def.forage.iter().filter(|link| provides(link)) {
                    *service.entry((*habitat, link.plant.clone())).or_insert(0.0) +=
                        abundance * link.strength / saturation;
                }
            }
        }
        service
    }

    /// Animals follow their food: each species' abundance in a habitat grows towards what the plants in and
    /// around it offer, spreads to neighbours, and arrives from beyond the map where food appears.
    pub(crate) fn fauna_system(&mut self) {
        if self.fauna_definitions.is_empty() {
            return;
        }
        let days = self.days();
        let season = self.season();
        let season_index = self.elapsed_minutes / (self.config.season_length_ticks * 1440);
        if season_index != self.interactions_season {
            self.interactions_seen.clear();
            self.interactions_season = season_index;
        }
        // What each plant species offers per habitat: (flowering, fruiting, not dormant).
        let mut offer = BTreeMap::<(Entity, String), (f64, f64, f64)>::new();
        for (entity, organism) in &self.components.organisms {
            let chunk = self.components.positions[entity].chunk;
            let stage = self.components.reproduction[entity].stage.as_str();
            let o = offer
                .entry((chunk, organism.species_id.clone()))
                .or_default();
            o.0 += f64::from(u8::from(stage == "flowering"));
            o.1 += f64::from(u8::from(stage == "fruiting"));
            o.2 += f64::from(u8::from(stage != "dormant"));
        }
        let offered = |habitat: Entity, link: &FaunaLink| -> f64 {
            let (flowering, fruiting, active) = offer
                .get(&(habitat, link.plant.clone()))
                .copied()
                .unwrap_or_default();
            let plants = match link.takes.as_str() {
                "nectar" => flowering,
                "fruit" | "seed" => fruiting,
                _ => active,
            };
            plants * link.strength
        };
        let coordinates: BTreeMap<_, _> = self
            .components
            .habitats
            .iter()
            .map(|(id, h)| ((h.x, h.y), *id))
            .collect();
        let previous = self.components.fauna.clone();
        let mut events = vec![];
        let mut next = BTreeMap::<Entity, BTreeMap<String, f64>>::new();
        for (habitat, h) in &self.components.habitats {
            let biome = &self.components.biomes[habitat];
            let temperature = self.components.climates[habitat].temperature;
            for def in self.fauna_definitions.values() {
                let range = def.foraging_range as i32;
                let nearby: Vec<Entity> = (-range..=range)
                    .flat_map(|dx| (-range..=range).map(move |dy| (dx, dy)))
                    .filter(|offset| *offset != (0, 0))
                    .filter_map(|(dx, dy)| coordinates.get(&(h.x + dx, h.y + dy)).copied())
                    .collect();
                let forage = |habitat: Entity| -> f64 {
                    def.forage.iter().map(|link| offered(habitat, link)).sum()
                };
                // Animals live where they feed: their own patch counts fully and food within range at half its average;
                // a patch with no food of its own sees only passing visitors.
                let nearby_food = if nearby.is_empty() {
                    0.0
                } else {
                    nearby.iter().map(|n| forage(*n)).sum::<f64>() / nearby.len() as f64
                };
                let own = forage(*habitat);
                let food = own + if own > 0.0 { 0.5 } else { 0.1 } * nearby_food;
                let host_nearby = def.hosts.iter().any(|plant| {
                    std::iter::once(habitat)
                        .chain(nearby.iter())
                        .any(|n| offer.get(&(*n, plant.clone())).is_some_and(|o| o.2 > 0.0))
                });
                let breeding = match (def.needs_host, host_nearby) {
                    (true, false) => 0.2,
                    (false, true) => 1.3,
                    _ => 1.0,
                };
                let pollution =
                    (1.0 - biome.pollution / def.pollution_tolerance.max(0.05)).clamp(0.0, 1.0);
                let capacity = food * def.capacity_per_forage * pollution * breeding;
                let before = previous
                    .get(habitat)
                    .and_then(|p| p.get(&def.id))
                    .copied()
                    .unwrap_or(0.0);
                let in_season = def.active_seasons.iter().any(|s| s == season);
                let active = in_season
                    && (def.temperature_range.min..=def.temperature_range.max)
                        .contains(&temperature);
                let mut after = if !in_season {
                    // Overwintering unseen (queens, pupae, birds wintering elsewhere).
                    before * (1.0 - 0.003 * days)
                } else if !active {
                    before
                } else if capacity > 0.05 {
                    let arriving = 0.03
                        * days
                        * nearby
                            .iter()
                            .filter_map(|n| previous.get(n).and_then(|p| p.get(&def.id)))
                            .sum::<f64>();
                    before + 0.12 * before * (1.0 - before / capacity) * days + arriving
                } else {
                    before * (1.0 - 0.03 * days)
                };
                if active
                    && after < 1.0
                    && capacity >= 1.0
                    && self.rng.sample() < 0.003 * capacity * days
                {
                    after = after.max(1.5);
                }
                after = after.clamp(0.0, 1000.0);
                if active && before < 1.0 && after >= 1.0 {
                    events.push((*habitat, "fauna_arrived", def.id.clone(), String::new()));
                } else if active && before >= 1.0 && after < 1.0 {
                    events.push((*habitat, "fauna_left", def.id.clone(), String::new()));
                }
                if active && after >= 1.0 {
                    for link in &def.forage {
                        let key = (*habitat, def.id.clone(), link.plant.clone());
                        if offered(*habitat, link) > 0.0
                            && !self.interactions_seen.contains(&key)
                            && self.rng.sample() < link.strength * 0.3 * days
                        {
                            self.interactions_seen.insert(key);
                            events.push((
                                *habitat,
                                "interaction_observed",
                                def.id.clone(),
                                link.plant.clone(),
                            ));
                        }
                    }
                }
                if after >= 0.05 {
                    next.entry(*habitat)
                        .or_default()
                        .insert(def.id.clone(), after);
                }
            }
        }
        self.components.fauna = next;
        for (habitat, kind, animal, plant) in events {
            if kind == "fauna_arrived" && self.fauna_seen.insert(animal.clone()) {
                self.emit("first_sighting", habitat, json!({ "faunaId": animal }));
            }
            let data = if plant.is_empty() {
                json!({ "faunaId": animal })
            } else {
                json!({ "faunaId": animal, "plantId": plant })
            };
            self.emit(kind, habitat, data);
        }
        self.project_fauna();
    }

    /// Renderer fields: visible animals per habitat, plus the legacy pollinator and bird summaries.
    fn project_fauna(&mut self) {
        let season = self.season();
        for (habitat, h) in &mut self.components.habitats {
            let mut visible = serde_json::Map::new();
            let mut birds = serde_json::Map::new();
            let (mut pollinators, mut bird_total) = (0.0, 0.0);
            for (id, abundance) in self.components.fauna.get(habitat).into_iter().flatten() {
                let Some(def) = self.fauna_definitions.get(id) else {
                    continue;
                };
                if *abundance < 1.0 || !def.active_seasons.iter().any(|s| s == season) {
                    continue;
                }
                let count = abundance.floor();
                visible.insert(id.clone(), json!(count));
                if def.group == "bird" {
                    birds.insert(id.clone(), json!(count));
                    bird_total += count;
                } else {
                    pollinators += count;
                }
            }
            h.extra.insert("fauna".into(), Value::Object(visible));
            h.extra.insert("birds".into(), Value::Object(birds));
            h.extra.insert("birdsTotal".into(), json!(bird_total));
            h.extra
                .insert("birdsActivity".into(), json!((bird_total / 5.0).min(1.0)));
            h.extra.insert(
                "pollinatorDensity".into(),
                json!((pollinators / 10.0).min(1.0)),
            );
        }
    }

    pub(crate) fn ecosystem_system(&mut self) {
        let days = self.days();
        let mut richness = BTreeMap::<Entity, BTreeMap<String, usize>>::new();
        let mut biomass = BTreeMap::<Entity, (f64, f64, f64)>::new();
        for (entity, organism) in &self.components.organisms {
            let chunk = self.components.positions[entity].chunk;
            *richness
                .entry(chunk)
                .or_default()
                .entry(organism.species_id.clone())
                .or_default() += 1;
            let growth = &self.components.growth[entity];
            let b = biomass.entry(chunk).or_default();
            b.0 += growth.biomass;
            b.2 += growth.health;
            if self
                .definitions
                .get(&organism.species_id)
                .is_some_and(|d| d.category == "tree")
            {
                b.1 += growth.biomass;
            }
        }
        for (entity, biome) in &mut self.components.biomes {
            let species = richness.get(entity);
            let count = species.map_or(0, |s| s.values().sum::<usize>());
            let unique = species.map_or(0, BTreeMap::len);
            let (total, trees, health) = biomass.get(entity).copied().unwrap_or_default();
            biome.canopy = (trees / 100.0).clamp(0.0, 0.9);
            biome.diversity = (unique as f64 / 5.0).min(1.0);
            biome.pollution = (biome.pollution - (0.00012 + total * 0.000004) * days).max(0.0);
            biome.soil = (biome.soil
                + (0.0001 + biome.diversity * 0.0004 - total * 0.000001) * days)
                .clamp(0.0, 1.0);
            biome.vitality = ((if count > 0 {
                health / count as f64
            } else {
                0.0
            }) * 0.35
                + biome.soil * 0.25
                + (1.0 - biome.pollution) * 0.15
                + biome.diversity * 0.15
                + (count as f64 / 12.0).min(1.0) * 0.1)
                .clamp(0.0, 1.0);
            biome.succession =
                (biome.succession + (biome.vitality - 0.4) * 0.001 * days).clamp(0.0, 1.0);
            biome.invasion =
                (biome.invasion + (0.3 - biome.vitality) * 0.001 * days).clamp(0.0, 1.0);
            let h = self.components.habitats.get_mut(entity).unwrap();
            let climate = &self.components.climates[entity];
            h.extra.insert(
                "groundLight".into(),
                json!(climate.light * (1.0 - biome.canopy * 0.7)),
            );
        }
    }
}

/// Phenology stage this tick. Catalogue species flower and fruit in their listed seasons (a season listed for
/// both flowers first, then fruits); others use `reproduction_seasons` for a flower-then-fruit cycle.
fn phenology_stage(
    def: &SpeciesDefinition,
    season: &str,
    season_progress: f64,
    mature: bool,
) -> &'static str {
    let listed = |seasons: &[String]| seasons.iter().any(|s| s == season);
    let (flowers, fruits) = match &def.ecology {
        Some(e) if !e.flowering_seasons.is_empty() || !e.fruiting_seasons.is_empty() => {
            (listed(&e.flowering_seasons), listed(&e.fruiting_seasons))
        }
        _ => {
            let active = (def.reproduction_seasons.is_empty() && season != "winter")
                || listed(&def.reproduction_seasons);
            (active, active)
        }
    };
    if !(flowers || fruits) {
        let dormant = season == "winter"
            || def
                .ecology
                .as_ref()
                .is_some_and(|e| listed(&e.dormant_seasons));
        return if dormant { "dormant" } else { "vegetative" };
    }
    if !mature {
        "vegetative"
    } else if flowers && (!fruits || season_progress < 0.4) {
        "flowering"
    } else {
        "fruiting"
    }
}
