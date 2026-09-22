use ecosim_core::{dispatch, model::*, world::World};
use serde_json::{json, Value};

fn world(seed: u32) -> World {
    World::new(
        Config {
            master_seed: seed,
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
fn selected_genetic_traits_change_survival_and_measured_fitness() {
    let mut weak = world(101);
    let mut hardy = weak.clone();
    for (simulation, tolerance) in [(&mut weak, 0.0), (&mut hardy, 1.0)] {
        for biome in simulation.components.biomes.values_mut() {
            biome.moisture = 0.0;
        }
        for organism in simulation.components.organisms.values_mut() {
            organism.extra.insert("genetics".into(),json!({"traits":{"__ecosimMap":[["drought_tolerance",{"value":tolerance}]]},"generation":2,"mutations":[],"adaptationScore":0.5}));
        }
        simulation.step(7).unwrap();
    }
    let sum_health = |w: &World| w.components.growth.values().map(|g| g.health).sum::<f64>();
    assert!(sum_health(&hardy) > sum_health(&weak));
    let sum_fitness = |w: &World| {
        w.components
            .organisms
            .values()
            .map(|o| o.extra["genetics"]["adaptationScore"].as_f64().unwrap())
            .sum::<f64>()
    };
    assert!(sum_fitness(&hardy) > sum_fitness(&weak));
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
