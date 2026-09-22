use ecosim_core::{model::Config, world::World};
use std::time::Instant;

fn main() {
    let mut world = World::new(
        Config {
            world_width: 6,
            world_height: 6,
            ..Config::default()
        },
        vec![],
        vec![],
    )
    .unwrap();
    world.step(200).unwrap();
    let start = Instant::now();
    for _ in 0..100 {
        world.step(1).unwrap();
        world.events.clear();
    }
    println!("step average: {:?}", start.elapsed() / 100);
    let start = Instant::now();
    for _ in 0..100 {
        std::hint::black_box(world.snapshot());
    }
    println!("snapshot Value average: {:?}", start.elapsed() / 100);
    let start = Instant::now();
    for _ in 0..100 {
        std::hint::black_box(serde_json::to_vec(&world.snapshot()).unwrap());
    }
    println!("snapshot+serialize average: {:?}", start.elapsed() / 100);
    println!(
        "plants: {}, snapshot bytes: {}",
        world.components.organisms.len(),
        serde_json::to_vec(&world.snapshot()).unwrap().len()
    );
}
