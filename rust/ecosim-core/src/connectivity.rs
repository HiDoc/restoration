//! Habitat connectivity: which hexes animals can move through and reach from beyond the map, and the patches
//! of plant cover a corridor can join.
use crate::{model::*, world::World};
use serde_json::json;
use std::collections::{BTreeMap, BTreeSet, VecDeque};

impl World {
    /// Hexes holding plants: the habitat animals live in and travel through.
    pub(crate) fn habitat_hexes(&self) -> BTreeSet<Entity> {
        self.components
            .positions
            .values()
            .map(|p| p.chunk)
            .collect()
    }

    fn coordinates(&self) -> BTreeMap<(i32, i32), Entity> {
        self.components
            .habitats
            .iter()
            .map(|(id, h)| ((h.x, h.y), *id))
            .collect()
    }

    /// Habitat an animal with this foraging range can reach from beyond the map: habitat within range of the
    /// border, and habitat within range of that, and so on. Bare ground wider than the range is a barrier.
    pub(crate) fn reachable_from_border(
        &self,
        habitat: &BTreeSet<Entity>,
        range: i32,
    ) -> BTreeSet<Entity> {
        let coordinates = self.coordinates();
        let (width, height) = (
            self.config.world_width as i32,
            self.config.world_height as i32,
        );
        let mut reached = BTreeSet::new();
        let mut queue = VecDeque::new();
        for hex in habitat {
            let h = &self.components.habitats[hex];
            if h.x.min(h.y).min(width - 1 - h.x).min(height - 1 - h.y) < range {
                reached.insert(*hex);
                queue.push_back(*hex);
            }
        }
        while let Some(hex) = queue.pop_front() {
            let h = &self.components.habitats[&hex];
            for dx in -range..=range {
                for dy in -range..=range {
                    if let Some(next) = coordinates.get(&(h.x + dx, h.y + dy)) {
                        if habitat.contains(next) && reached.insert(*next) {
                            queue.push_back(*next);
                        }
                    }
                }
            }
        }
        reached
    }

    /// Label the patches of plant cover (touching hexes, diagonals included) and report a corridor wherever a
    /// hex newly holding plants joins two patches that were each more than one hex.
    pub(crate) fn landscape_system(&mut self) {
        let habitat = self.habitat_hexes();
        let coordinates = self.coordinates();
        let mut labels = BTreeMap::<Entity, usize>::new();
        let mut patches = 0;
        for start in &habitat {
            if labels.contains_key(start) {
                continue;
            }
            let label = patches;
            patches += 1;
            let mut queue = VecDeque::from([*start]);
            labels.insert(*start, label);
            while let Some(hex) = queue.pop_front() {
                let h = &self.components.habitats[&hex];
                for (dx, dy) in NEIGHBOURS {
                    if let Some(next) = coordinates.get(&(h.x + dx, h.y + dy)) {
                        if habitat.contains(next) && !labels.contains_key(next) {
                            labels.insert(*next, label);
                            queue.push_back(*next);
                        }
                    }
                }
            }
        }
        let mut sizes = BTreeMap::<usize, usize>::new();
        for label in self.patch_labels.values() {
            *sizes.entry(*label).or_default() += 1;
        }
        let mut corridors = vec![];
        for hex in habitat
            .iter()
            .filter(|hex| !self.patch_labels.contains_key(hex))
        {
            let h = &self.components.habitats[hex];
            let joined: BTreeSet<usize> = NEIGHBOURS
                .iter()
                .filter_map(|(dx, dy)| coordinates.get(&(h.x + dx, h.y + dy)))
                .filter_map(|next| self.patch_labels.get(next))
                .filter(|label| sizes[label] >= 2)
                .copied()
                .collect();
            if joined.len() >= 2 {
                corridors.push((*hex, joined.len()));
            }
        }
        self.patch_labels = labels;
        for (hex, patches) in corridors {
            self.emit("corridor_formed", hex, json!({ "patches": patches }));
        }
    }
}

const NEIGHBOURS: [(i32, i32); 8] = [
    (-1, -1),
    (0, -1),
    (1, -1),
    (-1, 0),
    (1, 0),
    (-1, 1),
    (0, 1),
    (1, 1),
];
