use ecosim_core::{dispatch, model::*, world::World};
use serde_json::{json, Value};

fn world(seed: u32) -> World {
    World::new(
        Config {
            master_seed: seed,
            rare_events: false,
            ..Config::default()
        },
        vec![],
        vec![],
    )
    .unwrap()
}

fn state(world: &World) -> Value {
    serde_json::to_value(world).unwrap()
}

#[test]
fn same_seed_replays_every_component_and_rng() {
    let mut first = world(2026);
    let mut second = world(2026);
    first.step(420).unwrap();
    for _ in 0..420 {
        second.step(1).unwrap();
    }
    assert_eq!(state(&first), state(&second));
    assert_eq!(
        first
            .events
            .iter()
            .filter(|e| e.kind == "species_spawn")
            .count(),
        second
            .events
            .iter()
            .filter(|e| e.kind == "species_spawn")
            .count()
    );
    let mut different = world(2027);
    different.step(420).unwrap();
    assert_ne!(state(&first), state(&different));
}

#[test]
fn save_load_continues_rng_genetics_and_future_commands_exactly() {
    let mut original = world(17);
    original.step(47).unwrap();
    original
        .submit(
            serde_json::from_value(
                json!({"tick":80,"type":"irrigate","chunkId":"chunk_1_1","data":{"amount":0.45}}),
            )
            .unwrap(),
        )
        .unwrap();
    let encoded = serde_json::to_string(&original).unwrap();
    let mut restored: World = serde_json::from_str(&encoded).unwrap();
    restored.validate_state().unwrap();
    original.step(500).unwrap();
    restored.step(500).unwrap();
    assert_eq!(state(&original), state(&restored));
    assert!(original.pending_commands.is_empty());
}

#[test]
fn ecosystems_reproduce_persist_and_remain_bounded_for_three_years() {
    for seed in [1, 42, 2026] {
        let mut simulation = world(seed);
        simulation.step(1080).unwrap();
        let count = simulation.components.organisms.len();
        assert!(count >= 9, "seed {seed}: population collapsed to {count}");
        assert!(count <= 9 * 64);
        assert!(simulation
            .events
            .iter()
            .any(|event| event.kind == "species_reproduce"));
        assert!(simulation.components.organisms.values().any(|p| p
            .extra
            .get("genetics")
            .is_some_and(|g| g["generation"].as_u64().unwrap_or(0) > 0)));
        for biome in simulation.components.biomes.values() {
            for value in [
                biome.moisture,
                biome.soil,
                biome.canopy,
                biome.vitality,
                biome.pollution,
            ] {
                assert!((0.0..=1.0).contains(&value));
            }
        }
        assert!(simulation
            .components
            .habitats
            .values()
            .all(|h| h.seeds.len() <= 128));
    }
}

#[test]
fn irrigation_has_an_observable_growth_and_survival_benefit() {
    let mut dry = world(8);
    for biome in dry.components.biomes.values_mut() {
        biome.moisture = 0.0;
    }
    let mut watered = dry.clone();
    let command: Command = serde_json::from_value(
        json!({"type":"irrigate","chunkId":"chunk_1_1","data":{"amount":0.7}}),
    )
    .unwrap();
    watered.submit(command).unwrap();
    dry.step(7).unwrap();
    watered.step(7).unwrap();
    let center = *dry
        .components
        .habitats
        .iter()
        .find(|(_, h)| h.id == "chunk_1_1")
        .unwrap()
        .0;
    let health = |w: &World| {
        w.components
            .positions
            .iter()
            .filter(|(_, p)| p.chunk == center)
            .map(|(e, _)| w.components.growth[e].health)
            .sum::<f64>()
    };
    assert!(health(&watered) > health(&dry));
    assert!(watered.components.biomes[&center].moisture > dry.components.biomes[&center].moisture);
}

#[test]
fn chunk_input_order_does_not_change_simulation() {
    let initial = world(15);
    let chunks: Vec<ChunkSnapshot> =
        serde_json::from_value(initial.snapshot()["chunks"].clone()).unwrap();
    let mut reversed = chunks.clone();
    reversed.reverse();
    let mut first = World::new(Config::default(), chunks, vec![]).unwrap();
    let mut second = World::new(Config::default(), reversed, vec![]).unwrap();
    first.step(120).unwrap();
    second.step(120).unwrap();
    assert_eq!(state(&first), state(&second));
}

#[test]
fn projection_sync_retains_entities_rng_and_future_evolution() {
    let mut original = world(11);
    original.step(55).unwrap();
    let mut synced = original.clone();
    let chunks = serde_json::from_value(synced.snapshot()["chunks"].clone()).unwrap();
    synced.sync(chunks).unwrap();
    original.step(150).unwrap();
    synced.step(150).unwrap();
    assert_eq!(original.rng.state, synced.rng.state);
    assert_eq!(original.next_entity_id, synced.next_entity_id);
    assert_eq!(original.snapshot(), synced.snapshot());
}

#[test]
fn invalid_import_is_atomic_and_future_versions_fail() {
    let mut simulation = Some(world(5));
    let before = state(simulation.as_ref().unwrap());
    let mut corrupted = before.clone();
    corrupted["version"] = json!(99);
    assert!(dispatch(&mut simulation, json!({"op":"import","state":corrupted})).is_err());
    assert_eq!(before, state(simulation.as_ref().unwrap()));
    assert!(dispatch(&mut simulation,json!({"op":"command","command":{"type":"plant","chunkId":"chunk_1_1","data":{"speciesId":"missing"}}})).is_err());
    assert_eq!(before, state(simulation.as_ref().unwrap()));
}

#[test]
fn components_are_independent_and_corrupt_references_are_rejected() {
    let mut simulation = world(91);
    let entity = *simulation.components.organisms.keys().next().unwrap();
    assert!(simulation.components.growth.contains_key(&entity));
    assert!(!simulation.components.habitats.contains_key(&entity));
    simulation
        .components
        .positions
        .get_mut(&entity)
        .unwrap()
        .chunk = u64::MAX;
    assert!(simulation.validate_state().is_err());
}

#[test]
fn drought_tolerance_keeps_plants_healthier_in_a_drought() {
    let mut weak = world(101);
    let mut hardy = weak.clone();
    for (simulation, tolerance) in [(&mut weak, 0.0), (&mut hardy, 1.0)] {
        for biome in simulation.components.biomes.values_mut() {
            biome.moisture = 0.0;
        }
        for organism in simulation.components.organisms.values_mut() {
            organism.extra.insert(
                "genetics".into(),
                json!({"traits": {"drought_tolerance": tolerance}, "generation": 2}),
            );
        }
        simulation.step(7).unwrap();
    }
    let sum_health = |w: &World| w.components.growth.values().map(|g| g.health).sum::<f64>();
    assert!(sum_health(&hardy) > sum_health(&weak));
}

#[test]
fn changing_tick_duration_does_not_retroactively_age_organisms() {
    let mut simulation = world(99);
    simulation.config.time_per_tick_minutes = 720;
    simulation.step(10).unwrap();
    let entity = *simulation.components.organisms.keys().next().unwrap();
    assert_eq!(simulation.components.growth[&entity].age_days, 5.0);
    simulation.config.time_per_tick_minutes = 1440;
    simulation.step(1).unwrap();
    assert_eq!(simulation.components.growth[&entity].age_days, 6.0);
}

