mod commands;
mod pty;
mod secrets;
mod store;
mod terminal;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(pty::SessionStore::new())
        .setup(|app| {
            // Ensure app data directory exists so the first save doesn't race.
            if let Ok(dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(&dir);
            }

            // DevTools defense-in-depth.
            // Release builds don't include the devtools API at all (no
            // `devtools` feature on the tauri crate), so there's nothing to
            // open. Debug builds enable devtools automatically, so we poll
            // and close it if anything manages to open it.
            #[cfg(debug_assertions)]
            if let Some(win) = app.get_webview_window("main") {
                let win = win.clone();
                std::thread::spawn(move || loop {
                    if win.is_devtools_open() {
                        win.close_devtools();
                    }
                    std::thread::sleep(std::time::Duration::from_millis(200));
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_store,
            commands::save_store,
            commands::upsert_profile,
            commands::delete_profile,
            commands::set_profile_secret,
            commands::delete_profile_secret,
            commands::has_profile_secret,
            commands::connect_profile,
            commands::detect_terminals,
            commands::pty_open,
            commands::pty_write,
            commands::pty_resize,
            commands::pty_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
