use crate::model::*;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

pub const SAVE_VERSION: u32 = 1;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct World {
    pub version: u32,
    pub config: Config,
    pub tick: u64,
    pub elapsed_minutes: u64,
    pub next_entity_id: Entity,
    pub next_command_sequence: u64,
    pub rng: Rng,
    pub components: Components,
    pub definitions: BTreeMap<String, SpeciesDefinition>,
    pub pending_commands: Vec<QueuedCommand>,
    #[serde(default)]
    pub weather: Vec<Weather>,
    #[serde(skip)]
    pub events: Vec<Event>,
}

impl World {
    pub fn new(
        config: Config,
        chunks: Vec<ChunkSnapshot>,
        definitions: Vec<SpeciesDefinition>,
    ) -> Result<Self, String> {
        config.validate()?;
        let mut world = Self {
            version: SAVE_VERSION,
            rng: Rng::new(config.master_seed),
            config,
            tick: 0,
            elapsed_minutes: 0,
            next_entity_id: 1,
            next_command_sequence: 0,
            components: Components::default(),
            definitions: BTreeMap::new(),
            pending_commands: vec![],
            weather: vec![],
            events: vec![],
        };
        world.set_definitions(definitions)?;
        if chunks.is_empty() {
            world.generate_world()?;
        } else {
            world.sync(chunks)?;
        }
        Ok(world)
    }

    pub fn set_definitions(&mut self, definitions: Vec<SpeciesDefinition>) -> Result<(), String> {
        for def in &definitions {
            if def.id.is_empty()
                || !def.max_biomass.is_finite()
                || def.max_biomass <= 0.0
                || def.growth_rate < 0.0
                || def.temperature_range.min > def.temperature_range.max
                || def.moisture_range.min > def.moisture_range.max
            {
                return Err(format!("Invalid species definition: {}", def.id));
            }
        }
        if definitions.is_empty() && self.definitions.is_empty() {
            let def = SpeciesDefinition::default();
            self.definitions.insert(def.id.clone(), def);
        }
        for def in definitions {
            self.definitions.insert(def.id.clone(), def);
        }
        Ok(())
    }

    fn allocate(&mut self) -> Entity {
        let id = self.next_entity_id;
        self.next_entity_id += 1;
        id
    }

    fn generate_world(&mut self) -> Result<(), String> {
        let mut chunks = vec![];
        for x in 0..self.config.world_width as i32 {
            for y in 0..self.config.world_height as i32 {
                chunks.push(ChunkSnapshot {
                    id: format!("chunk_{x}_{y}"),
                    x,
                    y,
                    biome_state: Biome {
                        soil: 0.4 + self.rng.sample() * 0.4,
                        moisture: 0.35 + self.rng.sample() * 0.3,
                        pollution: self.rng.sample() * 0.15,
                        ..Biome::default()
                    },
                    climate_state: Climate::default(),
                    last_update_tick: 0,
                    species: vec![],
                    hybrids: vec![],
                    ritual_residues: vec![],
                    seed_bank: vec![],
                    extra: BTreeMap::new(),
                });
            }
        }
        self.sync(chunks)?;
        let center_x = (self.config.world_width / 2) as i32;
        let center_y = (self.config.world_height / 2) as i32;
        let centers: Vec<_> = self
            .components
            .habitats
            .iter()
            .filter(|(_, h)| (h.x - center_x).abs() <= 1 && (h.y - center_y).abs() <= 1)
            .map(|(e, _)| *e)
            .collect();
        let species = self.definitions.keys().next().cloned().unwrap();
        for entity in centers {
            for _ in 0..3 {
                let x = self.rng.sample();
                let y = self.rng.sample();
                self.spawn(entity, &species, x, y, 0.15);
            }
        }
        Ok(())
    }