#[test]
fn step_without_snapshot_reports_time_and_events_only() {
    let mut light = Some(world(9));
    let mut full = Some(world(9));
    let response = dispatch(&mut light, json!({"op":"step","ticks":30,"snapshot":false})).unwrap();
    dispatch(&mut full, json!({"op":"step","ticks":30})).unwrap();
    assert_eq!(response["tick"], json!(30));
    assert_eq!(response["simTimeDays"], json!(30.0));
    assert!(response.get("snapshot").is_none());
    assert!(response["events"]
        .as_array()
        .is_some_and(|events| !events.is_empty()));
    // Skipping the projection must not change the simulation, and a later snapshot still reads it.
    assert_eq!(
        state(light.as_ref().unwrap()),
        state(full.as_ref().unwrap())
    );
    let snapshot = dispatch(&mut light, json!({"op":"snapshot"})).unwrap();
    assert_eq!(snapshot["snapshot"]["tick"], json!(30));
    assert_eq!(snapshot["events"], json!([]));
}

fn world_with(seed: u32, definition: SpeciesDefinition) -> World {
    World::new(
        Config {
            master_seed: seed,
            rare_events: false,
            ..Config::default()
        },
        vec![],
        vec![definition],
    )
    .unwrap()
}

/// 0 = spring … 3 = winter, for the default 90-day seasons.
fn season_of(tick: u64) -> u64 {
    (tick / 90) % 4
}

#[test]
fn catalogue_phenology_flowers_and_seeds_only_in_listed_seasons() {
    let mut meadow = world_with(
        3,
        SpeciesDefinition {
            ecology: Some(Ecology {
                flowering_seasons: vec!["spring".into()],
                fruiting_seasons: vec!["autumn".into()],
                dormant_seasons: vec![],
            }),
            ..SpeciesDefinition::default()
        },
    );
    meadow.step(360).unwrap();
    let seasons = |kind: &str| -> std::collections::BTreeSet<u64> {
        meadow
            .events
            .iter()
            .filter(|e| e.kind == kind)
            .map(|e| season_of(e.tick))
            .collect()
    };
    assert_eq!(seasons("flowering_started"), [0].into());
    assert_eq!(seasons("seeds_ripe"), [2].into());
    assert_eq!(seasons("species_reproduce"), [2].into());
}

#[test]
fn summer_dormancy_lets_spring_ephemerals_ride_out_drought() {
    let ephemeral = |dormant: Vec<String>| SpeciesDefinition {
        moisture_range: Range { min: 0.4, max: 0.9 },
        ecology: Some(Ecology {
            flowering_seasons: vec!["spring".into()],
            fruiting_seasons: vec!["spring".into()],
            dormant_seasons: dormant,
        }),
        ..SpeciesDefinition::default()
    };
    let mut sleeping = world_with(5, ephemeral(vec!["summer".into(), "autumn".into()]));
    let mut exposed = world_with(5, ephemeral(vec![]));
    sleeping.step(90).unwrap();
    exposed.step(90).unwrap();
    // A dry summer: hold every chunk at drought moisture.
    for _ in 0..90 {
        for w in [&mut sleeping, &mut exposed] {
            for biome in w.components.biomes.values_mut() {
                biome.moisture = 0.05;
            }
            w.step(1).unwrap();
        }
    }
    let alive = |w: &World| w.components.organisms.len();
    assert!(
        alive(&exposed) < alive(&sleeping),
        "{} vs {}",
        alive(&exposed),
        alive(&sleeping)
    );
    assert!(alive(&sleeping) > 0);
}

fn clover(flowering: &[&str], fruiting: &[&str]) -> SpeciesDefinition {
    SpeciesDefinition {
        id: "clover".into(),
        pollination: "insect".into(),
        ecology: Some(Ecology {
            flowering_seasons: flowering.iter().map(|s| s.to_string()).collect(),
            fruiting_seasons: fruiting.iter().map(|s| s.to_string()).collect(),
            dormant_seasons: vec![],
        }),
        ..SpeciesDefinition::default()
    }
}

fn animal(id: &str, feeds_on: &str, hosts: &[&str], needs_host: bool) -> FaunaDefinition {
    FaunaDefinition {
        id: id.into(),
        group: if needs_host { "butterfly" } else { "bee" }.into(),
        active_seasons: vec!["spring".into(), "summer".into(), "autumn".into()],
        temperature_range: Range {
            min: -50.0,
            max: 50.0,
        },
        pollution_tolerance: 1.0,
        foraging_range: 1,
        capacity_per_forage: 0.6,
        forage: vec![FaunaLink {
            plant: feeds_on.into(),
            strength: 0.8,
            takes: "nectar".into(),
            pollinates: true,
            disperses: false,
        }],
        hosts: hosts.iter().map(|s| s.to_string()).collect(),
        needs_host,
    }
}

fn with_fauna(seed: u32, plant: SpeciesDefinition, fauna: Vec<FaunaDefinition>) -> World {
    let mut world = world_with(seed, plant);
    world.set_fauna_definitions(fauna).unwrap();
    world
}

fn peak_abundance(world: &mut World, id: &str, ticks: u32) -> f64 {
    let mut peak: f64 = 0.0;
    for _ in 0..ticks {
        world.step(1).unwrap();
        let total: f64 = world
            .components
            .fauna
            .values()
            .filter_map(|p| p.get(id))
            .sum();
        peak = peak.max(total);
    }
    peak
}

#[test]
fn bees_come_only_to_flowers_they_feed_on() {
    let bloom = || clover(&["spring", "summer"], &["summer"]);
    let mut fed = with_fauna(11, bloom(), vec![animal("bee", "clover", &[], false)]);
    let mut replay = fed.clone();
    let mut hungry = with_fauna(11, bloom(), vec![animal("bee", "hawthorn", &[], false)]);
    assert!(peak_abundance(&mut fed, "bee", 180) >= 1.0);
    assert!(fed.events.iter().any(|e| e.kind == "first_sighting"));
    assert!(fed.events.iter().any(|e| e.kind == "interaction_observed"));
    assert_eq!(peak_abundance(&mut hungry, "bee", 180), 0.0);
    replay.step(180).unwrap();
    assert_eq!(state(&fed), state(&replay));
}

#[test]
fn butterflies_settle_only_where_their_larval_host_grows() {
    let bloom = || clover(&["spring", "summer"], &["summer"]);
    let mut without_host = with_fauna(
        12,
        bloom(),
        vec![animal("blue", "clover", &["vetch"], true)],
    );
    let mut with_host = with_fauna(
        12,
        bloom(),
        vec![animal("blue", "clover", &["clover"], true)],
    );
    let lonely = peak_abundance(&mut without_host, "blue", 180);
    let settled = peak_abundance(&mut with_host, "blue", 180);
    assert!(lonely < 1.0, "{lonely}");
    assert!(settled >= 1.0, "{settled}");
}

#[test]
fn bees_visiting_spring_blooms_raise_the_autumn_seed_crop() {
    // Flowers in spring, fruits in autumn: seed set depends on visits months earlier.
    let orchard = || clover(&["spring"], &["autumn"]);
    let mut visited = with_fauna(13, orchard(), vec![animal("bee", "clover", &[], false)]);
    let mut unvisited = with_fauna(13, orchard(), vec![]);
    visited.step(270).unwrap();
    unvisited.step(270).unwrap();
    let seeds = |w: &World| {
        w.events
            .iter()
            .filter(|e| e.kind == "species_reproduce")
            .count()
    };
    assert!(
        seeds(&visited) > seeds(&unvisited),
        "{} vs {}",
        seeds(&visited),
        seeds(&unvisited)
    );
}

