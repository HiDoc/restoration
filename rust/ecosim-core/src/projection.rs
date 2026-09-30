//! Borrowed renderer projections: serialize ECS components without cloning genetic trees.
use crate::{genetics::origin_of, model::*, world::World};
use serde::{ser::SerializeMap, Serialize, Serializer};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Snapshot<'a> {
    tick: u64,
    sim_time_days: f64,
    season: &'static str,
    year: u64,
    chunks: Vec<Chunk<'a>>,
    /// Seeds in hand per species.
    inventory: BTreeMap<&'a str, usize>,
    /// Seeds in hand per species and the site each was set on ("" for packet seed).
    pouch: BTreeMap<&'a str, BTreeMap<&'a str, usize>>,
    /// Plants the player follows, by instance id.
    tags: &'a BTreeMap<String, Tag>,
    /// The player's crosses, for the notebook.
    crosses: &'a [Cross],
    /// Each species' trait spread when first recorded, to compare with the living plants.
    baselines: &'a BTreeMap<String, Baseline>,
    /// Hybrid taxa bred so far; the host knows only the species it defined.
    hybrids: Vec<&'a SpeciesDefinition>,
    weather_events: &'a [Weather],
}

/// A buried seed as the host sees it: its kind and viability, and in a detailed read where it lies. Its genetics
/// stay in the engine (a hex holds up to 128 seeds, and their genetics would double the projection).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SeedView<'a> {
    species_id: &'a str,
    viability: f64,
    /// Where it lies and how long until it can sprout: in a detailed read only.
    #[serde(skip_serializing_if = "Option::is_none")]
    x: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    y: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    maturity_ticks: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Chunk<'a> {
    id: &'a str,
    x: i32,
    y: i32,
    biome_state: &'a Biome,
    climate_state: &'a Climate,
    last_update_tick: u64,
    species: Vec<(&'a str, Plant<'a>)>,
    ritual_residues: &'a [(String, Value)],
    seed_bank: Vec<SeedView<'a>>,
    elevation: f64,
    /// Water running to each neighbouring hex, per day.
    outflow: BTreeMap<&'a str, f64>,
    /// Mycelium per fungus, and the fungi fruiting here now.
    fungi: Option<&'a BTreeMap<String, f64>>,
    fruiting: Vec<&'a str>,
    /// The hex's latest soil and water sample.
    #[serde(skip_serializing_if = "Option::is_none")]
    sample: Option<&'a Sample>,
    #[serde(flatten)]
    extra: &'a BTreeMap<String, Value>,
}

/// A plant in the projection. The summary sent every tick keeps what the map, the Codex and goals read; a
/// detailed read adds its place in the hex, pollen and genetics (most of a plant's size).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Plant<'a> {
    id: &'a str,
    species_id: &'a str,
    age: u64,
    age_days: f64,
    biomass: f64,
    health: f64,
    phenology_stage: &'a str,
    reproductive_output: f64,
    /// Why the plant struggles, if it does.
    #[serde(skip_serializing_if = "Option::is_none")]
    limit: Option<&'a str>,
    #[serde(flatten)]
    detail: Option<PlantDetail<'a>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlantDetail<'a> {
    x: f64,
    y: f64,
    reproductive_urge: f64,
    last_reproduction_attempt: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pollen: Option<&'a Pollen>,
    #[serde(flatten)]
    extra: PlantExtras<'a>,
}

struct PlantExtras<'a>(&'a BTreeMap<String, Value>);
impl Serialize for PlantExtras<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        for (key, value) in self.0 {
            if !["ageDays", "reproductiveUrge", "lastReproductionAttempt"].contains(&key.as_str()) {
                map.serialize_entry(key, value)?;
            }
        }
        map.end()
    }
}

impl World {
    pub(crate) fn sim_time_days(&self) -> f64 {
        self.elapsed_minutes as f64 / 1440.0
    }

