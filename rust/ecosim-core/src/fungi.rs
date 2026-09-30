//! Fungi: mycelium spreading through hexes where its hosts grow. Mycorrhizal partners help their host plants
//! take up water and nutrients; a parasite (Honey Fungus) finishes off stressed hosts; saprotrophs decay dead
//! wood back into the soil. Each fruits in its seasons once its mycelium is established.
use crate::{model::*, world::World};
use std::collections::BTreeMap;

/// How quickly mycelium grows towards (or shrinks from) what its hosts support, per day.
const GROWTH: f64 = 0.02;
/// Daily chance that spores start mycelium in a hex with hosts; far higher beside an established patch.
const SPORES: f64 = 0.004;
const SPREAD: f64 = 0.03;
/// Mycelium this extensive fruits in its seasons (and is what a neighbour spreads from).
pub const FRUITING: f64 = 0.3;
/// Host plants that fully support a mycorrhizal fungus in a hex.
const HOSTS_FOR_FULL: f64 = 4.0;
/// A full mycorrhizal partnership: share of drought stress removed, and gain in nutrient uptake.
pub const DROUGHT_RELIEF: f64 = 0.3;
pub const NUTRIENT_GAIN: f64 = 0.25;
/// Health a fully established parasite takes from a stressed host each day.
pub const ROT: f64 = 0.004;
/// A host is stressed, and open to the parasite, below this health.
pub const STRESSED: f64 = 0.5;
/// Dead wood a woody plant leaves, and how fast wood rots: slowly alone, faster with a saprotroph in it.
const DEADWOOD_PER_DEATH: f64 = 0.3;
const DECAY: f64 = 0.003;

impl World {
    /// Fungi partnering each plant species, directly or through a hybrid's parents: (fungus, lifestyle).
    pub(crate) fn fungal_partners(&self) -> BTreeMap<String, Vec<(String, String)>> {
        self.definitions
            .values()
            .map(|def| {
                let kin: Vec<&String> = std::iter::once(&def.id).chain(&def.hybrid_of).collect();
                let partners = self
                    .fungus_definitions
                    .values()
                    .filter(|f| f.hosts.iter().any(|h| kin.contains(&h)))
                    .map(|f| (f.id.clone(), f.lifestyle.clone()))
                    .collect();
                (def.id.clone(), partners)
            })
            .collect()
    }

    /// The strongest mycelium of a lifestyle partnering a plant in its hex [0, 1].
    pub(crate) fn fungal_partner(
        &self,
        partners: &[(String, String)],
        chunk: Entity,
        lifestyle: &str,
    ) -> f64 {
        let Some(present) = self.fungi.get(&chunk) else {
            return 0.0;
        };
        partners
            .iter()
            .filter(|(_, l)| l == lifestyle)
            .filter_map(|(id, _)| present.get(id))
            .fold(0.0, |a: f64, &b| a.max(b))
    }

    /// A woody plant died: its wood lies in the hex.
    pub(crate) fn leave_deadwood(&mut self, chunk: Entity, species: &str) {
        let woody = self
            .definitions
            .get(species)
            .is_some_and(|d| matches!(d.category.as_str(), "tree" | "shrub"));
        if woody {
            let biome = self.components.biomes.get_mut(&chunk).unwrap();
            biome.deadwood = (biome.deadwood + DEADWOOD_PER_DEATH).min(1.0);
        }
    }