#[test]
fn runners_spread_a_plant_that_sets_no_seed() {
    let seedless = |clonal_rate: f64| SpeciesDefinition {
        seed_production: 0.0,
        clonal_rate,
        ..SpeciesDefinition::default()
    };
    let mut runners = world_with(21, seedless(0.006));
    let mut clumps = world_with(21, seedless(0.0));
    let start = runners.components.organisms.len();
    runners.step(180).unwrap();
    clumps.step(180).unwrap();
    let clonal_births = runners
        .events
        .iter()
        .filter(|e| e.kind == "species_spawn" && e.data["source"] == "clonal")
        .count();
    assert!(clonal_births > 0);
    assert!(runners.components.organisms.len() > start);
    assert!(clumps.components.organisms.len() <= start);
}

#[test]
fn collecting_takes_seed_from_the_chosen_plants_and_planting_spends_it() {
    let mut meadow = world_with(
        3,
        SpeciesDefinition {
            ecology: Some(Ecology {
                flowering_seasons: vec!["summer".into()],
                fruiting_seasons: vec!["autumn".into()],
                dormant_seasons: vec![],
            }),
            ..SpeciesDefinition::default()
        },
    );
    let species = meadow.definitions.keys().next().unwrap().clone();
    let plant = |chunk: &str| -> Command {
        serde_json::from_value(json!({"type":"plant","chunkId":chunk,"data":{"speciesId":species}}))
            .unwrap()
    };
    let collect = |chunk: &str, ids: &[String]| -> Command {
        serde_json::from_value(json!({"type":"collect","chunkId":chunk,"data":{"instanceIds":ids}}))
            .unwrap()
    };
    let everything = |w: &World| -> Vec<String> {
        w.components
            .organisms
            .values()
            .map(|o| o.id.clone())
            .collect()
    };
    assert!(
        meadow.submit(plant("chunk_0_0")).is_err(),
        "no seed in hand"
    );
    assert!(
        meadow
            .submit(collect("chunk_0_0", &everything(&meadow)))
            .is_err(),
        "nothing ripe in spring"
    );
    assert!(meadow
        .add_seeds([("missing".to_string(), 1)].into())
        .is_err());

    meadow.step(240).unwrap();
    let ripe_plants = |w: &World, chunk: &str| -> Vec<(String, f64)> {
        let c = &w.components;
        c.positions
            .iter()
            .filter(|(plant, p)| {
                c.habitats[&p.chunk].id == chunk
                    && c.reproduction[plant].stage == "fruiting"
                    && c.reproduction[plant].reserve >= 0.1
            })
            .map(|(plant, _)| (c.organisms[plant].id.clone(), c.reproduction[plant].reserve))
            .collect()
    };
    let ripe = meadow
        .components
        .habitats
        .values()
        .map(|h| h.id.clone())
        .find(|id| ripe_plants(&meadow, id).len() > 3)
        .expect("a hex with several ripe plants by mid-autumn");
    let mut before = ripe_plants(&meadow, &ripe);
    before.sort_by(|a, b| a.1.total_cmp(&b.1));
    let (least, most) = (before[0].clone(), before[before.len() - 1].clone());
    meadow
        .submit(collect(&ripe, &[least.0.clone(), most.0.clone()]))
        .unwrap();
    assert_eq!(meadow.inventory.len(), 2, "one seed from each chosen plant");
    let left: Vec<String> = ripe_plants(&meadow, &ripe)
        .into_iter()
        .map(|p| p.0)
        .collect();
    assert_eq!(left.len(), before.len() - 2);
    assert!(!left.contains(&least.0) && !left.contains(&most.0));
    let viability_from = |mother: &str| {
        meadow
            .inventory
            .iter()
            .find(|s| s.extra["genetics"]["mother"] == mother)
            .unwrap()
            .viability
    };
    assert!(
        viability_from(&least.0) < viability_from(&most.0),
        "seed taken early is less viable (reserves {} and {})",
        least.1,
        most.1
    );

    let genetics = meadow.inventory[0].extra["genetics"].clone();
    assert!(
        genetics.is_object(),
        "collected seed keeps its parent's genetics"
    );
    let seed = |viability: f64| Seed {
        species_id: species.clone(),
        x: 0.5,
        y: 0.5,
        viability,
        maturity_ticks: 0,
        extra: [("genetics".to_owned(), genetics.clone())].into(),
    };
    meadow.inventory = vec![seed(1.0), seed(0.0)];
    let room = meadow
        .components
        .habitats
        .iter()
        .min_by_key(|(chunk, _)| {
            meadow
                .components
                .positions
                .values()
                .filter(|p| p.chunk == **chunk)
                .count()
        })
        .map(|(_, h)| h.id.clone())
        .unwrap();
    let plants = meadow.components.organisms.len();
    meadow.submit(plant(&room)).unwrap();
    assert_eq!(meadow.inventory.len(), 1);
    assert_eq!(meadow.components.organisms.len(), plants + 1);
    let (_, planted) = meadow.components.organisms.last_key_value().unwrap();
    assert_eq!(planted.extra["genetics"], genetics);

    meadow.submit(plant(&room)).unwrap();
    assert!(meadow.inventory.is_empty(), "a dead seed is still spent");
    assert_eq!(meadow.components.organisms.len(), plants + 1);
    assert!(meadow.events.iter().any(|e| e.kind == "seed_failed"));
}

/// Two bluebells of one genus and a clover of another, all flowering in spring and fruiting in summer, with
/// mature plants of each in one hex.
fn bluebell_patch(seed: u32) -> (World, String) {
    let plant = |id: &str, genus: &str, max_biomass: f64| SpeciesDefinition {
        id: id.into(),
        genus: genus.into(),
        max_biomass,
        pollination: "insect".into(),
        ecology: Some(Ecology {
            flowering_seasons: vec!["spring".into()],
            fruiting_seasons: vec!["summer".into()],
            dormant_seasons: vec![],
        }),
        ..SpeciesDefinition::default()
    };
    let mut world = World::new(
        Config {
            master_seed: seed,
            rare_events: false,
            ..Config::default()
        },
        vec![],
        vec![
            plant("clover", "Trifolium", 0.5),
            plant("native", "Hyacinthoides", 0.4),
            plant("spanish", "Hyacinthoides", 0.8),
        ],
    )
    .unwrap();
    let (&hex, habitat) = world.components.habitats.iter().next().unwrap();
    let id = habitat.id.clone();
    for species in ["native", "spanish", "native", "spanish"] {
        world.spawn(hex, species, 0.5, 0.5, 1.0);
    }
    (world, id)
}

/// Cross the first plant of `receiver` not yet hand-pollinated with the first other plant of `donor`.
fn cross(world: &mut World, hex: &str, receiver: &str, donor: &str) -> Result<(), String> {
    cross_with(world, hex, receiver, donor, json!({}))
}