    /// Import browser projections without resetting the RNG or stable organism identities.
    pub fn sync(&mut self, mut chunks: Vec<ChunkSnapshot>) -> Result<(), String> {
        if chunks.len() > 65536 {
            return Err("Too many chunks".into());
        }
        chunks.sort_by(|a, b| a.id.cmp(&b.id));
        let mut seen_chunks = BTreeSet::new();
        let mut seen_plants = BTreeSet::new();
        for chunk in &chunks {
            if chunk.x < 0
                || chunk.y < 0
                || chunk.x as u32 >= self.config.world_width
                || chunk.y as u32 >= self.config.world_height
            {
                return Err("Chunk coordinates outside world".into());
            }
            if chunk
                .hybrids
                .iter()
                .chain(chunk.ritual_residues.iter())
                .any(|(_, value)| !value.is_object())
            {
                return Err("Effect records must be objects".into());
            }
            if !seen_chunks.insert(&chunk.id) {
                return Err("Duplicate chunk identifier".into());
            }
            if chunk.species.len() > self.config.max_population_per_chunk
                || chunk.seed_bank.len() > 4096
            {
                return Err("Chunk population or seed bank exceeds its limit".into());
            }
            for (_, plant) in &chunk.species {
                if !seen_plants.insert(&plant.id) {
                    return Err("Duplicate organism identifier".into());
                }
                if plant.id.is_empty()
                    || plant.biomass < 0.0
                    || !(0.0..=1.0).contains(&plant.health)
                {
                    return Err("Invalid organism state".into());
                }
            }
            if chunk
                .seed_bank
                .iter()
                .any(|s| !(0.0..=1.0).contains(&s.viability))
            {
                return Err("Invalid seed viability".into());
            }
        }
        let habitat_lookup: BTreeMap<_, _> = self
            .components
            .habitats
            .iter()
            .map(|(e, h)| (h.id.clone(), *e))
            .collect();
        let plant_lookup: BTreeMap<_, _> = self
            .components
            .organisms
            .iter()
            .map(|(e, p)| (p.id.clone(), *e))
            .collect();
        for chunk in chunks {
            let entity = habitat_lookup
                .get(&chunk.id)
                .copied()
                .unwrap_or_else(|| self.allocate());
            let removals: Vec<_> = self
                .components
                .positions
                .iter()
                .filter(|(_, p)| p.chunk == entity)
                .map(|(e, _)| *e)
                .collect();
            for id in removals {
                self.despawn(id);
            }
            let mut biome = chunk.biome_state;
            biome.normalize();
            self.components.biomes.insert(entity, biome);
            self.components.climates.insert(entity, chunk.climate_state);
            self.components.habitats.insert(
                entity,
                Habitat {
                    id: chunk.id,
                    x: chunk.x,
                    y: chunk.y,
                    seeds: chunk.seed_bank,
                    hybrids: chunk.hybrids,
                    residues: chunk.ritual_residues,
                    extra: chunk.extra,
                },
            );
            let mut plants = chunk.species;
            plants.sort_by(|a, b| a.1.id.cmp(&b.1.id));
            for (_, plant) in plants {
                let age_days = plant
                    .extra
                    .get("ageDays")
                    .and_then(Value::as_f64)
                    .unwrap_or(
                        plant.age as f64 * self.config.time_per_tick_minutes as f64 / 1440.0,
                    );
                let id = plant_lookup
                    .get(&plant.id)
                    .copied()
                    .unwrap_or_else(|| self.allocate());
                self.components.positions.insert(
                    id,
                    Position {
                        chunk: entity,
                        x: plant.x.clamp(0.0, 1.0),
                        y: plant.y.clamp(0.0, 1.0),
                    },
                );
                self.components.organisms.insert(
                    id,
                    Organism {
                        id: plant.id,
                        species_id: plant.species_id,
                        extra: plant.extra,
                    },
                );
                self.components.growth.insert(
                    id,
                    Growth {
                        age: plant.age,
                        age_days,
                        biomass: plant.biomass.max(0.0),
                        health: plant.health.clamp(0.0, 1.0),
                    },
                );
                self.components.reproduction.insert(
                    id,
                    Reproduction {
                        stage: plant.phenology_stage,
                        reserve: plant.reproductive_output.max(0.0),
                    },
                );
            }
        }
        Ok(())
    }

    pub fn spawn(
        &mut self,
        chunk: Entity,
        species_id: &str,
        x: f64,
        y: f64,
        fraction: f64,
    ) -> Entity {
        let id = self.allocate();
        let maximum = self
            .definitions
            .get(species_id)
            .map_or(0.5, |d| d.max_biomass);
        self.components.positions.insert(
            id,
            Position {
                chunk,
                x: x.clamp(0.0, 1.0),
                y: y.clamp(0.0, 1.0),
            },
        );
        self.components.organisms.insert(
            id,
            Organism {
                id: format!("ecs_{id}"),
                species_id: species_id.into(),
                extra: BTreeMap::new(),
            },
        );
        self.components.growth.insert(
            id,
            Growth {
                biomass: maximum * fraction,
                health: 0.9,
                age: 0,
                age_days: 0.0,
            },
        );
        self.components.reproduction.insert(
            id,
            Reproduction {
                stage: "vegetative".into(),
                reserve: 0.0,
            },
        );
        id
    }

    pub fn despawn(&mut self, id: Entity) {
        self.components.positions.remove(&id);
        self.components.organisms.remove(&id);
        self.components.growth.remove(&id);
        self.components.reproduction.remove(&id);
    }

