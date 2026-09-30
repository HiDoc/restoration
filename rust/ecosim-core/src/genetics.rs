//! Heritable traits of plants: the values the engine reads, the plant's generation, and where its seed came from.
use crate::world::World;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

/// The traits the engine reads; each lies in [0, 1] with 0.5 as the species' ordinary value.
pub const TRAITS: [&str; 5] = [
    "drought_tolerance",
    "cold_resistance",
    "growth_efficiency",
    "reproduction_vigor",
    "nutrient_efficiency",
];
/// Chance per trait per generation of a mutation, and its largest step either way.
const MUTATION_RATE: f64 = 0.08;
const MUTATION_STEP: f64 = 0.12;
/// Plants the land starts with differ a little, so selection has variation to work on from the first year.
const FOUNDER_SPREAD: f64 = 0.15;

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Genetics {
    pub traits: BTreeMap<String, f64>,
    #[serde(default)]
    pub generation: u64,
    /// The plants its seed came from, by instance id, and the site the seed was set on.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mother: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub father: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub origin: Option<String>,
}

impl Genetics {
    /// Genetics in the compact form, or converted from the older one (trait objects in an `__ecosimMap`).
    pub fn read(value: &Value) -> Option<Self> {
        if let Ok(genetics) = serde_json::from_value::<Genetics>(value.clone()) {
            return Some(genetics);
        }
        let entries = value["traits"]["__ecosimMap"].as_array()?;
        let traits = entries
            .iter()
            .filter_map(|entry| Some((entry[0].as_str()?, entry[1]["value"].as_f64()?)))
            .filter(|(id, _)| TRAITS.contains(id))
            .map(|(id, v)| (id.to_owned(), v.clamp(0.0, 1.0)))
            .collect();
        Some(Genetics {
            traits,
            generation: value["generation"].as_u64().unwrap_or(0),
            ..Genetics::default()
        })
    }

    pub fn value(&self, id: &str) -> f64 {
        self.traits.get(id).copied().unwrap_or(0.5).clamp(0.0, 1.0)
    }

    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).expect("Genetics are plain numbers and strings")
    }
}

/// A trait of a plant (or seed) from its record, 0.5 when it has none.
pub(crate) fn trait_value(extra: &BTreeMap<String, Value>, id: &str) -> f64 {
    extra
        .get("genetics")
        .and_then(|g| g["traits"][id].as_f64())
        .unwrap_or(0.5)
        .clamp(0.0, 1.0)
}

/// The site a seed (or the plant grown from it) was set on; empty when unknown.
pub(crate) fn origin_of(extra: &BTreeMap<String, Value>) -> &str {
    extra
        .get("genetics")
        .and_then(|g| g["origin"].as_str())
        .unwrap_or("")
}

pub(crate) fn genetics_of(extra: &BTreeMap<String, Value>) -> Genetics {
    extra
        .get("genetics")
        .and_then(Genetics::read)
        .unwrap_or_default()
}

impl World {
    /// Genetics for a plant with no known parents: ordinary values, each a little off.
    pub(crate) fn founder_genetics(&mut self) -> Value {
        let traits = TRAITS
            .iter()
            .map(|id| {
                let value = 0.5 + (self.rng.sample() - 0.5) * 2.0 * FOUNDER_SPREAD;
                (id.to_string(), value)
            })
            .collect();
        Genetics {
            traits,
            ..Genetics::default()
        }
        .to_value()
    }

    /// A seed's genetics: each trait from the mother, or somewhere between mother and father when crossed, then
    /// the occasional mutation. The seed remembers both parents and the site.
    pub(crate) fn offspring_genetics(
        &mut self,
        mother_id: &str,
        mother: &Genetics,
        father: Option<(&str, &Genetics)>,
    ) -> Value {
        let mut traits = BTreeMap::new();
        for id in TRAITS {
            let own = mother.value(id);
            let mut value = match father {
                Some((_, father)) => own + (father.value(id) - own) * self.rng.sample(),
                None => own,
            };
            if self.rng.sample() < MUTATION_RATE {
                value += (self.rng.sample() - 0.5) * 2.0 * MUTATION_STEP;
            }
            traits.insert(id.to_owned(), value.clamp(0.0, 1.0));
        }
        let generation = mother
            .generation
            .max(father.map_or(0, |(_, f)| f.generation))
            + 1;
        Genetics {
            traits,
            generation,
            mother: Some(mother_id.to_owned()),
            father: father.map(|(id, _)| id.to_owned()),
            origin: (!self.config.site.is_empty()).then(|| self.config.site.clone()),
        }
        .to_value()
    }

    /// A plant's record from its seed's: the seed's genetics if it has any (a collected or wild seed), else a
    /// founder's (a packet from outside).
    pub(crate) fn seed_record(
        &mut self,
        mut extra: BTreeMap<String, Value>,
    ) -> BTreeMap<String, Value> {
        if !extra.contains_key("genetics") {
            let founder = self.founder_genetics();
            extra.insert("genetics".into(), founder);
        }
        extra
    }

    /// Rewrite every record in the compact form: plants, seeds on the ground and in the pouch, and pollen.
    pub fn compact_genetics(&mut self) {
        let compact = |extra: &mut BTreeMap<String, Value>| {
            if let Some(genetics) = extra.get("genetics").and_then(Genetics::read) {
                extra.insert("genetics".into(), genetics.to_value());
            }
        };
        for organism in self.components.organisms.values_mut() {
            compact(&mut organism.extra);
        }
        for habitat in self.components.habitats.values_mut() {
            habitat.seeds.iter_mut().for_each(|s| compact(&mut s.extra));
        }
        self.inventory
            .iter_mut()
            .for_each(|s| compact(&mut s.extra));
        for reproduction in self.components.reproduction.values_mut() {
            if let Some(pollen) = reproduction.pollen.as_mut() {
                if let Some(genetics) = Genetics::read(&pollen.genetics) {
                    pollen.genetics = genetics.to_value();
                }
            }
        }
    }
}