fn cross_with(
    world: &mut World,
    hex: &str,
    receiver: &str,
    donor: &str,
    prediction: Value,
) -> Result<(), String> {
    let c = &world.components;
    let plant = |species: &str, skip: Option<&str>| {
        c.organisms
            .iter()
            .find(|(e, o)| {
                o.species_id == species
                    && c.habitats[&c.positions[e].chunk].id == hex
                    && Some(o.id.as_str()) != skip
                    && (skip.is_some() || c.reproduction[e].pollen.is_none())
            })
            .map(|(_, o)| o.id.clone())
            .unwrap()
    };
    let mother = plant(receiver, None);
    let father = plant(donor, Some(&mother));
    let data = json!({"mother": mother, "father": father, "prediction": prediction});
    world.submit(serde_json::from_value(json!({"type":"cross","chunkId":hex,"data":data})).unwrap())
}

fn pollinated(world: &World) -> Vec<&str> {
    world
        .components
        .reproduction
        .iter()
        .filter_map(|(entity, r)| {
            r.pollen
                .as_ref()
                .map(|_| world.components.organisms[entity].species_id.as_str())
        })
        .collect()
}

#[test]
fn only_flowering_plants_of_one_genus_cross() {
    let (mut patch, hex) = bluebell_patch(5);
    assert!(
        cross(&mut patch, &hex, "native", "spanish").is_err(),
        "not yet in flower"
    );
    patch.step(10).unwrap();
    assert!(
        cross(&mut patch, &hex, "native", "clover").is_err(),
        "different genera"
    );
    cross(&mut patch, &hex, "native", "spanish").unwrap();
    assert_eq!(pollinated(&patch), ["native"]);
    assert!(
        cross(&mut patch, &hex, "spanish", "spanish").is_ok(),
        "two plants of one species cross too"
    );
    assert!(patch.events.iter().any(|e| e.kind == "cross_pollinated"));
}

#[test]
fn a_hand_pollinated_bloom_sets_seed_of_a_blended_hybrid() {
    let (mut patch, hex) = bluebell_patch(5);
    patch.step(10).unwrap();
    cross(&mut patch, &hex, "native", "spanish").unwrap();
    let mut replay: World = serde_json::from_str(&serde_json::to_string(&patch).unwrap()).unwrap();
    patch.step(110).unwrap();
    replay.step(110).unwrap();
    assert_eq!(
        state(&patch),
        state(&replay),
        "pollen and crossing survive save/load deterministically"
    );

    let hybrid = &patch.definitions["hybrid_native__spanish"];
    assert_eq!(hybrid.hybrid_of, ["native", "spanish"]);
    assert_eq!(hybrid.genus, "Hyacinthoides");
    assert!(
        (hybrid.max_biomass - 0.6).abs() < 1e-9,
        "traits sit between the parents"
    );
    let hybrid_seed = patch
        .events
        .iter()
        .filter(|e| {
            e.kind == "species_reproduce" && e.data["speciesId"] == "hybrid_native__spanish"
        })
        .count();
    assert!(hybrid_seed > 0, "the pollinated plant drops hybrid seed");
    assert!(pollinated(&patch).len() <= 1);
}

#[test]
fn a_backcross_stays_in_the_hybrid_taxon() {
    let (mut patch, hex) = bluebell_patch(9);
    patch.step(10).unwrap();
    cross(&mut patch, &hex, "native", "spanish").unwrap();
    patch.step(110).unwrap();
    let chunk = *patch.components.habitats.keys().next().unwrap();
    for _ in 0..2 {
        patch.spawn(chunk, "hybrid_native__spanish", 0.5, 0.5, 1.0);
    }
    patch.step(270).unwrap(); // the next spring
    cross(&mut patch, &hex, "hybrid_native__spanish", "native").unwrap();
    patch.events.clear();
    patch.step(100).unwrap();
    assert_eq!(patch.definitions.len(), 4, "no new taxon");
    assert!(patch
        .events
        .iter()
        .any(|e| e.kind == "species_reproduce" && e.data["speciesId"] == "hybrid_native__spanish"));
}

#[test]
fn animals_feed_on_hybrids_as_on_their_parents() {
    let (mut patch, hex) = bluebell_patch(5);
    let bee = || vec![animal("bee", "native", &["spanish"], false)];
    patch.set_fauna_definitions(bee()).unwrap();
    patch.step(10).unwrap();
    cross(&mut patch, &hex, "native", "spanish").unwrap();
    patch.step(110).unwrap();
    let links = |w: &World| {
        let bee = &w.fauna_definitions["bee"];
        (
            bee.forage
                .iter()
                .any(|l| l.plant == "hybrid_native__spanish"),
            bee.hosts.iter().any(|h| h == "hybrid_native__spanish"),
        )
    };
    assert_eq!(links(&patch), (true, true));
    // The host resends its catalogue definitions; hybrids keep their links.
    patch.set_fauna_definitions(bee()).unwrap();
    assert_eq!(links(&patch), (true, true));
}

fn death_causes(world: &World) -> std::collections::BTreeSet<String> {
    world
        .events
        .iter()
        .filter(|e| e.kind == "species_die")
        .map(|e| e.data["cause"].as_str().unwrap_or("").to_owned())
        .collect()
}

#[test]
fn plants_die_of_the_stress_that_limits_them() {
    let mut parched = world_with(
        4,
        SpeciesDefinition {
            moisture_range: Range { min: 0.9, max: 1.0 },
            ..SpeciesDefinition::default()
        },
    );
    parched.step(200).unwrap();
    assert!(parched
        .components
        .growth
        .values()
        .all(|g| g.limit.as_deref() == Some("drought")));
    assert_eq!(death_causes(&parched), ["drought".to_owned()].into());

    let mut ageing = world_with(
        4,
        SpeciesDefinition {
            lifespan_ticks: 20,
            seed_production: 0.0,
            ..SpeciesDefinition::default()
        },
    );
    ageing.step(120).unwrap();
    assert_eq!(death_causes(&ageing), ["old_age".to_owned()].into());
}

/// Shape the land: `height(x, y)` for each hex.
fn shape(world: &mut World, height: impl Fn(i32, i32) -> f64) {
    for habitat in world.components.habitats.values_mut() {
        habitat.elevation = height(habitat.x, habitat.y);
    }
}

fn hex(world: &World, x: i32, y: i32) -> &Biome {
    let (entity, _) = world
        .components
        .habitats
        .iter()
        .find(|(_, h)| (h.x, h.y) == (x, y))
        .unwrap();
    &world.components.biomes[entity]
}

#[test]
fn water_runs_into_a_hollow_and_pools_on_its_floor() {
    // A level twin with the same seed has the same weather, so the difference is the lie of the land.
    let mut level = World::new(
        Config {
            master_seed: 8,
            world_width: 5,
            world_height: 5,
            rare_events: false,
            ..Config::default()
        },
        vec![],
        vec![],
    )
    .unwrap();
    for biome in level.components.biomes.values_mut() {
        biome.moisture = 0.6;
    }
    let mut hollow = level.clone();
    shape(&mut hollow, |x, y| if (x, y) == (2, 2) { 0.0 } else { 1.0 });
    hollow.step(30).unwrap();
    level.step(30).unwrap();
    let water = |w: &World, x, y| {
        let b = hex(w, x, y);
        b.moisture + b.standing_water
    };
    assert!(
        water(&hollow, 2, 2) > water(&level, 2, 2) + 0.2,
        "the floor gathers water: {} vs {}",
        water(&hollow, 2, 2),
        water(&level, 2, 2)
    );
    assert!(hex(&hollow, 2, 2).standing_water > 0.0, "and it pools");
    assert!(
        water(&hollow, 2, 1) < water(&level, 2, 1),
        "the slopes give it up"
    );
}

