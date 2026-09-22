//! Borrowed renderer projections: serialize ECS components without cloning genetic trees.
use crate::{model::*, world::World};
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
    weather_events: &'a [Weather],
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
    hybrids: &'a [(String, Value)],
    ritual_residues: &'a [(String, Value)],
    seed_bank: &'a [Seed],
    #[serde(flatten)]
    extra: &'a BTreeMap<String, Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Plant<'a> {
    id: &'a str,
    species_id: &'a str,
    x: f64,
    y: f64,
    age: u64,
    age_days: f64,
    biomass: f64,
    health: f64,
    phenology_stage: &'a str,
    reproductive_output: f64,
    reproductive_urge: f64,
    last_reproduction_attempt: Value,
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
    pub(crate) fn snapshot_view(&self) -> Snapshot<'_> {
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
                    x: position.x,
                    y: position.y,
                    age: growth.age,
                    age_days: growth.age_days,
                    biomass: growth.biomass,
                    health: growth.health,
                    phenology_stage: &reproduction.stage,
                    reproductive_output: reproduction.reserve,
                    reproductive_urge: reproduction.reserve.min(1.0),
                    last_reproduction_attempt: organism
                        .extra
                        .get("lastReproductionAttempt")
                        .cloned()
                        .unwrap_or(Value::from(0)),
                    extra: PlantExtras(&organism.extra),
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
                hybrids: &habitat.hybrids,
                ritual_residues: &habitat.residues,
                seed_bank: &habitat.seeds,
                extra: &habitat.extra,
            })
            .collect();
        Snapshot {
            tick: self.tick,
            sim_time_days: self.elapsed_minutes as f64 / 1440.0,
            season: self.season(),
            year: self.elapsed_minutes / (self.config.season_length_ticks * 1440 * 4),
            chunks,
            weather_events: &self.weather,
        }
    }
}
