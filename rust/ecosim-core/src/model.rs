use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

pub type Entity = u64;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub world_width: u32,
    pub world_height: u32,
    pub master_seed: u32,
    pub season_length_ticks: u64,
    pub time_per_tick_minutes: u64,
    pub max_population_per_chunk: usize,
}
impl Default for Config {
    fn default() -> Self {
        Self {
            world_width: 3,
            world_height: 3,
            master_seed: 42,
            season_length_ticks: 90,
            time_per_tick_minutes: 1440,
            max_population_per_chunk: 64,
        }
    }
}
impl Config {
    pub fn validate(&self) -> Result<(), String> {
        if self.world_width == 0
            || self.world_height == 0
            || u64::from(self.world_width) * u64::from(self.world_height) > 65536
        {
            return Err("World dimensions must contain 1..65536 chunks".into());
        }
        if self.season_length_ticks == 0
            || self.season_length_ticks > 100_000
            || !(1..=1440).contains(&self.time_per_tick_minutes)
        {
            return Err(
                "Season length must be 1..100000 days and tick duration 1..1440 minutes".into(),
            );
        }
        if !(1..=1024).contains(&self.max_population_per_chunk) {
            return Err("Population limit must be 1..1024".into());
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Biome {
    pub vitality: f64,
    pub soil: f64,
    pub moisture: f64,
    pub diversity: f64,
    pub canopy: f64,
    pub pollution: f64,
    pub invasion: f64,
    pub succession: f64,
    /// Water standing above saturated ground, as a pond's depth [0-1].
    pub standing_water: f64,
}
impl Default for Biome {
    fn default() -> Self {
        Self {
            vitality: 0.5,
            soil: 0.6,
            moisture: 0.5,
            diversity: 0.0,
            canopy: 0.0,
            pollution: 0.05,
            invasion: 0.1,
            succession: 0.2,
            standing_water: 0.0,
        }
    }
}
impl Biome {
    /// Share a hex's water between the soil and, past saturation, standing water.
    pub fn set_water(&mut self, water: f64) {
        let water = water.max(0.0);
        self.moisture = water.min(1.0);
        self.standing_water = (water - 1.0).clamp(0.0, 1.0);
    }
    pub fn normalize(&mut self) {
        for value in [
            &mut self.vitality,
            &mut self.soil,
            &mut self.moisture,
            &mut self.diversity,
            &mut self.canopy,
            &mut self.pollution,
            &mut self.invasion,
            &mut self.succession,
            &mut self.standing_water,
        ] {
            *value = value.clamp(0.0, 1.0);
        }
    }
    pub fn apply(&mut self, name: &str, amount: f64) {
        let field = match name {
            "vitality" => &mut self.vitality,
            "soil" => &mut self.soil,
            "moisture" => &mut self.moisture,
            "diversity" => &mut self.diversity,
            "canopy" => &mut self.canopy,
            "pollution" => &mut self.pollution,
            "invasion" => &mut self.invasion,
            "succession" => &mut self.succession,
            "standing_water" => &mut self.standing_water,
            _ => return,
        };
        *field = (*field + amount).clamp(0.0, 1.0);
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Climate {
    pub temperature: f64,
    pub light: f64,
    pub wind: f64,
    pub rain_likelihood: f64,
}
impl Default for Climate {
    fn default() -> Self {
        Self {
            temperature: 18.0,
            light: 0.8,
            wind: 0.25,
            rain_likelihood: 0.16,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Seed {
    pub species_id: String,
    pub x: f64,
    pub y: f64,
    pub viability: f64,
    pub maturity_ticks: u64,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeciesInstance {
    pub id: String,
    pub species_id: String,
    pub x: f64,
    pub y: f64,
    pub age: u64,
    pub biomass: f64,
    pub health: f64,
    pub phenology_stage: String,
    #[serde(default)]
    pub reproductive_output: f64,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkSnapshot {
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub biome_state: Biome,
    pub climate_state: Climate,
    #[serde(default)]
    pub last_update_tick: u64,
    #[serde(default)]
    pub species: Vec<(String, SpeciesInstance)>,
    #[serde(default)]
    pub ritual_residues: Vec<(String, Value)>,
    #[serde(default)]
    pub seed_bank: Vec<Seed>,
    /// Height of the ground, 0 in a hollow to 1 on a rise; water runs downhill.
    #[serde(default = "flat")]
    pub elevation: f64,
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

/// The height of ground nobody has shaped: level with its neighbours.
pub fn flat() -> f64 {
    0.5
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Range {
    pub min: f64,
    pub max: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SpeciesDefinition {
    pub id: String,
    pub category: String,
    pub max_biomass: f64,
    pub growth_rate: f64,
    pub lifespan_ticks: u64,
    pub reproduction_threshold: f64,
    pub reproduction_need: f64,
    pub seed_production: f64,
    pub seed_maturity_ticks: u64,
    pub reproduction_seasons: Vec<String>,
    pub temperature_range: Range,
    pub moisture_range: Range,
    pub light_requirement: f64,
    pub shade_tolerance_max: f64,
    pub dispersal_range: f64,
    pub pollination: String,
    /// Age before a plant can flower; 0 means biomass alone decides.
    pub maturity_days: f64,
    /// New shoots per plant per growing day from runners, rhizomes or bulbs.
    pub clonal_rate: f64,
    /// Catalogue phenology; when absent, `reproduction_seasons` drives a flower-then-fruit cycle.
    pub ecology: Option<Ecology>,
    /// Only species of one genus can cross. Empty means the species crosses with nothing.
    pub genus: String,
    /// For a hybrid, the non-hybrid species it descends from, sorted.
    pub hybrid_of: Vec<String>,
    /// How well roots stand standing water [0-1]: 0 drowns, 1 is a marsh plant.
    pub flood_tolerance: f64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Ecology {
    pub flowering_seasons: Vec<String>,
    pub fruiting_seasons: Vec<String>,
    pub dormant_seasons: Vec<String>,
}

impl Default for SpeciesDefinition {
    fn default() -> Self {
        Self {
            id: "common_grass".into(),
            category: "grass".into(),
            max_biomass: 0.5,
            growth_rate: 1.5,
            lifespan_ticks: 2000,
            reproduction_threshold: 0.05,
            reproduction_need: 0.3,
            seed_production: 120.0,
            seed_maturity_ticks: 2,
            reproduction_seasons: vec!["spring".into(), "summer".into(), "autumn".into()],
            temperature_range: Range {
                min: -5.0,
                max: 35.0,
            },
            moisture_range: Range { min: 0.1, max: 0.9 },
            light_requirement: 0.3,
            shade_tolerance_max: 0.4,
            dispersal_range: 2.0,
            pollination: "self".into(),
            maturity_days: 0.0,
            clonal_rate: 0.0,
            ecology: None,
            genus: String::new(),
            hybrid_of: vec![],
            flood_tolerance: 0.0,
        }
    }
}

/// An animal species: what it eats, where it can breed and when it is about.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct FaunaDefinition {
    pub id: String,
    /// "bee", "butterfly", "hoverfly", "bird", …
    pub group: String,
    pub active_seasons: Vec<String>,
    pub temperature_range: Range,
    pub pollution_tolerance: f64,
    /// Hexes it forages across; also how far it spreads.
    pub foraging_range: u32,
    /// Animals supported per unit of forage (one plant in the right stage × link strength).
    pub capacity_per_forage: f64,
    pub forage: Vec<FaunaLink>,
    /// Larval host or nesting plants.
    pub hosts: Vec<String>,
    /// Without a host in range the population cannot breed (e.g. butterflies without larval food plants).
    pub needs_host: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct FaunaLink {
    pub plant: String,
    pub strength: f64,
    /// "nectar" (plant flowering), "fruit" or "seed" (plant fruiting), "insects" (plant not dormant).
    pub takes: String,
    pub pollinates: bool,
    pub disperses: bool,
}

/// Components live in independent stores; the renderer's chunk shape is only a projection.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Position {
    pub chunk: Entity,
    pub x: f64,
    pub y: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Organism {
    pub id: String,
    pub species_id: String,
    pub extra: BTreeMap<String, Value>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Growth {
    pub biomass: f64,
    pub health: f64,
    pub age: u64,
    #[serde(default)]
    pub age_days: f64,
    /// What is costing this plant health, when it is losing any: its largest stress.
    #[serde(default)]
    pub limit: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Reproduction {
    pub stage: String,
    pub reserve: f64,
    /// How well the current bloom was pollinated [0-1]; sets seed output when it fruits.
    #[serde(default)]
    pub pollinated: f64,
    /// Pollen the player placed on this bloom; its seed is then hybrid.
    #[serde(default)]
    pub pollen: Option<Pollen>,
}

/// A rare event's lasting effect, such as a superbloom or a mast year, running until a tick.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RareEffect {
    pub kind: String,
    pub until_tick: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pollen {
    pub species_id: String,
    pub genetics: Value,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Habitat {
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub seeds: Vec<Seed>,
    pub residues: Vec<(String, Value)>,
    #[serde(default = "flat")]
    pub elevation: f64,
    pub extra: BTreeMap<String, Value>,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Components {
    pub habitats: BTreeMap<Entity, Habitat>,
    pub biomes: BTreeMap<Entity, Biome>,
    pub climates: BTreeMap<Entity, Climate>,
    pub positions: BTreeMap<Entity, Position>,
    pub organisms: BTreeMap<Entity, Organism>,
    pub growth: BTreeMap<Entity, Growth>,
    pub reproduction: BTreeMap<Entity, Reproduction>,
    /// Animal abundance per habitat per fauna species.
    #[serde(default)]
    pub fauna: BTreeMap<Entity, BTreeMap<String, f64>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    #[serde(default)]
    pub tick: Option<u64>,
    #[serde(rename = "type")]
    pub kind: String,
    pub chunk_id: String,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default)]
    pub data: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub player_id: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QueuedCommand {
    pub sequence: u64,
    pub command: Command,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub tick: u64,
    #[serde(rename = "type")]
    pub kind: String,
    pub chunk_id: String,
    pub data: Value,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Weather {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub center_x: i32,
    pub center_y: i32,
    pub radius: i32,
    pub intensity: f64,
    pub start_tick: u64,
    pub duration: u64,
    pub remaining_minutes: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Rng {
    pub state: u32,
}
impl Rng {
    pub fn new(seed: u32) -> Self {
        Self {
            state: if seed == 0 { 0x6d2b79f5 } else { seed },
        }
    }
    pub fn sample(&mut self) -> f64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        f64::from(x) / 4294967296.0
    }
}