#[test]
fn a_shallow_pond_dries_out_in_summer() {
    // A hollow keeps standing water (no runoff or drainage); only the air takes it.
    let mut pond = world(8);
    shape(&mut pond, |_, _| 0.0);
    for biome in pond.components.biomes.values_mut() {
        biome.set_water(1.2);
    }
    pond.step(60).unwrap();
    assert!(
        pond.components
            .biomes
            .values()
            .any(|b| b.standing_water > 0.0),
        "spring keeps it"
    );
    pond.step(80).unwrap();
    assert!(pond
        .components
        .biomes
        .values()
        .all(|b| b.standing_water == 0.0));
}

#[test]
fn flooding_drowns_plants_that_cannot_stand_it() {
    let flooded = |tolerance: f64| {
        let mut marsh = world_with(
            6,
            SpeciesDefinition {
                flood_tolerance: tolerance,
                seed_production: 0.0,
                ..SpeciesDefinition::default()
            },
        );
        shape(&mut marsh, |_, _| 0.0);
        for biome in marsh.components.biomes.values_mut() {
            biome.set_water(1.8);
        }
        marsh.step(60).unwrap();
        marsh
    };
    let dryland = flooded(0.0);
    assert!(dryland.components.organisms.is_empty());
    assert_eq!(death_causes(&dryland), ["waterlogging".to_owned()].into());
    assert!(!flooded(1.0).components.organisms.is_empty());
}

/// A 5×5 map whose only plants are a fixed clover patch in the given hexes (no seed, no runners).
fn clover_islands(seed: u32, hexes: &[(i32, i32)], fauna: Vec<FaunaDefinition>) -> World {
    let flowers = SpeciesDefinition {
        seed_production: 0.0,
        ..clover(&["spring", "summer"], &["autumn"])
    };
    let mut world = World::new(
        Config {
            master_seed: seed,
            world_width: 5,
            world_height: 5,
            rare_events: false,
            ..Config::default()
        },
        vec![],
        vec![flowers],
    )
    .unwrap();
    let c = &mut world.components;
    c.organisms.clear();
    c.positions.clear();
    c.growth.clear();
    c.reproduction.clear();
    for habitat in c.habitats.values_mut() {
        habitat.seeds.clear();
    }
    for &(x, y) in hexes {
        let (hex, _) = world
            .components
            .habitats
            .iter()
            .find(|(_, h)| (h.x, h.y) == (x, y))
            .map(|(e, h)| (*e, h.id.clone()))
            .unwrap();
        for _ in 0..4 {
            world.spawn(hex, "clover", 0.5, 0.5, 1.0);
        }
    }
    world.set_fauna_definitions(fauna).unwrap();
    world
}

fn ranging(mut animal: FaunaDefinition, range: u32) -> FaunaDefinition {
    animal.foraging_range = range;
    animal
}

#[test]
fn a_cut_off_patch_is_found_only_by_animals_that_can_cross_the_gap() {
    let island = [(2, 2)];
    let butterfly = || ranging(animal("blue", "clover", &["clover"], true), 1);
    let bee = || ranging(animal("bee", "clover", &[], false), 3);
    assert_eq!(
        peak_abundance(
            &mut clover_islands(3, &island, vec![butterfly()]),
            "blue",
            180
        ),
        0.0
    );
    assert!(peak_abundance(&mut clover_islands(3, &island, vec![bee()]), "bee", 180) >= 1.0);

    // A corridor of clover out to the edge lets the butterfly in.
    let corridor = [(0, 2), (1, 2), (2, 2)];
    assert!(
        peak_abundance(
            &mut clover_islands(3, &corridor, vec![butterfly()]),
            "blue",
            180
        ) >= 1.0
    );
}

#[test]
fn a_planted_hex_that_joins_two_patches_is_reported_as_a_corridor() {
    let mut split = clover_islands(3, &[(0, 2), (1, 2), (3, 2), (4, 2)], vec![]);
    split.step(1).unwrap();
    assert!(!split.events.iter().any(|e| e.kind == "corridor_formed"));
    let gap = *split
        .components
        .habitats
        .iter()
        .find(|(_, h)| (h.x, h.y) == (2, 2))
        .unwrap()
        .0;
    split.spawn(gap, "clover", 0.5, 0.5, 1.0);
    split.step(1).unwrap();
    let corridor: Vec<_> = split
        .events
        .iter()
        .filter(|e| e.kind == "corridor_formed")
        .collect();
    assert_eq!(corridor.len(), 1);
    assert_eq!(corridor[0].chunk_id, "chunk_2_2");
    assert_eq!(corridor[0].data["patches"], 2);
}

fn rare(world: &World) -> Vec<&Value> {
    world
        .events
        .iter()
        .filter(|e| e.kind == "rare_event")
        .map(|e| &e.data)
        .collect()
}

fn births(world: &World, source: &str) -> usize {
    world
        .events
        .iter()
        .filter(|e| e.kind == "species_spawn" && e.data["source"] == source)
        .count()
}

#[test]
fn a_mast_year_multiplies_the_trees_seed() {
    let oak = || SpeciesDefinition {
        category: "tree".into(),
        maturity_days: 0.0,
        ecology: Some(Ecology {
            flowering_seasons: vec!["spring".into()],
            fruiting_seasons: vec!["autumn".into()],
            dormant_seasons: vec![],
        }),
        ..SpeciesDefinition::default()
    };
    let mut usual = world_with(4, oak());
    usual.step(190).unwrap();
    let mut mast = usual.clone();
    mast.trigger_rare_event("mast_year").unwrap();
    assert_eq!(rare(&mast)[0]["kind"], "mast_year");
    let seeds = |w: &mut World| {
        w.events.clear();
        w.step(40).unwrap();
        w.events
            .iter()
            .filter(|e| e.kind == "species_reproduce")
            .count()
    };
    let (usual_seed, mast_seed) = (seeds(&mut usual), seeds(&mut mast));
    assert!(mast_seed > usual_seed * 2, "{mast_seed} vs {usual_seed}");
    // Not in spring: trees are not fruiting.
    assert!(world_with(4, oak())
        .trigger_rare_event("mast_year")
        .is_err());
}

#[test]
fn a_superbloom_wakes_buried_seed() {
    let mut usual = world_with(4, SpeciesDefinition::default());
    usual.step(5).unwrap();
    assert!(
        usual.trigger_rare_event("superbloom").is_err(),
        "needs a wet winter"
    );
    for (hex, habitat) in usual.components.habitats.iter_mut() {
        usual.components.biomes.get_mut(hex).unwrap().moisture = 0.8;
        habitat.seeds = (0..20)
            .map(|_| Seed {
                species_id: "common_grass".into(),
                x: 0.5,
                y: 0.5,
                viability: 0.9,
                maturity_ticks: 0,
                extra: Default::default(),
            })
            .collect();
    }
    let mut bloom = usual.clone();
    bloom.trigger_rare_event("superbloom").unwrap();
    // Germination rate over two days, before the seed runs out.
    usual.step(2).unwrap();
    bloom.step(2).unwrap();
    let (usual, bloom) = (births(&usual, "germination"), births(&bloom, "germination"));
    assert!(bloom * 2 > usual * 3, "{bloom} vs {usual}");
}

