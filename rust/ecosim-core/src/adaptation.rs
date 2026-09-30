//! Trait baselines: how each species' heritable traits were spread when first seen here, so the player can see
//! how selection has moved them since.
use crate::{
    genetics::{trait_value, TRAITS},
    model::Baseline,
    world::World,
};
use std::collections::BTreeMap;

/// Bins over [0, 1] for a trait's spread.
pub const BINS: usize = 10;
/// Plants a species needs before its spread is worth recording.
const MIN_PLANTS: u32 = 5;

impl World {
    /// At the start of each season, record the spread of any species with enough plants and no baseline yet.
    pub(crate) fn baseline_system(&mut self) {
        let season = self.config.season_length_ticks * 1440;
        let step = self.config.time_per_tick_minutes;
        if (self.elapsed_minutes - step) % season >= step {
            return;
        }
        let mut spread = BTreeMap::<&str, (u32, BTreeMap<String, Vec<u32>>)>::new();
        for organism in self.components.organisms.values() {
            if self.baselines.contains_key(&organism.species_id) {
                continue;
            }
            let (plants, traits) = spread.entry(&organism.species_id).or_default();
            *plants += 1;
            for id in TRAITS {
                let bin = ((trait_value(&organism.extra, id) * BINS as f64) as usize).min(BINS - 1);
                traits.entry(id.to_owned()).or_insert_with(|| vec![0; BINS])[bin] += 1;
            }
        }
        let recorded: Vec<_> = spread
            .into_iter()
            .filter(|(_, (plants, _))| *plants >= MIN_PLANTS)
            .map(|(species, (_, traits))| {
                let baseline = Baseline {
                    tick: self.tick,
                    traits,
                };
                (species.to_owned(), baseline)
            })
            .collect();
        self.baselines.extend(recorded);
    }
}
