use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub auth_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_path: Option<String>,
    pub has_secret: bool,
    pub group_id: Option<String>,
    pub favorite: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub expanded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub terminal_path: String,
    pub terminal_args_template: String,
    pub default_ssh_args: String,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            terminal_path: String::new(),
            terminal_args_template: String::from(
                "new-tab --title \"{name}\" ssh {user}@{host} -p {port} {keyArg} {sshArgs}",
            ),
            default_ssh_args: String::new(),
            theme: String::from("system"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Store {
    #[serde(default)]
    pub profiles: Vec<Profile>,
    #[serde(default)]
    pub groups: Vec<Group>,
    #[serde(default)]
    pub settings: Settings,
    #[serde(default = "default_version")]
    pub version: u32,
}

fn default_version() -> u32 {
    1
}

impl Default for Store {
    fn default() -> Self {
        Self {
            profiles: Vec::new(),
            groups: Vec::new(),
            settings: Settings::default(),
            version: 1,
        }
    }
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("mkdir: {e}"))?;
    Ok(dir.join("profiles.json"))
}

pub fn load(app: &AppHandle) -> Result<Store, String> {
    let path = store_path(app)?;
    if !path.exists() {
        return Ok(Store::default());
    }
    let bytes = fs::read(&path).map_err(|e| format!("read: {e}"))?;
    let store: Store = serde_json::from_slice(&bytes).map_err(|e| format!("parse: {e}"))?;
    Ok(store)
}

pub fn save(app: &AppHandle, store: &Store) -> Result<(), String> {
    let path = store_path(app)?;
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(store).map_err(|e| format!("serialize: {e}"))?;
    fs::write(&tmp, &bytes).map_err(|e| format!("write tmp: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| format!("rename: {e}"))?;
    Ok(())
}

pub fn upsert_profile(app: &AppHandle, profile: Profile) -> Result<(), String> {
    let mut store = load(app)?;
    if let Some(existing) = store.profiles.iter_mut().find(|p| p.id == profile.id) {
        *existing = profile;
    } else {
        store.profiles.push(profile);
    }
    save(app, &store)
}

pub fn delete_profile(app: &AppHandle, id: &str) -> Result<(), String> {
    let mut store = load(app)?;
    store.profiles.retain(|p| p.id != id);
    save(app, &store)
}

pub fn find_profile(app: &AppHandle, id: &str) -> Result<Option<Profile>, String> {
    let store = load(app)?;
    Ok(store.profiles.into_iter().find(|p| p.id == id))
}

pub fn get_settings(app: &AppHandle) -> Result<Settings, String> {
    Ok(load(app)?.settings)
}