#[test]
fn a_migration_brings_butterflies_to_their_flowers() {
    let mut meadow = with_fauna(
        4,
        clover(&["summer"], &["autumn"]),
        vec![animal("blue", "clover", &["clover"], true)],
    );
    meadow.step(100).unwrap();
    for climate in meadow.components.climates.values_mut() {
        climate.temperature = 22.0;
    }
    meadow.trigger_rare_event("butterfly_migration").unwrap();
    assert_eq!(rare(&meadow)[0]["species"], json!(["blue"]));
    assert!(meadow
        .components
        .fauna
        .values()
        .any(|a| a.get("blue").copied().unwrap_or(0.0) >= 3.0));
}

#[test]
fn a_downpour_leaves_a_pond_in_the_lowest_hex() {
    let mut basin = world(8);
    shape(&mut basin, |x, y| if (x, y) == (2, 0) { 0.0 } else { 0.8 });
    basin.trigger_rare_event("temporary_pond").unwrap();
    assert!(hex(&basin, 2, 0).standing_water >= 0.5);
    assert_eq!(basin.events.last().unwrap().chunk_id, "chunk_2_0");
}

#[test]
fn insects_can_cross_congeners_on_their_own() {
    let (mut patch, hex_id) = bluebell_patch(5);
    patch.step(10).unwrap();
    assert!(
        patch.trigger_rare_event("spontaneous_hybrid").is_err(),
        "no insects yet"
    );
    let chunk = *patch.components.habitats.keys().next().unwrap();
    patch
        .set_fauna_definitions(vec![animal("bee", "native", &[], false)])
        .unwrap();
    patch
        .components
        .fauna
        .insert(chunk, [("bee".to_owned(), 5.0)].into());
    patch.trigger_rare_event("spontaneous_hybrid").unwrap();
    assert_eq!(pollinated(&patch).len(), 1);
    assert_eq!(patch.events.last().unwrap().chunk_id, hex_id);
}

#[test]
fn ancient_seed_sprouts_a_species_the_map_lacks_on_bare_ground() {
    let mut field = World::new(
        Config {
            master_seed: 4,
            world_width: 5,
            world_height: 5,
            rare_events: false,
            ..Config::default()
        },
        vec![],
        vec![
            SpeciesDefinition {
                id: "clover".into(),
                ..SpeciesDefinition::default()
            },
            SpeciesDefinition {
                id: "fern".into(),
                moisture_range: Range { min: 0.0, max: 1.0 },
                ..SpeciesDefinition::default()
            },
        ],
    )
    .unwrap();
    assert!(!field
        .components
        .organisms
        .values()
        .any(|o| o.species_id == "fern"));
    field.trigger_rare_event("ancient_seed").unwrap();
    assert_eq!(rare(&field)[0]["speciesId"], "fern");
    assert!(field
        .components
        .organisms
        .values()
        .any(|o| o.species_id == "fern"));
}

#[test]
fn rare_events_come_at_most_once_a_season_and_replay_exactly() {
    let run = || {
        let mut w = world(31);
        w.config.rare_events = true;
        let mut per_season = std::collections::BTreeMap::<u64, usize>::new();
        for _ in 0..(8 * 360) {
            w.step(1).unwrap();
            for e in w.events.drain(..) {
                if e.kind == "rare_event" {
                    *per_season.entry(e.tick / 90).or_default() += 1;
                }
            }
        }
        per_season
    };
    let seasons = run();
    assert!(!seasons.is_empty(), "eight years bring some");
    assert!(seasons.values().all(|n| *n == 1));
    assert!(seasons.len() < 32, "rare: not every season");
    assert_eq!(seasons, run());
}

#[test]
fn old_genetics_convert_to_the_compact_form() {
    let mut old = world(3);
    for organism in old.components.organisms.values_mut() {
        organism.extra.insert(
            "genetics".into(),
            json!({"traits":{"__ecosimMap":[["drought_tolerance",{"id":"drought_tolerance","value":0.8,"mutationRate":0.08}],["light_sensitivity",{"value":0.2}]]},"generation":4,"mutations":["x"],"adaptationScore":0.5}),
        );
    }
    old.compact_genetics();
    let genetics = &old.components.organisms.values().next().unwrap().extra["genetics"];
    assert_eq!(
        *genetics,
        json!({"traits": {"drought_tolerance": 0.8}, "generation": 4})
    );
}

#[test]
fn founders_differ_a_little() {
    let founders = world(3);
    let drought: Vec<f64> = founders
        .components
        .organisms
        .values()
        .map(|o| {
            o.extra["genetics"]["traits"]["drought_tolerance"]
                .as_f64()
                .unwrap()
        })
        .collect();
    assert!(drought.len() > 3);
    assert!(drought.iter().all(|v| (0.35..=0.65).contains(v)));
    assert!(drought.iter().any(|v| (v - drought[0]).abs() > 0.01));
}

#[test]
fn a_seed_remembers_its_parents_and_where_it_was_set() {
    let (mut patch, hex) = bluebell_patch(5);
    patch.config.site = "meadow".into();
    patch.step(10).unwrap();
    cross(&mut patch, &hex, "native", "spanish").unwrap();
    let (mother, father) = {
        let c = &patch.components;
        let pollinated = c
            .reproduction
            .iter()
            .find(|(_, r)| r.pollen.is_some())
            .unwrap();
        (
            c.organisms[pollinated.0].id.clone(),
            pollinated.1.pollen.as_ref().unwrap().donor.clone(),
        )
    };
    patch.step(110).unwrap();
    let records: Vec<&Value> = patch
        .components
        .habitats
        .values()
        .flat_map(|h| h.seeds.iter().map(|s| &s.extra))
        .chain(patch.components.organisms.values().map(|o| &o.extra))
        .filter_map(|extra| extra.get("genetics"))
        .filter(|g| g["father"] == json!(father))
        .collect();
    assert!(!records.is_empty(), "hybrid seed or seedlings exist");
    for genetics in records {
        assert_eq!(genetics["mother"], json!(mother));
        assert_eq!(genetics["origin"], "meadow");
        assert!(genetics["generation"].as_u64().unwrap() >= 1);
    }
}

fn command(json: Value) -> Command {
    serde_json::from_value(json).unwrap()
}

#[test]
fn a_planted_plant_is_followed_through_its_seed_offspring_and_death() {
    let mut garden = world_with(
        6,
        SpeciesDefinition {
            lifespan_ticks: 300,
            ..SpeciesDefinition::default()
        },
    );
    garden.config.site = "meadow".into();
    let species = garden.definitions.keys().next().unwrap().clone();
    garden.add_seeds([(species.clone(), 1)].into()).unwrap();
    garden
        .submit(command(json!({"type":"plant","chunkId":"chunk_1_1","x":0.5,"y":0.5,"data":{"speciesId":species}})))
        .unwrap();
    let (id, tag) = garden.tags.iter().next().unwrap();
    assert_eq!(
        (tag.label.as_str(), tag.reason.as_str()),
        ("#M1", "planted")
    );
    let id = id.clone();
    garden.step(420).unwrap();
    let tag = &garden.tags[&id];
    assert!(tag.seeds_set > 0, "it set seed");
    assert!(tag.descendants > 0, "and some of it germinated");
    let death = tag.died.as_ref().expect("past its lifespan");
    assert_eq!(death.cause, "old_age");
    let deaths = garden
        .events
        .iter()
        .filter(|e| e.kind == "tagged_died")
        .count();
    assert_eq!(deaths, 1, "its death is reported once");
}