    pub fn season(&self) -> &'static str {
        ["spring", "summer", "autumn", "winter"]
            [(self.elapsed_minutes / (self.config.season_length_ticks * 1440) % 4) as usize]
    }

    pub fn emit(&mut self, kind: &str, chunk: Entity, data: Value) {
        self.events.push(Event {
            tick: self.tick,
            kind: kind.into(),
            chunk_id: self.components.habitats[&chunk].id.clone(),
            data,
        });
    }

    pub fn submit(&mut self, command: Command) -> Result<(), String> {
        self.validate_command(&command)?;
        if command.tick.is_some_and(|t| t < self.tick) {
            return Err("Cannot schedule a command in the past".into());
        }
        if command.tick.is_none_or(|t| t == self.tick) {
            return self.apply_command(command);
        }
        self.pending_commands.push(QueuedCommand {
            sequence: self.next_command_sequence,
            command,
        });
        self.next_command_sequence += 1;
        self.pending_commands
            .sort_by_key(|q| (q.command.tick, q.sequence));
        Ok(())
    }

    fn validate_command(&self, command: &Command) -> Result<(), String> {
        if !self
            .components
            .habitats
            .values()
            .any(|h| h.id == command.chunk_id)
        {
            return Err("Unknown chunk".into());
        }
        if !["plant", "irrigate", "cleanse", "ritual", "hybridize"].contains(&command.kind.as_str())
        {
            return Err("Unknown intervention type".into());
        }
        if command.kind == "plant" {
            let species = command
                .data
                .get("speciesId")
                .and_then(Value::as_str)
                .unwrap_or("");
            if !self.definitions.contains_key(species) {
                return Err("Unknown species".into());
            }
        }
        Ok(())
    }

    fn apply_command(&mut self, command: Command) -> Result<(), String> {
        let chunk = *self
            .components
            .habitats
            .iter()
            .find(|(_, h)| h.id == command.chunk_id)
            .ok_or("Unknown chunk")?
            .0;
        let amount = command
            .data
            .get("amount")
            .and_then(Value::as_f64)
            .unwrap_or(0.3)
            .clamp(0.0, 1.0);
        match command.kind.as_str() {
            "plant" => {
                if self
                    .components
                    .positions
                    .values()
                    .filter(|p| p.chunk == chunk)
                    .count()
                    >= self.config.max_population_per_chunk
                {
                    return Err("Habitat is at carrying capacity".into());
                }
                let species = command.data["speciesId"]
                    .as_str()
                    .ok_or("Missing speciesId")?;
                self.spawn(chunk, species, command.x, command.y, 0.2);
            }
            "irrigate" => self
                .components
                .biomes
                .get_mut(&chunk)
                .unwrap()
                .apply("moisture", amount),
            "cleanse" => self
                .components
                .biomes
                .get_mut(&chunk)
                .unwrap()
                .apply("pollution", -amount),
            "ritual" => {
                let biome = self.components.biomes.get_mut(&chunk).unwrap();
                biome.apply("soil", 0.15);
                biome.apply("moisture", 0.1);
                biome.apply("pollution", -0.1);
            }
            "hybridize" => {
                let hybrid_id = command
                    .data
                    .get("hybridId")
                    .and_then(Value::as_str)
                    .unwrap_or("growth_bloom");
                let id = format!("hybrid_{}", self.allocate());
                self.components.habitats.get_mut(&chunk).unwrap().hybrids.push((id.clone(), json!({"id":id,"hybridId":hybrid_id,"x":command.x,"y":command.y,"parentA":command.data.get("parentA").cloned().unwrap_or(json!("common_grass")),"parentB":command.data.get("parentB").cloned().unwrap_or(json!("healing_fern")),"effectRadius":1,"strength":0.8,"duration":90})));
            }
            _ => return Err("Unknown intervention type".into()),
        }
        self.emit(
            "player_intervention",
            chunk,
            serde_json::to_value(&command).map_err(|error| error.to_string())?,
        );
        Ok(())
    }

    pub fn step(&mut self, ticks: u32) -> Result<(), String> {
        if ticks > 10000 {
            return Err("A single request may advance at most 10000 ticks".into());
        }
        if self.tick.checked_add(u64::from(ticks)).is_none()
            || self
                .elapsed_minutes
                .checked_add(u64::from(ticks) * self.config.time_per_tick_minutes)
                .is_none()
        {
            return Err("Simulation clock overflow".into());
        }
        for _ in 0..ticks {
            self.tick += 1;
            self.elapsed_minutes += self.config.time_per_tick_minutes;
            let count = self
                .pending_commands
                .partition_point(|q| q.command.tick.unwrap_or(0) <= self.tick);
            let commands: Vec<_> = self.pending_commands.drain(..count).collect();
            for queued in commands {
                if let Err(error) = self.apply_command(queued.command.clone()) {
                    self.events.push(Event {
                        tick: self.tick,
                        kind: "command_rejected".into(),
                        chunk_id: queued.command.chunk_id,
                        data: json!({"reason":error,"sequence":queued.sequence}),
                    });
                }
            }
            // One deterministic schedule. No frame time, adaptive budgets, or active-camera filtering.
            self.climate_system();
            self.hydrology_system();
            self.effect_system();
            self.growth_system();
            self.reproduction_system();
            self.germination_system();
            self.diffusion_system();
            self.ecosystem_system();
        }
        Ok(())
    }

    pub fn snapshot(&self) -> Value {
        serde_json::to_value(self.snapshot_view())
            .expect("ECS projections contain only JSON values")
    }

    pub fn validate_state(&self) -> Result<(), String> {
        if self.version != SAVE_VERSION {
            return Err(format!(
                "Unsupported Rust simulation save version {}",
                self.version
            ));
        }
        self.config.validate()?;
        if self.config.season_length_ticks == 0
            || self.config.time_per_tick_minutes == 0
            || self.rng.state == 0
        {
            return Err("Invalid simulation clock or RNG state".into());
        }
        let c = &self.components;
        let entities: BTreeSet<_> = c.organisms.keys().collect();
        if entities != c.positions.keys().collect()
            || entities != c.growth.keys().collect()
            || entities != c.reproduction.keys().collect()
        {
            return Err("Incomplete organism components".into());
        }
        let habitats: BTreeSet<_> = c.habitats.keys().collect();
        if habitats.is_empty() || habitats.len() > 65536 || !habitats.is_disjoint(&entities) {
            return Err("Invalid habitat entity set".into());
        }
        if habitats != c.biomes.keys().collect() || habitats != c.climates.keys().collect() {
            return Err("Incomplete habitat components".into());
        }
        if c.positions
            .values()
            .any(|p| !c.habitats.contains_key(&p.chunk))
            || c.organisms
                .keys()
                .chain(c.habitats.keys())
                .any(|id| *id >= self.next_entity_id)
        {
            return Err("Invalid entity reference or allocator state".into());
        }
        if self.next_entity_id == u64::MAX
            || self.tick == u64::MAX
            || self.elapsed_minutes == u64::MAX
            || self.next_command_sequence == u64::MAX
        {
            return Err("Simulation counters exhausted".into());
        }
        let mut names = BTreeSet::new();
        if c.organisms.values().any(|p| !names.insert(&p.id)) {
            return Err("Duplicate organism identifier".into());
        }
        if c.growth.values().any(|g| {
            !g.biomass.is_finite()
                || g.biomass < 0.0
                || !(0.0..=1.0).contains(&g.health)
                || g.age == u64::MAX
                || !g.age_days.is_finite()
                || g.age_days < 0.0
        }) {
            return Err("Invalid growth component".into());
        }
        if c.positions
            .values()
            .any(|p| !(0.0..=1.0).contains(&p.x) || !(0.0..=1.0).contains(&p.y))
        {
            return Err("Invalid position component".into());
        }
        if c.reproduction
            .values()
            .any(|r| !r.reserve.is_finite() || r.reserve < 0.0)
        {
            return Err("Invalid reproduction component".into());
        }
        let mut habitat_names = BTreeSet::new();
        for habitat in c.habitats.values() {
            if !habitat_names.insert(&habitat.id)
                || habitat.x < 0
                || habitat.y < 0
                || habitat.x as u32 >= self.config.world_width
                || habitat.y as u32 >= self.config.world_height
                || habitat.seeds.len() > 4096
                || habitat
                    .hybrids
                    .iter()
                    .chain(habitat.residues.iter())
                    .any(|(_, value)| !value.is_object())
            {
                return Err("Invalid habitat component".into());
            }
        }
        if self.definitions.values().any(|d| {
            d.max_biomass <= 0.0
                || !d.max_biomass.is_finite()
                || !d.growth_rate.is_finite()
                || d.growth_rate < 0.0
                || d.temperature_range.min > d.temperature_range.max
                || d.moisture_range.min > d.moisture_range.max
        }) {
            return Err("Invalid species definition".into());
        }
        let mut previous = None;
        for queued in &self.pending_commands {
            self.validate_command(&queued.command)?;
            let tick = queued.command.tick.ok_or("Queued command missing tick")?;
            let key = (tick, queued.sequence);
            if tick <= self.tick
                || queued.sequence >= self.next_command_sequence
                || previous.is_some_and(|p| p >= key)
            {
                return Err("Invalid command queue order".into());
            }
            previous = Some(key);
        }
        if self.weather.len() > 2
            || self.weather.iter().any(|w| {
                !(0.0..=1.0).contains(&w.intensity)
                    || w.radius < 0
                    || w.radius > 65536
                    || !["storm", "drought", "cold_snap"].contains(&w.kind.as_str())
            })
        {
            return Err("Invalid weather state".into());
        }
        Ok(())
    }
}
