//! Fieldwork: soil and water samples, the germination tray grown from a sample, and the flow of water between
//! hexes that a traced marker follows.
use crate::{model::*, world::World};
use serde_json::json;
use std::collections::BTreeSet;

/// Days a germination tray takes to show what the soil holds.
const TRAY_DAYS: u64 = 14;

impl World {
    /// The `sample` command: read the hex's soil and water, and start a tray of its soil. Each buried seed comes
    /// up in the tray as often as it is viable.
    pub(crate) fn sample_command(&mut self, chunk: Entity) {
        let biome = self.components.biomes[&chunk].clone();
        let seeds: Vec<(String, f64)> = self.components.habitats[&chunk]
            .seeds
            .iter()
            .map(|seed| (seed.species_id.clone(), seed.viability))
            .collect();
        let tray: BTreeSet<String> = seeds
            .into_iter()
            .filter(|(_, viability)| self.rng.sample() < *viability)
            .map(|(species, _)| species)
            .collect();
        let tray_ticks = TRAY_DAYS * 1440 / self.config.time_per_tick_minutes;
        let id = self.components.habitats[&chunk].id.clone();
        self.samples.insert(
            id,
            Sample {
                tick: self.tick,
                ph: biome.ph,
                moisture: biome.moisture,
                nutrients: biome.soil,
                pollution: biome.pollution,
                standing_water: biome.standing_water,
                tray: tray.into_iter().collect(),
                tray_ready: self.tick + tray_ticks.max(1),
            },
        );
    }

    /// Tell the player when a tray has grown on.
    pub(crate) fn tray_system(&mut self) {
        let ready: Vec<(String, Vec<String>)> = self
            .samples
            .iter()
            .filter(|(_, sample)| sample.tray_ready == self.tick)
            .map(|(id, sample)| (id.clone(), sample.tray.clone()))
            .collect();
        for (id, species) in ready {
            let chunk = *self
                .components
                .habitats
                .iter()
                .find(|(_, h)| h.id == id)
                .unwrap()
                .0;
            self.emit("tray_ready", chunk, json!({ "species": species }));
        }
    }
}