#[test]
fn a_crossed_seedling_is_tagged_as_a_hybrid() {
    let (mut patch, hex) = bluebell_patch(5);
    patch.step(10).unwrap();
    cross(&mut patch, &hex, "native", "spanish").unwrap();
    patch.step(110).unwrap();
    assert!(patch
        .tags
        .values()
        .any(|t| t.reason == "hybrid" && t.species_id == "hybrid_native__spanish"));
}

#[test]
fn the_player_can_tag_and_name_any_plant() {
    let mut meadow = world(3);
    let (entity, instance) = meadow
        .components
        .organisms
        .iter()
        .next()
        .map(|(e, o)| (*e, o.id.clone()))
        .unwrap();
    let hex = meadow.components.habitats[&meadow.components.positions[&entity].chunk]
        .id
        .clone();
    let tag = |w: &mut World, data: Value| {
        w.submit(command(json!({"type":"tag","chunkId":hex,"data":data})))
    };
    tag(&mut meadow, json!({"instanceId": instance})).unwrap();
    assert_eq!(meadow.tags[&instance].reason, "chosen");
    tag(
        &mut meadow,
        json!({"instanceId": instance, "name": "  Old Gnarly  "}),
    )
    .unwrap();
    assert_eq!(meadow.tags[&instance].name.as_deref(), Some("Old Gnarly"));
    assert_eq!(meadow.tags.len(), 1, "naming does not tag again");
    assert!(tag(&mut meadow, json!({"instanceId": "nobody"})).is_err());
}

fn mean_drought_tolerance(world: &World) -> f64 {
    let values: Vec<f64> = world
        .components
        .organisms
        .values()
        .map(|o| {
            o.extra["genetics"]["traits"]["drought_tolerance"]
                .as_f64()
                .unwrap()
        })
        .collect();
    values.iter().sum::<f64>() / values.len() as f64
}

#[test]
fn drought_selects_for_drought_tolerance_against_the_baseline() {
    let thirsty = || SpeciesDefinition {
        moisture_range: Range {
            min: 0.45,
            max: 0.9,
        },
        ..SpeciesDefinition::default()
    };
    let mut dry = world_with(7, thirsty());
    let mut watered = world_with(7, thirsty());
    dry.step(1).unwrap();
    watered.step(1).unwrap();
    let species = dry.definitions.keys().next().unwrap().clone();
    let baseline = &dry.baselines[&species];
    assert_eq!(baseline.tick, 1, "recorded when the site is first seen");
    let counted: u32 = baseline.traits["drought_tolerance"].iter().sum();
    assert_eq!(counted as usize, dry.components.organisms.len());
    let start = mean_drought_tolerance(&dry);

    for _ in 0..6 * 360 {
        for biome in dry.components.biomes.values_mut() {
            biome.moisture = 0.3;
        }
        dry.step(1).unwrap();
    }
    watered.step(6 * 360).unwrap();
    assert_eq!(dry.baselines[&species].tick, 1, "the baseline is kept");
    let (shifted, drifted) = (
        mean_drought_tolerance(&dry) - start,
        mean_drought_tolerance(&watered) - start,
    );
    assert!(shifted > 0.04, "six dry years moved the mean by {shifted}");
    assert!(drifted.abs() < 0.02, "watered drift {drifted}");
}

#[test]
fn the_notebook_keeps_a_cross_its_prediction_and_its_seedlings() {
    let (mut patch, hex) = bluebell_patch(5);
    patch.step(10).unwrap();
    cross_with(
        &mut patch,
        &hex,
        "native",
        "native",
        json!({"drought_tolerance": "between", "cold_resistance": "sideways", "made_up": "lower"}),
    )
    .unwrap();
    let cross = patch.crosses[0].clone();
    assert_eq!(cross.mother_species, "native");
    assert_eq!(
        cross.prediction,
        [("drought_tolerance".to_owned(), "between".to_owned())].into(),
        "only real traits and the three answers are kept"
    );
    assert_eq!(
        cross.parents[0].len(),
        5,
        "the parents' traits as they were"
    );

    patch.step(360).unwrap();
    let seedlings = &patch.crosses[0].seedlings;
    assert!(!seedlings.is_empty(), "the crossed seed came up");
    for seedling in seedlings {
        let plant = patch
            .components
            .organisms
            .values()
            .find(|o| o.id == seedling.id);
        if let Some(plant) = plant {
            assert_eq!(
                plant.species_id, "native",
                "a cross within a species is no hybrid"
            );
            assert_eq!(plant.extra["genetics"]["father"], cross.father.as_str());
        }
        assert_eq!(patch.tags[&seedling.id].reason, "crossed");
    }
}

#[test]
fn plants_on_soil_outside_their_ph_range_are_limited_by_it() {
    let lime_lover = SpeciesDefinition {
        ph_range: Range { min: 7.0, max: 8.5 },
        ..SpeciesDefinition::default()
    };
    let mut acid = world_with(4, lime_lover.clone());
    let mut chalk = world_with(4, lime_lover);
    for biome in acid.components.biomes.values_mut() {
        biome.ph = 4.5;
    }
    for biome in chalk.components.biomes.values_mut() {
        biome.ph = 7.5;
    }
    acid.step(20).unwrap();
    chalk.step(20).unwrap();
    let limited = |w: &World| {
        w.components
            .growth
            .values()
            .filter(|g| g.limit.as_deref() == Some("soil_ph"))
            .count()
    };
    assert!(limited(&acid) > 0);
    assert_eq!(limited(&chalk), 0);
    acid.step(100).unwrap();
    chalk.step(100).unwrap();
    assert!(death_causes(&acid).contains("soil_ph"));
    assert!(
        acid.components.organisms.len() < chalk.components.organisms.len(),
        "{} on acid soil vs {} on chalk",
        acid.components.organisms.len(),
        chalk.components.organisms.len()
    );
}

