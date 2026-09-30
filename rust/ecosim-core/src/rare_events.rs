//! Rare events: at most one per season, rolled from the world's RNG among those whose conditions hold, each
//! with a real effect on the ecology.
use crate::{model::*, world::World};
use serde_json::json;
use std::collections::BTreeSet;

/// Standing water a downpour leaves in the lowest hex.
const POND_DEPTH: f64 = 0.6;
/// Chance that a season brings any rare event at all.
const RARE_CHANCE: f64 = 0.25;

pub const RARE_EVENTS: [&str; 6] = [
    "superbloom",
    "mast_year",
    "butterfly_migration",
    "temporary_pond",
    "spontaneous_hybrid",
    "ancient_seed",
];

/// What an event does, found while checking its conditions; applied only if it is chosen.
enum Effect {
    Boost(&'static str),
    Migration(Vec<(Entity, String)>),
    Pond(Entity),
    Hybrid(Entity, String, String),
    Sprout(Vec<(Entity, String)>),
}

impl World {
    fn ticks_per_season(&self) -> u64 {
        self.config.season_length_ticks * 1440 / self.config.time_per_tick_minutes
    }

    /// Whether a timed effect (superbloom, mast year) is running.
    pub(crate) fn rare_effect(&self, kind: &str) -> bool {
        self.rare_effects
            .iter()
            .any(|e| e.kind == kind && e.until_tick > self.tick)
    }

    fn mean(&self, of: impl Fn(Entity) -> f64) -> f64 {
        let hexes: Vec<Entity> = self.components.habitats.keys().copied().collect();
        hexes.iter().map(|h| of(*h)).sum::<f64>() / hexes.len().max(1) as f64
    }

    fn flowering_in(&self, chunk: Entity) -> BTreeSet<&str> {
        self.components
            .organisms
            .iter()
            .filter(|(e, _)| {
                self.components.positions[e].chunk == chunk
                    && self.components.reproduction[e].stage == "flowering"
            })
            .map(|(_, o)| o.species_id.as_str())
            .collect()
    }

    /// The event's effect if its conditions hold now.
    fn rare_condition(&self, kind: &str) -> Option<Effect> {
        let season = self.season();
        match kind {
            // A wet winter leaves the soil primed: buried seed wakes in numbers.
            "superbloom" => (season == "spring"
                && self.mean(|h| self.components.biomes[&h].moisture) >= 0.6)
                .then_some(Effect::Boost("superbloom")),
            "mast_year" => {
                let fruiting_trees = self
                    .components
                    .organisms
                    .iter()
                    .filter(|(e, o)| {
                        self.components.reproduction[e].stage == "fruiting"
                            && self
                                .definitions
                                .get(&o.species_id)
                                .is_some_and(|d| d.category == "tree")
                    })
                    .count();
                (season == "autumn" && fruiting_trees >= 3).then_some(Effect::Boost("mast_year"))
            }
            "butterfly_migration" => {
                if season != "summer"
                    || self.mean(|h| self.components.climates[&h].temperature) < 18.0
                {
                    return None;
                }
                let mut arrivals = vec![];
                for hex in self.components.habitats.keys() {
                    let flowering = self.flowering_in(*hex);
                    for butterfly in self
                        .fauna_definitions
                        .values()
                        .filter(|d| d.group == "butterfly")
                    {
                        if butterfly
                            .forage
                            .iter()
                            .any(|link| flowering.contains(link.plant.as_str()))
                        {
                            arrivals.push((*hex, butterfly.id.clone()));
                        }
                    }
                }
                (!arrivals.is_empty()).then_some(Effect::Migration(arrivals))
            }
            "temporary_pond" => {
                if season != "spring" && season != "autumn" {
                    return None;
                }
                self.components
                    .habitats
                    .iter()
                    .min_by(|a, b| a.1.elevation.total_cmp(&b.1.elevation))
                    .map(|(hex, _)| Effect::Pond(*hex))
            }
            "spontaneous_hybrid" => {
                for hex in self.components.habitats.keys() {
                    let insects = self.components.fauna.get(hex).is_some_and(|animals| {
                        animals.iter().any(|(id, n)| {
                            *n >= 1.0
                                && self
                                    .fauna_definitions
                                    .get(id)
                                    .is_some_and(|d| d.group != "bird")
                        })
                    });
                    if !insects {
                        continue;
                    }
                    let flowering: Vec<&str> = self.flowering_in(*hex).into_iter().collect();
                    for receiver in &flowering {
                        for donor in &flowering {
                            let genus = |id: &str| {
                                self.definitions.get(id).map_or("", |d| d.genus.as_str())
                            };
                            if receiver != donor
                                && !genus(receiver).is_empty()
                                && genus(receiver) == genus(donor)
                            {
                                return Some(Effect::Hybrid(
                                    *hex,
                                    receiver.to_string(),
                                    donor.to_string(),
                                ));
                            }
                        }
                    }
                }
                None
            }
            // Ground turned bare exposes seed buried long ago; it sprouts where its needs are met.
            "ancient_seed" => {
                if season == "winter" {
                    return None;
                }
                let growing: BTreeSet<&str> = self
                    .components
                    .organisms
                    .values()
                    .map(|o| o.species_id.as_str())
                    .collect();
                let planted = self.habitat_hexes();
                let mut options = vec![];
                for (hex, biome) in &self.components.biomes {
                    if planted.contains(hex) || biome.standing_water > 0.0 {
                        continue;
                    }
                    for def in self.definitions.values() {
                        if def.hybrid_of.is_empty()
                            && !growing.contains(def.id.as_str())
                            && (def.moisture_range.min..=def.moisture_range.max)
                                .contains(&biome.moisture)
                        {
                            options.push((*hex, def.id.clone()));
                        }
                    }
                }
                (!options.is_empty()).then_some(Effect::Sprout(options))
            }
            _ => None,
        }
    }

