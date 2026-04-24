use keyring::Entry;

const SERVICE: &str = "ssh-manager";

fn account(id: &str, kind: &str) -> String {
    format!("profile:{id}:{kind}")
}

fn entry(id: &str, kind: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, &account(id, kind)).map_err(|e| format!("keyring new: {e}"))
}

pub fn set(id: &str, kind: &str, value: &str) -> Result<(), String> {
    entry(id, kind)?
        .set_password(value)
        .map_err(|e| format!("keyring set: {e}"))
}

pub fn get(id: &str, kind: &str) -> Result<Option<String>, String> {
    match entry(id, kind)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("keyring get: {e}")),
    }
}

pub fn has(id: &str, kind: &str) -> Result<bool, String> {
    Ok(get(id, kind)?.is_some())
}

pub fn delete(id: &str, kind: &str) -> Result<(), String> {
    match entry(id, kind)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("keyring delete: {e}")),
    }
}
