//! Tagged plants: individuals the player follows, with their offspring and fate, kept after they die.
use crate::{genetics::genetics_of, model::*, world::World};
use serde_json::{json, Value};

/// Longest name a player can give a plant.
const NAME_LENGTH: usize = 40;

impl World {
    /// Tag a plant (a no-op if it already is); returns its label.
    pub(crate) fn tag(&mut self, entity: Entity, reason: &str) -> String {
        let organism = &self.components.organisms[&entity];
        if let Some(tag) = self.tags.get(&organism.id) {
            return tag.label.clone();
        }
        self.next_tag += 1;
        let prefix = self
            .config
            .site
            .chars()
            .next()
            .map_or('P', |c| c.to_ascii_uppercase());
        let label = format!("#{prefix}{}", self.next_tag);
        self.tags.insert(
            organism.id.clone(),
            Tag {
                label: label.clone(),
                species_id: organism.species_id.clone(),
                name: None,
                tagged_tick: self.tick,
                reason: reason.into(),
                seeds_set: 0,
                descendants: 0,
                died: None,
            },
        );
        label
    }

    /// The `tag` command: tag a plant in the hex, and name it if a name is given.
    pub(crate) fn tag_command(&mut self, chunk: Entity, data: &Value) -> Result<(), String> {
        let instance = data["instanceId"].as_str().ok_or("Missing instanceId")?;
        let entity = self
            .components
            .organisms
            .iter()
            .find(|(e, o)| o.id == instance && self.components.positions[e].chunk == chunk)
            .map(|(e, _)| *e)
            .ok_or("No such plant here")?;
        self.tag(entity, "chosen");
        if let Some(name) = data["name"].as_str() {
            let name: String = name.trim().chars().take(NAME_LENGTH).collect();
            let tag = self.tags.get_mut(instance).unwrap();
            tag.name = (!name.is_empty()).then_some(name);
        }
        Ok(())
    }

    /// A tagged plant set seed.
    pub(crate) fn count_seed(&mut self, mother_id: &str) {
        if let Some(tag) = self.tags.get_mut(mother_id) {
            tag.seeds_set += 1;
        }
    }

    /// A seed germinated: its tagged parents gain a descendant, and a crossed seed's seedling is tagged and noted
    /// in the cross's notebook entry.
    pub(crate) fn count_seedling(&mut self, entity: Entity) {
        let genetics = genetics_of(&self.components.organisms[&entity].extra);
        for parent in [&genetics.mother, &genetics.father].into_iter().flatten() {
            if let Some(tag) = self.tags.get_mut(parent) {
                tag.descendants += 1;
            }
        }
        if genetics.father.is_some() {
            let id = self.components.organisms[&entity].id.clone();
            self.note_seedling(&id, &genetics);
            let species = &self.components.organisms[&entity].species_id;
            let hybrid = self
                .definitions
                .get(species)
                .is_some_and(|d| !d.hybrid_of.is_empty());
            self.tag(entity, if hybrid { "hybrid" } else { "crossed" });
        }
    }

    /// Record a tagged plant's death, once.
    pub(crate) fn record_death(&mut self, entity: Entity, chunk: Entity, cause: &str) {
        let id = &self.components.organisms[&entity].id;
        let age_days = self.components.growth[&entity].age_days;
        let Some(tag) = self.tags.get_mut(id) else {
            return;
        };
        if tag.died.is_some() {
            return;
        }
        tag.died = Some(Death {
            tick: self.tick,
            cause: cause.into(),
            age_days,
        });
        let data = json!({ "label": tag.label, "instanceId": id, "speciesId": tag.species_id, "cause": cause, "ageDays": age_days });
        self.emit("tagged_died", chunk, data);
    }
}