    /// Force a rare event now, if its conditions hold.
    pub fn trigger_rare_event(&mut self, kind: &str) -> Result<(), String> {
        let effect = self
            .rare_condition(kind)
            .ok_or(format!("The conditions for {kind} do not hold"))?;
        let until_tick = self.tick + self.ticks_per_season();
        let first_hex = *self.components.habitats.keys().next().ok_or("No land")?;
        match effect {
            Effect::Boost(kind) => {
                self.rare_effects.push(RareEffect {
                    kind: kind.into(),
                    until_tick,
                });
                self.emit("rare_event", first_hex, json!({ "kind": kind }));
            }
            Effect::Migration(arrivals) => {
                let mut species = BTreeSet::new();
                for (hex, butterfly) in arrivals {
                    let present = self.components.fauna.entry(hex).or_default();
                    let n = present.entry(butterfly.clone()).or_default();
                    *n = n.max(3.0);
                    species.insert(butterfly);
                }
                self.emit(
                    "rare_event",
                    first_hex,
                    json!({ "kind": kind, "species": species }),
                );
            }
            Effect::Pond(hex) => {
                // The runoff of a downpour saturates the hollow and stands in it.
                let biome = self.components.biomes.get_mut(&hex).unwrap();
                biome.set_water(1.0 + biome.standing_water + POND_DEPTH);
                self.emit("rare_event", hex, json!({ "kind": kind }));
            }
            Effect::Hybrid(hex, receiver, donor) => {
                self.pollinate_species(hex, &receiver, &donor)?;
                self.emit(
                    "rare_event",
                    hex,
                    json!({ "kind": kind, "receiver": receiver, "donor": donor }),
                );
            }
            Effect::Sprout(options) => {
                let (hex, species) = options
                    [(self.rng.sample() * options.len() as f64) as usize % options.len()]
                .clone();
                let id = self.spawn(hex, &species, 0.5, 0.5, 0.1);
                let instance = self.components.organisms[&id].id.clone();
                self.emit(
                    "rare_event",
                    hex,
                    json!({ "kind": kind, "speciesId": species, "instanceId": instance }),
                );
            }
        }
        Ok(())
    }

    /// At each season's start, roll once for a rare event among those whose conditions hold.
    pub(crate) fn rare_event_system(&mut self) {
        let season_index = self.elapsed_minutes / (self.config.season_length_ticks * 1440);
        if season_index == self.rare_season {
            return;
        }
        self.rare_season = season_index;
        if !self.config.rare_events {
            return;
        }
        let tick = self.tick;
        self.rare_effects.retain(|e| e.until_tick > tick);
        if self.rng.sample() >= RARE_CHANCE {
            return;
        }
        let eligible: Vec<&str> = RARE_EVENTS
            .into_iter()
            .filter(|kind| self.rare_condition(kind).is_some())
            .collect();
        if eligible.is_empty() {
            return;
        }
        let kind = eligible[(self.rng.sample() * eligible.len() as f64) as usize % eligible.len()];
        // Conditions were just checked; an event that cannot apply simply does not happen.
        let _ = self.trigger_rare_event(kind);
    }
}
