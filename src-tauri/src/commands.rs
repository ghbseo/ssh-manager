use base64::{engine::general_purpose, Engine as _};
use tauri::{AppHandle, State};

use crate::pty::{self, SessionStore};
use crate::secrets;
use crate::store::{self, Profile, Store};
use crate::terminal::{self, TerminalCandidate};

#[tauri::command]
pub fn load_store(app: AppHandle) -> Result<Store, String> {
    store::load(&app)
}

#[tauri::command]
pub fn save_store(app: AppHandle, store: Store) -> Result<(), String> {
    crate::store::save(&app, &store)
}

#[tauri::command]
pub fn upsert_profile(app: AppHandle, profile: Profile) -> Result<(), String> {
    store::upsert_profile(&app, profile)
}

#[tauri::command]
pub fn delete_profile(app: AppHandle, id: String) -> Result<(), String> {
    // Best-effort secret cleanup for both kinds.
    let _ = secrets::delete(&id, "password");
    let _ = secrets::delete(&id, "passphrase");
    store::delete_profile(&app, &id)
}

#[tauri::command]
pub fn set_profile_secret(
    app: AppHandle,
    id: String,
    kind: String,
    value: String,
) -> Result<(), String> {
    validate_kind(&kind)?;
    secrets::set(&id, &kind, &value)?;
    // Reflect "hasSecret" on the stored profile for UI.
    if let Some(mut p) = store::find_profile(&app, &id)? {
        p.has_secret = true;
        store::upsert_profile(&app, p)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_profile_secret(
    app: AppHandle,
    id: String,
    kind: String,
) -> Result<(), String> {
    validate_kind(&kind)?;
    secrets::delete(&id, &kind)?;
    let pw = secrets::has(&id, "password").unwrap_or(false);
    let pp = secrets::has(&id, "passphrase").unwrap_or(false);
    if let Some(mut p) = store::find_profile(&app, &id)? {
        p.has_secret = pw || pp;
        store::upsert_profile(&app, p)?;
    }
    Ok(())
}

#[tauri::command]
pub fn has_profile_secret(id: String, kind: String) -> Result<bool, String> {
    validate_kind(&kind)?;
    secrets::has(&id, &kind)
}

#[tauri::command]
pub fn connect_profile(app: AppHandle, id: String) -> Result<(), String> {
    let profile = store::find_profile(&app, &id)?
        .ok_or_else(|| format!("Profile not found: {id}"))?;
    let settings = store::get_settings(&app)?;
    terminal::spawn(&profile, &settings)
}

#[tauri::command]
pub fn detect_terminals() -> Vec<TerminalCandidate> {
    terminal::detect()
}

fn validate_kind(kind: &str) -> Result<(), String> {
    match kind {
        "password" | "passphrase" => Ok(()),
        other => Err(format!("invalid secret kind: {other}")),
    }
}

#[tauri::command]
pub fn pty_open(
    app: AppHandle,
    sessions: State<'_, SessionStore>,
    session_id: String,
    profile_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let profile = store::find_profile(&app, &profile_id)?
        .ok_or_else(|| format!("Profile not found: {profile_id}"))?;
    let settings = store::get_settings(&app)?;

    // Fetch the secret matching the profile's auth type so the PTY reader
    // thread can auto-inject it when ssh prompts for it.
    let secret = match profile.auth_type.as_str() {
        "password" => secrets::get(&profile.id, "password").ok().flatten(),
        "key" => secrets::get(&profile.id, "passphrase").ok().flatten(),
        _ => None,
    };

    pty::open(
        &app,
        sessions.inner(),
        session_id,
        &profile,
        &settings,
        secret,
        cols,
        rows,
    )
}

#[tauri::command]
pub fn pty_write(
    sessions: State<'_, SessionStore>,
    session_id: String,
    data_b64: String,
) -> Result<(), String> {
    let bytes = general_purpose::STANDARD
        .decode(&data_b64)
        .map_err(|e| format!("decode base64: {e}"))?;
    pty::write(sessions.inner(), &session_id, &bytes)
}

#[tauri::command]
pub fn pty_resize(
    sessions: State<'_, SessionStore>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    pty::resize(sessions.inner(), &session_id, cols, rows)
}

#[tauri::command]
pub fn pty_close(
    sessions: State<'_, SessionStore>,
    session_id: String,
) -> Result<(), String> {
    pty::close(sessions.inner(), &session_id)
}