    /// The projection; `detail` adds each plant's place, pollen and genetics.
    pub(crate) fn snapshot_view(&self, detail: bool) -> Snapshot<'_> {
        let mut by_chunk = BTreeMap::<Entity, Vec<(&str, Plant<'_>)>>::new();
        for (entity, organism) in &self.components.organisms {
            let position = &self.components.positions[entity];
            let growth = &self.components.growth[entity];
            let reproduction = &self.components.reproduction[entity];
            by_chunk.entry(position.chunk).or_default().push((
                &organism.id,
                Plant {
                    id: &organism.id,
                    species_id: &organism.species_id,
                    age: growth.age,
                    age_days: growth.age_days,
                    biomass: growth.biomass,
                    health: growth.health,
                    phenology_stage: &reproduction.stage,
                    reproductive_output: reproduction.reserve,
                    limit: growth.limit.as_deref().or_else(|| {
                        // Healthy but barren: an animal-pollinated bloom nothing visited.
                        let def = self.definitions.get(&organism.species_id)?;
                        (reproduction.stage == "fruiting"
                            && matches!(def.pollination.as_str(), "insect" | "bird")
                            && reproduction.pollinated < 0.2)
                            .then_some("no_pollinator")
                    }),
                    detail: detail.then(|| PlantDetail {
                        x: position.x,
                        y: position.y,
                        reproductive_urge: reproduction.reserve.min(1.0),
                        last_reproduction_attempt: organism
                            .extra
                            .get("lastReproductionAttempt")
                            .cloned()
                            .unwrap_or(Value::from(0)),
                        pollen: reproduction.pollen.as_ref(),
                        extra: PlantExtras(&organism.extra),
                    }),
                },
            ));
        }
        let chunks = self
            .components
            .habitats
            .iter()
            .map(|(entity, habitat)| Chunk {
                id: &habitat.id,
                x: habitat.x,
                y: habitat.y,
                biome_state: &self.components.biomes[entity],
                climate_state: &self.components.climates[entity],
                last_update_tick: self.tick,
                species: by_chunk.remove(entity).unwrap_or_default(),
                ritual_residues: &habitat.residues,
                seed_bank: habitat
                    .seeds
                    .iter()
                    .map(|seed| SeedView {
                        species_id: &seed.species_id,
                        viability: seed.viability,
                        x: detail.then_some(seed.x),
                        y: detail.then_some(seed.y),
                        maturity_ticks: detail.then_some(seed.maturity_ticks),
                    })
                    .collect(),
                elevation: habitat.elevation,
                outflow: self
                    .flows
                    .range((*entity, 0)..=(*entity, Entity::MAX))
                    .map(|((_, to), amount)| (self.components.habitats[to].id.as_str(), *amount))
                    .collect(),
                sample: self.samples.get(&habitat.id),
                fungi: self.fungi.get(entity),
                fruiting: self.fruiting_in(*entity),
                extra: &habitat.extra,
            })
            .collect();
        Snapshot {
            tick: self.tick,
            sim_time_days: self.sim_time_days(),
            season: self.season(),
            year: self.elapsed_minutes / (self.config.season_length_ticks * 1440 * 4),
            chunks,
            inventory: self
                .inventory
                .iter()
                .fold(BTreeMap::new(), |mut counts, seed| {
                    *counts.entry(seed.species_id.as_str()).or_default() += 1;
                    counts
                }),
            pouch: self
                .inventory
                .iter()
                .fold(BTreeMap::new(), |mut counts, seed| {
                    *counts
                        .entry(seed.species_id.as_str())
                        .or_insert_with(BTreeMap::new)
                        .entry(origin_of(&seed.extra))
                        .or_default() += 1;
                    counts
                }),
            tags: &self.tags,
            crosses: &self.crosses,
            baselines: &self.baselines,
            hybrids: self
                .definitions
                .values()
                .filter(|def| !def.hybrid_of.is_empty())
                .collect(),
            weather_events: &self.weather,
        }
    }
}