#[test]
fn a_sample_reads_the_hex_and_its_tray_shows_the_buried_seed() {
    let mut meadow = world(6);
    let (&chunk, habitat) = meadow.components.habitats.iter().next().unwrap();
    let id = habitat.id.clone();
    let buried = |species: &str, viability: f64| Seed {
        species_id: species.into(),
        x: 0.5,
        y: 0.5,
        viability,
        maturity_ticks: 0,
        extra: Default::default(),
    };
    let habitat = meadow.components.habitats.get_mut(&chunk).unwrap();
    habitat.seeds = vec![buried("violet", 1.0), buried("dead", 0.0)];
    meadow.components.biomes.get_mut(&chunk).unwrap().ph = 5.2;
    meadow
        .submit(command(json!({"type":"sample","chunkId":id,"data":{}})))
        .unwrap();
    let sample = meadow.samples[&id].clone();
    assert_eq!(sample.ph, 5.2);
    assert_eq!(sample.tray, ["violet"], "only viable seed comes up");
    let projected = meadow.snapshot();
    let hex = projected["chunks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == id.as_str())
        .unwrap();
    assert_eq!(hex["sample"]["ph"], 5.2);

    meadow.step(13).unwrap();
    assert!(!meadow.events.iter().any(|e| e.kind == "tray_ready"));
    meadow.step(2).unwrap();
    let ready: Vec<_> = meadow
        .events
        .iter()
        .filter(|e| e.kind == "tray_ready")
        .collect();
    assert_eq!(ready.len(), 1, "announced once, after two weeks");
    assert_eq!(ready[0].data["species"], json!(["violet"]));
}

#[test]
fn water_is_projected_flowing_downhill() {
    let mut slope = World::new(
        Config {
            master_seed: 8,
            world_width: 3,
            world_height: 1,
            rare_events: false,
            ..Config::default()
        },
        vec![],
        vec![],
    )
    .unwrap();
    shape(&mut slope, |x, _| 1.0 - x as f64 * 0.5);
    for biome in slope.components.biomes.values_mut() {
        biome.moisture = 0.5;
    }
    slope.step(1).unwrap();
    let chunks = slope.snapshot()["chunks"].clone();
    let outflow = |x: usize| chunks[x]["outflow"].clone();
    assert!(outflow(0)["chunk_1_0"].as_f64().unwrap() > 0.0);
    assert!(outflow(1)["chunk_2_0"].as_f64().unwrap() > 0.0);
    assert!(
        outflow(2).as_object().unwrap().is_empty(),
        "the foot of the slope"
    );
}

#[test]
fn seed_is_planted_by_the_site_it_came_from_and_the_plant_remembers_it() {
    let mut garden = world(3);
    let species = garden.definitions.keys().next().unwrap().clone();
    let seed = |origin: Option<&str>| Seed {
        species_id: species.clone(),
        x: 0.5,
        y: 0.5,
        viability: 1.0,
        maturity_ticks: 0,
        extra: [(
            "genetics".to_owned(),
            match origin {
                Some(site) => json!({"traits": {}, "generation": 1, "origin": site}),
                None => json!({"traits": {}, "generation": 0}),
            },
        )]
        .into(),
    };
    garden.inventory = vec![seed(None), seed(Some("meadow")), seed(Some("wetland"))];
    let pouch = garden.snapshot()["pouch"][&species].clone();
    assert_eq!(pouch, json!({"": 1, "meadow": 1, "wetland": 1}));

    let hex = garden
        .components
        .habitats
        .values()
        .next()
        .unwrap()
        .id
        .clone();
    let plant = |origin: &str| {
        command(json!({"type":"plant","chunkId":hex,"data":{"speciesId":species,"origin":origin}}))
    };
    garden.submit(plant("wetland")).unwrap();
    garden.submit(plant("meadow")).unwrap();
    assert!(
        garden.submit(plant("meadow")).is_err(),
        "no more meadow seed"
    );
    let origins: Vec<_> = garden.tags.values().map(|t| t.origin.clone()).collect();
    assert_eq!(
        origins,
        [Some("wetland".to_owned()), Some("meadow".to_owned())]
    );
    assert_eq!(garden.inventory.len(), 1, "the packet seed is left");
    assert!(garden.tags.values().all(|t| t.hex == hex));
}

fn fungus(id: &str, lifestyle: &str, host: &str, seasons: &[&str]) -> FungusDefinition {
    FungusDefinition {
        id: id.into(),
        lifestyle: lifestyle.into(),
        hosts: vec![host.into()],
        fruiting_seasons: seasons.iter().map(|s| s.to_string()).collect(),
    }
}

fn birches(seed: u32, fungi: Vec<FungusDefinition>) -> World {
    let tree = SpeciesDefinition {
        id: "birch".into(),
        category: "tree".into(),
        moisture_range: Range { min: 0.4, max: 0.9 },
        ..SpeciesDefinition::default()
    };
    let mut w = world_with(seed, tree);
    w.set_fungus_definitions(fungi).unwrap();
    w
}

fn mean_health(w: &World) -> f64 {
    w.components.growth.values().map(|g| g.health).sum::<f64>() / w.components.growth.len() as f64
}

#[test]
fn a_mycorrhizal_partner_carries_its_host_through_drought_and_fruits_in_autumn() {
    let agaric = || fungus("fly_agaric", "mycorrhizal", "birch", &["autumn"]);
    let mut partnered = birches(9, vec![agaric()]);
    let mut alone = birches(9, vec![]);
    for w in [&mut partnered, &mut alone] {
        w.step(360).unwrap();
    }
    assert!(partnered.fungi.values().any(|f| f["fly_agaric"] >= 0.3));
    for _ in 0..180 {
        for w in [&mut partnered, &mut alone] {
            for b in w.components.biomes.values_mut() {
                b.moisture = 0.28;
            }
            w.step(1).unwrap();
        }
    }
    assert!(
        mean_health(&partnered) > mean_health(&alone) + 0.15,
        "{} with the fungus vs {} without",
        mean_health(&partnered),
        mean_health(&alone)
    );
    // Day 540 is autumn: the established mycelium fruits, and only then.
    let fruiting = |w: &World| {
        w.snapshot()["chunks"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|c| c["fruiting"] == json!(["fly_agaric"]))
            .count()
    };
    assert!(fruiting(&partnered) > 0);
    partnered.step(90).unwrap();
    assert_eq!(fruiting(&partnered), 0, "no fruiting bodies in winter");
}

#[test]
fn honey_fungus_finishes_off_stressed_hosts() {
    let rot = || fungus("honey_fungus", "parasite", "birch", &["autumn"]);
    let mut infected = birches(4, vec![rot()]);
    infected.step(60).unwrap();
    for (entity, growth) in infected.components.growth.iter_mut() {
        growth.health = 0.3;
        let chunk = infected.components.positions[entity].chunk;
        infected
            .fungi
            .entry(chunk)
            .or_default()
            .insert("honey_fungus".into(), 1.0);
    }
    for b in infected.components.biomes.values_mut() {
        b.moisture = 0.35;
    }
    infected.step(120).unwrap();
    assert!(death_causes(&infected).contains("root_rot"));
}

#[test]
fn dead_wood_rots_faster_with_a_saprotroph_and_feeds_the_soil() {
    let snuff = || fungus("candlesnuff", "saprotroph", "birch", &["winter"]);
    let mut worked = birches(5, vec![snuff()]);
    let mut left = birches(5, vec![]);
    for w in [&mut worked, &mut left] {
        for b in w.components.biomes.values_mut() {
            b.deadwood = 0.8;
            b.soil = 0.3;
        }
    }
    worked.step(360).unwrap();
    left.step(360).unwrap();
    let total = |w: &World, f: fn(&Biome) -> f64| w.components.biomes.values().map(f).sum::<f64>();
    assert!(worked.fungi.values().any(|f| f.contains_key("candlesnuff")));
    assert!(total(&worked, |b| b.deadwood) < total(&left, |b| b.deadwood) * 0.8);

    let mut felled = birches(5, vec![]);
    let (&entity, _) = felled.components.growth.iter().next().unwrap();
    felled.components.growth.get_mut(&entity).unwrap().health = 0.0;
    felled.step(1).unwrap();
    assert!(
        felled.components.biomes.values().any(|b| b.deadwood > 0.0),
        "a dead tree leaves wood"
    );
}
