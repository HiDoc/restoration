//! Hand pollination between species of one genus: hybrid seed, hybrid genetics and the hybrid taxon.
use crate::{model::*, world::World};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

fn trait_values(genetics: &Value) -> BTreeMap<String, f64> {
    genetics["traits"]["__ecosimMap"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|entry| Some((entry[0].as_str()?.to_owned(), entry[1]["value"].as_f64()?)))
        .collect()
}

fn mean(values: impl Iterator<Item = f64>) -> f64 {
    let (sum, count) = values.fold((0.0, 0.0), |(sum, count), value| (sum + value, count + 1.0));
    sum / count
}

fn union(lists: impl Iterator<Item = Vec<String>>) -> Vec<String> {
    lists
        .flatten()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

/// A hybrid sits between its parents: each measured trait is their mean, and it flowers and fruits when
/// either of them does.
fn blend(id: String, parents: &[&SpeciesDefinition], hybrid_of: Vec<String>) -> SpeciesDefinition {
    let avg = |field: fn(&SpeciesDefinition) -> f64| mean(parents.iter().map(|p| field(p)));
    let range = |field: fn(&SpeciesDefinition) -> &Range| Range {
        min: mean(parents.iter().map(|p| field(p).min)),
        max: mean(parents.iter().map(|p| field(p).max)),
    };
    let ecology = |field: fn(&Ecology) -> &Vec<String>| {
        union(
            parents
                .iter()
                .map(|p| p.ecology.as_ref().map(field).cloned().unwrap_or_default()),
        )
    };
    let first = parents[0];
    SpeciesDefinition {
        id,
        max_biomass: avg(|d| d.max_biomass),
        growth_rate: avg(|d| d.growth_rate),
        lifespan_ticks: avg(|d| d.lifespan_ticks as f64).round() as u64,
        reproduction_threshold: avg(|d| d.reproduction_threshold),
        reproduction_need: avg(|d| d.reproduction_need),
        seed_production: avg(|d| d.seed_production),
        seed_maturity_ticks: avg(|d| d.seed_maturity_ticks as f64).round() as u64,
        reproduction_seasons: union(parents.iter().map(|p| p.reproduction_seasons.clone())),
        temperature_range: range(|d| &d.temperature_range),
        moisture_range: range(|d| &d.moisture_range),
        light_requirement: avg(|d| d.light_requirement),
        shade_tolerance_max: avg(|d| d.shade_tolerance_max),
        dispersal_range: avg(|d| d.dispersal_range),
        maturity_days: avg(|d| d.maturity_days),
        clonal_rate: avg(|d| d.clonal_rate),
        ecology: first.ecology.as_ref().map(|_| Ecology {
            flowering_seasons: ecology(|e| &e.flowering_seasons),
            fruiting_seasons: ecology(|e| &e.fruiting_seasons),
            dormant_seasons: ecology(|e| &e.dormant_seasons),
        }),
        hybrid_of,
        ..first.clone()
    }
}

impl World {
    /// The species and genetics of a seed a plant sets: its own, or hybrid if the player placed pollen on it.
    pub(crate) fn seed_of(
        &mut self,
        species: &str,
        mother: &BTreeMap<String, Value>,
        pollen: Option<&Pollen>,
    ) -> (String, Value) {
        let Some(pollen) = pollen else {
            return (species.to_owned(), self.inherit_genetics(mother));
        };
        let hybrid = self.hybrid_species(species, &pollen.species_id);
        let mut crossed = mother.clone();
        crossed.insert(
            "genetics".into(),
            self.cross_genetics(mother, &pollen.genetics),
        );
        (hybrid, self.inherit_genetics(&crossed))
    }

    /// Each trait lands somewhere between the two parents' values; mutation follows in `inherit_genetics`.
    fn cross_genetics(&mut self, mother: &BTreeMap<String, Value>, father: &Value) -> Value {
        let mut child = mother
            .get("genetics")
            .filter(|genetics| genetics.is_object())
            .cloned()
            .unwrap_or_else(default_genetics);
        let paternal = trait_values(father);
        if let Some(traits) = child["traits"]["__ecosimMap"].as_array_mut() {
            for entry in traits {
                let (Some(id), Some(own)) = (entry[0].as_str(), entry[1]["value"].as_f64()) else {
                    continue;
                };
                let other = paternal.get(id).copied().unwrap_or(0.5);
                entry[1]["value"] = json!(own + (other - own) * self.rng.sample());
            }
        }
        let generation = |g: &Value| g["generation"].as_u64().unwrap_or(0);
        child["generation"] = json!(generation(&child).max(generation(father)));
        child
    }

    /// The hybrid taxon of two species, created on first use. It is named by the non-hybrid species it
    /// descends from, so a backcross to a parent stays in the same taxon.
    fn hybrid_species(&mut self, a: &str, b: &str) -> String {
        let base = |id: &str| match self.definitions.get(id) {
            Some(def) if !def.hybrid_of.is_empty() => def.hybrid_of.clone(),
            _ => vec![id.to_owned()],
        };
        let parents: Vec<String> = union([base(a), base(b)].into_iter());
        let id = format!("hybrid_{}", parents.join("__"));
        if !self.definitions.contains_key(&id) {
            let defs: Vec<&SpeciesDefinition> = parents
                .iter()
                .filter_map(|p| self.definitions.get(p))
                .collect();
            let hybrid = blend(id.clone(), &defs, parents.clone());
            self.definitions.insert(id.clone(), hybrid);
        }
        id
    }
}

/// Genetics of a plant that has never been bred: every trait at the midpoint.
pub(crate) fn default_genetics() -> Value {
    let traits: Vec<_> = [
        "drought_tolerance",
        "cold_resistance",
        "growth_efficiency",
        "reproduction_vigor",
        "nutrient_efficiency",
        "light_sensitivity",
        "competition_aggression",
    ]
    .iter()
    .map(|id| json!([id,{"id":id,"name":id,"value":0.5,"baseValue":0.5,"mutationRate":0.08,"variance":0.2,"dominance":0.7,"beneficial":true}]))
    .collect();
    json!({"traits":{"__ecosimMap":traits},"generation":0,"mutations":[],"adaptationScore":0.5})
}
