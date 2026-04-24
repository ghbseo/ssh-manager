use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;

use base64::{engine::general_purpose, Engine as _};
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use tauri::{AppHandle, Emitter};

use crate::store::{Profile, Settings};

type SharedWriter = Arc<Mutex<Box<dyn Write + Send>>>;

pub struct Session {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: SharedWriter,
    pub child: Box<dyn portable_pty::Child + Send + Sync>,
}

#[derive(Default)]
pub struct SessionStore {
    inner: Mutex<HashMap<String, Session>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::default()
    }
}

pub fn open(
    app: &AppHandle,
    store: &SessionStore,
    session_id: String,
    profile: &Profile,
    settings: &Settings,
    secret: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("openpty: {e}"))?;

    let mut cmd = CommandBuilder::new("ssh");
    for (k, v) in std::env::vars() {
        cmd.env(k, v);
    }
    if let Ok(cwd) = std::env::current_dir() {
        cmd.cwd(cwd);
    }

    cmd.arg("-tt"); // force pty allocation
    // Accept previously-unknown host keys without blocking; changed keys still fail.
    cmd.arg("-o");
    cmd.arg("StrictHostKeyChecking=accept-new");
    cmd.arg("-p");
    cmd.arg(profile.port.to_string());
    if let Some(key) = profile.key_path.as_deref() {
        if !key.is_empty() {
            cmd.arg("-i");
            cmd.arg(key);
        }
    }
    for a in settings.default_ssh_args.split_whitespace() {
        cmd.arg(a);
    }
    let target = if profile.user.is_empty() {
        profile.host.clone()
    } else {
        format!("{}@{}", profile.user, profile.host)
    };
    cmd.arg(target);

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn ssh: {e}"))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("clone reader: {e}"))?;
    let raw_writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("take writer: {e}"))?;
    let writer: SharedWriter = Arc::new(Mutex::new(raw_writer));

    let writer_for_reader = writer.clone();
    let id_for_thread = session_id.clone();
    let app_for_thread = app.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        // Accumulate recent textual output so we can detect a prompt split
        // across multiple reads. Trimmed to a small window.
        let mut recent = String::new();
        let mut secret_sent = secret.is_none();

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = &buf[..n];
                    let encoded = general_purpose::STANDARD.encode(chunk);
                    let _ = app_for_thread
                        .emit(&format!("pty:data:{}", id_for_thread), encoded);

                    if !secret_sent {
                        recent.push_str(&String::from_utf8_lossy(chunk));
                        if recent.len() > 2048 {
                            // Drop the oldest ~1KB, nudging forward to the
                            // next char boundary so we never slice a
                            // multi-byte UTF-8 sequence.
                            let mut cut = recent.len() - 1024;
                            while cut < recent.len() && !recent.is_char_boundary(cut) {
                                cut += 1;
                            }
                            recent.drain(..cut);
                        }
                        let lower = recent.to_lowercase();
                        // Typical prompts:
                        //   "user@host's password:"
                        //   "Password:"
                        //   "Enter passphrase for key '...':"
                        if lower.contains("password:") || lower.contains("passphrase") {
                            if let Some(sec) = &secret {
                                if let Ok(mut w) = writer_for_reader.lock() {
                                    let _ = w.write_all(sec.as_bytes());
                                    let _ = w.write_all(b"\n");
                                    let _ = w.flush();
                                }
                            }
                            secret_sent = true;
                            recent.clear();
                        }
                    }
                }
                Err(_) => break,
            }
        }
        let _ = app_for_thread.emit(&format!("pty:exit:{}", id_for_thread), ());
    });

    store.inner.lock().unwrap().insert(
        session_id,
        Session {
            master: pair.master,
            writer,
            child,
        },
    );
    Ok(())
}

pub fn write(store: &SessionStore, session_id: &str, data: &[u8]) -> Result<(), String> {
    let writer = {
        let map = store.inner.lock().unwrap();
        let s = map
            .get(session_id)
            .ok_or_else(|| "session not found".to_string())?;
        s.writer.clone()
    };
    let mut w = writer.lock().map_err(|e| format!("writer lock: {e}"))?;
    w.write_all(data).map_err(|e| format!("write: {e}"))?;
    let _ = w.flush();
    Ok(())
}

pub fn resize(
    store: &SessionStore,
    session_id: &str,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let map = store.inner.lock().unwrap();
    let s = map
        .get(session_id)
        .ok_or_else(|| "session not found".to_string())?;
    s.master
        .resize(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("resize: {e}"))?;
    Ok(())
}

pub fn close(store: &SessionStore, session_id: &str) -> Result<(), String> {
    let mut map = store.inner.lock().unwrap();
    if let Some(mut s) = map.remove(session_id) {
        let _ = s.child.kill();
    }
    Ok(())
}
