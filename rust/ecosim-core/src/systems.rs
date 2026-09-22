use crate::{model::*, world::World};
use serde_json::{json, Value};
use std::collections::BTreeMap;

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
            habitat.hybrids.retain_mut(|(_, hybrid)| {
                let duration = hybrid["duration"].as_f64().unwrap_or(0.0) - days;
                hybrid["duration"] = json!(duration);
                let strength = hybrid["strength"].as_f64().unwrap_or(0.8) * days;
                match hybrid["hybridId"].as_str().unwrap_or("") {
                    "purifier_moss" => {
                        biome.apply("pollution", -0.003 * strength);
                        biome.apply("soil", 0.001 * strength);
                    }
                    "ancient_sentinel" => {
                        biome.apply("succession", 0.002 * strength);
                        biome.apply("soil", 0.002 * strength);
                    }
                    _ => {
                        biome.apply("soil", 0.002 * strength);
                        biome.apply("moisture", 0.001 * strength);
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
            let stress = moisture_stress * 0.8
                + temperature_stress * 0.7
                + biome.pollution * 0.7
                + light_stress * 0.4;
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
                * if winter { 0.12 } else { 1.0 };
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

    fn inherit_genetics(&mut self, extra: &BTreeMap<String, Value>) -> Value {
        let mut genetics = extra.get("genetics").filter(|value|value.is_object()).cloned().unwrap_or_else(|| {
            let traits:Vec<_> = ["drought_tolerance","cold_resistance","growth_efficiency","reproduction_vigor","nutrient_efficiency","light_sensitivity","competition_aggression"].iter()
                .map(|id| json!([id,{"id":id,"name":id,"value":0.5,"baseValue":0.5,"mutationRate":0.08,"variance":0.2,"dominance":0.7,"beneficial":true}])).collect();
            json!({"traits":{"__ecosimMap":traits},"generation":0,"mutations":[],"adaptationScore":0.5})
        });
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
            let active = (def.reproduction_seasons.is_empty() && season != "winter")
                || def.reproduction_seasons.iter().any(|s| s == season);
            let mature = growth.biomass >= def.reproduction_threshold && growth.health > 0.4;
            reproduction.stage = if !active {
                "dormant"
            } else if !mature {
                "vegetative"
            } else if season_progress < 0.4 {
                "flowering"
            } else {
                "fruiting"
            }
            .into();
            if reproduction.stage != "fruiting" {
                continue;
            }
            let quality = (biome.soil + biome.moisture + growth.health) / 3.0;
            if quality < def.reproduction_need || biome.moisture < 0.06 {
                continue;
            }
            let pollinator = self.components.habitats[&position.chunk]
                .extra
                .get("pollinatorDensity")
                .and_then(Value::as_f64)
                .unwrap_or(0.4);
            let pollination = if def.pollination == "insect" || def.pollination == "bird" {
                0.3 + pollinator * 0.7
            } else {
                1.0
            };
            reproduction.reserve += 0.075
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
                ));
            }
        }
        let coordinates: BTreeMap<_, _> = self
            .components
            .habitats
            .iter()
            .map(|(id, h)| ((h.x, h.y), *id))
            .collect();
        for (chunk, x, y, species, maturity, dispersal, extra) in offspring {
            let mut target = chunk;
            if dispersal >= 1.0 && self.rng.sample() < 0.25 {
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
            let mut seed_extra = BTreeMap::new();
            seed_extra.insert("genetics".into(), self.inherit_genetics(&extra));
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
        let mut population = BTreeMap::<Entity, usize>::new();
        for position in self.components.positions.values() {
            *population.entry(position.chunk).or_default() += 1;
        }
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
                let density = *count as f64 / self.config.max_population_per_chunk as f64;
                if self.rng.sample() < seed.viability * 0.14 * days * (1.0 - density) {
                    births.push((*chunk, seed.clone()));
                    *count += 1;
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
            let pollinator =
                (0.1 + biome.diversity * 0.5 + biome.canopy * 0.1 + climate.light * 0.2)
                    * (1.0 - biome.pollution);
            let birds = json!({"swift":(1.0-biome.canopy)*pollinator,"robin":biome.vitality*0.6,"owl":biome.canopy*0.7});
            let birds_total = birds
                .as_object()
                .unwrap()
                .values()
                .filter_map(Value::as_f64)
                .sum::<f64>();
            h.extra
                .insert("pollinatorDensity".into(), json!(pollinator));
            h.extra.insert("birds".into(), birds);
            h.extra.insert("birdsTotal".into(), json!(birds_total));
            h.extra
                .insert("birdsActivity".into(), json!(birds_total * 0.8));
            h.extra.insert(
                "groundLight".into(),
                json!(climate.light * (1.0 - biome.canopy * 0.7)),
            );
        }
    }
}
