//! Authoritative, deterministic ECS kernel. The browser only schedules whole ticks and projects snapshots.
pub mod model;
mod projection;
mod systems;
pub mod world;

use model::*;
use serde::Serialize;
use serde_json::{json, Value};
use std::cell::RefCell;
use world::World;

const MAX_REQUEST_BYTES: usize = 64 * 1024 * 1024;

fn execute(world: &mut Option<World>, request: Value) -> Result<(), String> {
    let op = request["op"].as_str().ok_or("Request requires an op")?;
    if op == "init" {
        let config: Config =
            serde_json::from_value(request.get("config").cloned().unwrap_or(json!({})))
                .map_err(|e| e.to_string())?;
        let chunks = serde_json::from_value(request.get("chunks").cloned().unwrap_or(json!([])))
            .map_err(|e| e.to_string())?;
        let definitions = serde_json::from_value(
            request
                .get("speciesDefinitions")
                .cloned()
                .unwrap_or(json!([])),
        )
        .map_err(|e| e.to_string())?;
        let mut initialized = World::new(config, chunks, definitions)?;
        initialized.tick = request.get("tick").and_then(Value::as_u64).unwrap_or(0);
        initialized.elapsed_minutes = request
            .get("simTimeDays")
            .and_then(Value::as_f64)
            .map(|d| (d.max(0.0) * 1440.0).round() as u64)
            .unwrap_or(initialized.tick * initialized.config.time_per_tick_minutes);
        *world = Some(initialized);
    } else if op == "import" {
        let imported: World =
            serde_json::from_value(request["state"].clone()).map_err(|e| e.to_string())?;
        imported.validate_state()?;
        *world = Some(imported);
    }
    let world = world
        .as_mut()
        .ok_or("Simulation has not been initialized")?;
    match op {
        "init" | "import" | "snapshot" | "export" => {}
        "step" => {
            let ticks = request.get("ticks").and_then(Value::as_u64).unwrap_or(1);
            if ticks > 10000 {
                return Err("Step limit exceeded".into());
            }
            world.step(ticks as u32)?;
        }
        "command" => {
            let command: Command =
                serde_json::from_value(request["command"].clone()).map_err(|e| e.to_string())?;
            world.submit(command)?;
        }
        "sync" => {
            // Stage external edits so a rejected payload never partially mutates the authoritative world.
            let mut candidate = world.clone();
            if let Some(config) = request.get("config") {
                if let Some(minutes) = config.get("timePerTickMinutes") {
                    let minutes = minutes
                        .as_u64()
                        .ok_or("Tick duration must be an integer number of minutes")?;
                    if !(1..=1440).contains(&minutes) {
                        return Err("Tick duration must be 1..1440 minutes".into());
                    }
                    candidate.config.time_per_tick_minutes = minutes;
                }
            }
            if let Some(definitions) = request.get("speciesDefinitions") {
                candidate.set_definitions(
                    serde_json::from_value(definitions.clone()).map_err(|e| e.to_string())?,
                )?;
            }
            if let Some(chunks) = request.get("chunks") {
                candidate
                    .sync(serde_json::from_value(chunks.clone()).map_err(|e| e.to_string())?)?;
            }
            *world = candidate;
        }
        _ => return Err(format!("Unknown operation: {op}")),
    }
    Ok(())
}

#[derive(Serialize)]
struct SnapshotResponse<'a> {
    ok: bool,
    snapshot: projection::Snapshot<'a>,
    events: &'a [Event],
}

#[derive(Serialize)]
struct ExportResponse<'a> {
    ok: bool,
    state: &'a World,
}

/// Execute and serialize directly from borrowed component stores, without intermediate JSON trees.
pub fn dispatch_bytes(
    world: &mut Option<World>,
    request: Value,
    buffer: &mut Vec<u8>,
) -> Result<(), String> {
    let op = request["op"]
        .as_str()
        .ok_or("Request requires an op")?
        .to_owned();
    execute(world, request)?;
    buffer.clear();
    let world = world
        .as_mut()
        .ok_or("Simulation has not been initialized")?;
    if op == "sync" {
        buffer.extend_from_slice(b"{\"ok\":true}");
        return Ok(());
    }
    if op == "export" {
        return serde_json::to_writer(
            buffer,
            &ExportResponse {
                ok: true,
                state: world,
            },
        )
        .map_err(|error| error.to_string());
    }
    let result = serde_json::to_writer(
        buffer,
        &SnapshotResponse {
            ok: true,
            snapshot: world.snapshot_view(),
            events: &world.events,
        },
    )
    .map_err(|error| error.to_string());
    world.events.clear();
    result
}

pub fn dispatch(world: &mut Option<World>, request: Value) -> Result<Value, String> {
    let mut buffer = Vec::new();
    dispatch_bytes(world, request, &mut buffer)?;
    serde_json::from_slice(&buffer).map_err(|error| error.to_string())
}

thread_local! {
    static WORLD: RefCell<Option<World>> = const { RefCell::new(None) };
    static RESPONSE: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

/// Allocate a zeroed request buffer. A zero pointer means the size was rejected.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    if len == 0 || len > MAX_REQUEST_BYTES {
        return std::ptr::null_mut();
    }
    Box::into_raw(vec![0_u8; len].into_boxed_slice()).cast::<u8>()
}

/// # Safety
/// `ptr` and `len` must refer to an unfreed allocation returned by `alloc`.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    if !ptr.is_null() && len > 0 && len <= MAX_REQUEST_BYTES {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
    }
}

/// # Safety
/// `ptr` must point to `len` initialized bytes owned by the calling host.
/// The response remains valid until the next request; the host must not deallocate it.
#[no_mangle]
pub unsafe extern "C" fn request(ptr: *const u8, len: usize) -> *const u8 {
    RESPONSE.with(|response| {
        let mut buffer = response.borrow_mut();
        let result = if ptr.is_null() || len == 0 || len > MAX_REQUEST_BYTES {
            Err("Invalid request buffer".into())
        } else {
            serde_json::from_slice(std::slice::from_raw_parts(ptr, len))
                .map_err(|error| error.to_string())
                .and_then(|value| {
                    WORLD.with(|world| dispatch_bytes(&mut world.borrow_mut(), value, &mut buffer))
                })
        };
        if let Err(error) = result {
            buffer.clear();
            serde_json::to_writer(&mut *buffer, &json!({"ok":false,"error":error}))
                .expect("Error responses contain only strings");
        }
        buffer.as_ptr()
    })
}

#[no_mangle]
pub extern "C" fn response_len() -> usize {
    RESPONSE.with(|buffer| buffer.borrow().len())
}