    pub(crate) fn fungus_system(&mut self) {
        let days = self.config.time_per_tick_minutes as f64 / 1440.0;
        // Rotting wood returns to the soil, faster where a saprotroph works it.
        for (chunk, biome) in &mut self.components.biomes {
            let decomposer = self.fungi.get(chunk).map_or(0.0, |present| {
                present
                    .iter()
                    .filter(|(id, _)| {
                        self.fungus_definitions
                            .get(*id)
                            .is_some_and(|f| f.lifestyle == "saprotroph")
                    })
                    .fold(0.0, |a: f64, (_, &e)| a.max(e))
            });
            let decayed = biome.deadwood * DECAY * (1.0 + 3.0 * decomposer) * days;
            biome.deadwood -= decayed;
            biome.soil = (biome.soil + decayed * 0.5).min(1.0);
        }
        if self.fungus_definitions.is_empty() {
            return;
        }
        let partners = self.fungal_partners();
        // Hosts of each fungus per hex: (all, stressed).
        let mut hosts = BTreeMap::<(Entity, &str), (f64, f64)>::new();
        for (entity, organism) in &self.components.organisms {
            let chunk = self.components.positions[entity].chunk;
            let stressed = self.components.growth[entity].health < STRESSED;
            for (fungus, _) in partners.get(&organism.species_id).into_iter().flatten() {
                let count = hosts.entry((chunk, fungus.as_str())).or_default();
                count.0 += 1.0;
                count.1 += f64::from(u8::from(stressed));
            }
        }
        let at: BTreeMap<(i32, i32), Entity> = self
            .components
            .habitats
            .iter()
            .map(|(e, h)| ((h.x, h.y), *e))
            .collect();
        let chunks: Vec<Entity> = self.components.habitats.keys().copied().collect();
        let mut next = BTreeMap::<Entity, BTreeMap<String, f64>>::new();
        for chunk in chunks {
            let habitat = &self.components.habitats[&chunk];
            let neighbours: Vec<Entity> = [(1, 0), (-1, 0), (0, 1), (0, -1)]
                .iter()
                .filter_map(|(dx, dy)| at.get(&(habitat.x + dx, habitat.y + dy)).copied())
                .collect();
            let deadwood = self.components.biomes[&chunk].deadwood;
            for def in self.fungus_definitions.values() {
                let (all, stressed) = hosts
                    .get(&(chunk, def.id.as_str()))
                    .copied()
                    .unwrap_or_default();
                let target = match def.lifestyle.as_str() {
                    "mycorrhizal" => (all / HOSTS_FOR_FULL).min(1.0),
                    "parasite" => (stressed / 2.0).min(1.0),
                    // Saprotrophs of dead wood need wood of their hosts' kind: any woody host nearby.
                    _ => {
                        if all > 0.0 || deadwood > 0.05 {
                            deadwood
                        } else {
                            0.0
                        }
                    }
                };
                let mut extent = self
                    .fungi
                    .get(&chunk)
                    .and_then(|present| present.get(&def.id))
                    .copied()
                    .unwrap_or(0.0);
                if extent == 0.0 {
                    if target <= 0.0 {
                        continue;
                    }
                    let beside = neighbours.iter().any(|n| {
                        self.fungi
                            .get(n)
                            .and_then(|p| p.get(&def.id))
                            .is_some_and(|&e| e >= FRUITING)
                    });
                    let chance = if beside { SPREAD } else { SPORES } * days;
                    if self.rng.sample() >= chance {
                        continue;
                    }
                    extent = 0.05;
                } else {
                    extent = (extent + (target - extent) * GROWTH * days).clamp(0.0, 1.0);
                }
                if extent >= 0.01 {
                    next.entry(chunk)
                        .or_default()
                        .insert(def.id.clone(), extent);
                }
            }
        }
        self.fungi = next;
    }

    /// Fungi fruiting in a hex now: established mycelium in one of its fruiting seasons.
    pub(crate) fn fruiting_in(&self, chunk: Entity) -> Vec<&str> {
        let season = self.season();
        self.fungi
            .get(&chunk)
            .into_iter()
            .flatten()
            .filter(|(id, &extent)| {
                extent >= FRUITING
                    && self
                        .fungus_definitions
                        .get(*id)
                        .is_some_and(|f| f.fruiting_seasons.iter().any(|s| s == season))
            })
            .map(|(id, _)| id.as_str())
            .collect()
    }
}
