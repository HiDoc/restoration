//! Hand pollination: seed with a chosen father, hybrid seed between species of one genus, the hybrid taxon,
//! and the notebook of crosses.
use crate::{
    genetics::{genetics_of, Genetics, TRAITS},
    model::*,
    world::World,
};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

/// Seedlings of one cross the notebook records.
const NOTED_SEEDLINGS: usize = 5;

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
        flood_tolerance: avg(|d| d.flood_tolerance),
        ph_range: range(|d| &d.ph_range),
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
    /// Insects crossing congeners: donor pollen on the first unpollinated flowering receiver in a hex.
    pub(crate) fn pollinate_species(
        &mut self,
        chunk: Entity,
        receiver: &str,
        donor: &str,
    ) -> Result<(), String> {
        let flowering = |species: &str, open: bool| {
            self.components
                .organisms
                .iter()
                .find_map(|(entity, organism)| {
                    let reproduction = &self.components.reproduction[entity];
                    (self.components.positions[entity].chunk == chunk
                        && organism.species_id == species
                        && reproduction.stage == "flowering"
                        && (!open || reproduction.pollen.is_none()))
                    .then_some(*entity)
                })
        };
        let mother = flowering(receiver, true)
            .ok_or(format!("No unpollinated {receiver} is in flower here"))?;
        let father = flowering(donor, false).ok_or(format!("No {donor} is in flower here"))?;
        self.pollinate(mother, father)
    }

    /// Place one plant's pollen on another's open flower: its seed this bloom has that father. Plants of one
    /// species cross, and so do species of one genus.
    pub(crate) fn pollinate(&mut self, mother: Entity, father: Entity) -> Result<(), String> {
        let genus = |id: &str| self.definitions.get(id).map_or("", |d| d.genus.as_str());
        let (receiver, donor) = (
            &self.components.organisms[&mother].species_id,
            &self.components.organisms[&father].species_id,
        );
        if mother == father {
            return Err("A plant cannot be crossed with itself".into());
        }
        if receiver != donor && (genus(receiver).is_empty() || genus(receiver) != genus(donor)) {
            return Err("Too distant to cross: only plants of one genus can".into());
        }
        let stage = |plant: &Entity| self.components.reproduction[plant].stage.as_str();
        if stage(&mother) != "flowering" || stage(&father) != "flowering" {
            return Err("Both plants must be in flower".into());
        }
        if self.components.reproduction[&mother].pollen.is_some() {
            return Err("That flower has already been pollinated by hand".into());
        }
        let organism = &self.components.organisms[&father];
        let pollen = Pollen {
            species_id: organism.species_id.clone(),
            genetics: organism
                .extra
                .get("genetics")
                .cloned()
                .unwrap_or(Value::Null),
            donor: organism.id.clone(),
        };
        let bloom = self.components.reproduction.get_mut(&mother).unwrap();
        bloom.pollinated = 1.0;
        bloom.pollen = Some(pollen);
        Ok(())
    }

    /// The `cross` command: the player's chosen mother and father in the hex, and what they expect of the
    /// offspring, kept in the notebook with both parents' traits.
    pub(crate) fn cross_command(&mut self, chunk: Entity, data: &Value) -> Result<(), String> {
        let find = |key: &str| {
            let id = data[key].as_str().ok_or(format!("Missing {key}"))?;
            self.components
                .organisms
                .iter()
                .find(|(e, o)| o.id == id && self.components.positions[e].chunk == chunk)
                .map(|(e, _)| *e)
                .ok_or_else(|| "No such plant here".to_owned())
        };
        let (mother, father) = (find("mother")?, find("father")?);
        let prediction: BTreeMap<String, String> = data["prediction"]
            .as_object()
            .into_iter()
            .flatten()
            .filter(|(id, guess)| {
                TRAITS.contains(&id.as_str())
                    && matches!(guess.as_str(), Some("lower" | "between" | "higher"))
            })
            .map(|(id, guess)| (id.clone(), guess.as_str().unwrap().to_owned()))
            .collect();
        self.pollinate(mother, father)?;
        let [m, f] = [mother, father].map(|plant| &self.components.organisms[&plant]);
        let cross = Cross {
            tick: self.tick,
            mother: m.id.clone(),
            father: f.id.clone(),
            mother_species: m.species_id.clone(),
            father_species: f.species_id.clone(),
            parents: [m, f].map(|plant| {
                let genetics = genetics_of(&plant.extra);
                TRAITS
                    .iter()
                    .map(|id| (id.to_string(), genetics.value(id)))
                    .collect()
            }),
            prediction,
            seedlings: vec![],
        };
        let data = json!({ "receiver": cross.mother_species, "donor": cross.father_species });
        self.crosses.push(cross);
        self.emit("cross_pollinated", chunk, data);
        Ok(())
    }

    /// A crossed seed germinated: the latest cross of its parents notes it, up to a few seedlings.
    pub(crate) fn note_seedling(&mut self, id: &str, genetics: &Genetics) {
        let (Some(mother), Some(father)) = (&genetics.mother, &genetics.father) else {
            return;
        };
        if let Some(cross) = self
            .crosses
            .iter_mut()
            .rev()
            .find(|c| &c.mother == mother && &c.father == father)
        {
            if cross.seedlings.len() < NOTED_SEEDLINGS {
                cross.seedlings.push(CrossSeedling {
                    id: id.to_owned(),
                    traits: genetics.traits.clone(),
                });
            }
        }
    }

    /// The species and genetics of a seed a plant sets: its own, or hybrid if pollen was placed on it.
    pub(crate) fn seed_of(
        &mut self,
        species: &str,
        mother_id: &str,
        mother: &BTreeMap<String, Value>,
        pollen: Option<&Pollen>,
    ) -> (String, Value) {
        let mother_genetics = genetics_of(mother);
        let Some(pollen) = pollen else {
            let genetics = self.offspring_genetics(mother_id, &mother_genetics, None);
            return (species.to_owned(), genetics);
        };
        let hybrid = if pollen.species_id == species {
            species.to_owned()
        } else {
            self.hybrid_species(species, &pollen.species_id)
        };
        let father = Genetics::read(&pollen.genetics).unwrap_or_default();
        let genetics =
            self.offspring_genetics(mother_id, &mother_genetics, Some((&pollen.donor, &father)));
        (hybrid, genetics)
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
            self.feed_on_hybrids();
        }
        id
    }

    /// Animals treat a hybrid like its parents: each gains the first link it has to one of them, and a larval
    /// host parent makes the hybrid a host. Idempotent, so it runs whenever either definition set changes.
    pub(crate) fn feed_on_hybrids(&mut self) {
        let hybrids: Vec<(String, Vec<String>)> = self
            .definitions
            .values()
            .filter(|def| !def.hybrid_of.is_empty())
            .map(|def| (def.id.clone(), def.hybrid_of.clone()))
            .collect();
        for animal in self.fauna_definitions.values_mut() {
            for (hybrid, parents) in &hybrids {
                if !animal.forage.iter().any(|link| &link.plant == hybrid) {
                    if let Some(link) = animal.forage.iter().find(|l| parents.contains(&l.plant)) {
                        let link = FaunaLink {
                            plant: hybrid.clone(),
                            ..link.clone()
                        };
                        animal.forage.push(link);
                    }
                }
                if !animal.hosts.contains(hybrid)
                    && animal.hosts.iter().any(|h| parents.contains(h))
                {
                    animal.hosts.push(hybrid.clone());
                }
            }
        }
    }
}
