use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

use crate::store::{Profile, Settings};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCandidate {
    pub name: String,
    pub path: String,
    pub args_template: String,
}

const WT_TEMPLATE: &str =
    "new-tab --title \"{name}\" ssh {user}@{host} -p {port} {keyArg} {sshArgs}";
const POWERSHELL_TEMPLATE: &str =
    "-NoExit -Command ssh {user}@{host} -p {port} {keyArg} {sshArgs}";
const CMD_TEMPLATE: &str = "/K ssh {user}@{host} -p {port} {keyArg} {sshArgs}";
const WSL_BASH_TEMPLATE: &str = "-c \"ssh {user}@{host} -p {port} {keyArg} {sshArgs}; exec bash\"";

pub fn detect() -> Vec<TerminalCandidate> {
    let mut out = Vec::new();
    let candidates = [
        ("Windows Terminal", "wt.exe", WT_TEMPLATE),
        ("PowerShell 7", "pwsh.exe", POWERSHELL_TEMPLATE),
        ("Windows PowerShell", "powershell.exe", POWERSHELL_TEMPLATE),
        ("Command Prompt", "cmd.exe", CMD_TEMPLATE),
        ("WSL Bash", "bash.exe", WSL_BASH_TEMPLATE),
    ];
    for (name, exe, tpl) in candidates {
        if let Ok(path) = which::which(exe) {
            out.push(TerminalCandidate {
                name: name.to_string(),
                path: path.to_string_lossy().into_owned(),
                args_template: tpl.to_string(),
            });
        }
    }
    out
}

/// Expand template placeholders using profile + settings values.
fn render(template: &str, profile: &Profile, settings: &Settings) -> String {
    let key_arg = match profile.key_path.as_deref() {
        Some(p) if !p.is_empty() => format!("-i \"{}\"", p),
        _ => String::new(),
    };
    template
        .replace("{name}", &profile.name)
        .replace("{host}", &profile.host)
        .replace("{port}", &profile.port.to_string())
        .replace("{user}", &profile.user)
        .replace("{keyPath}", profile.key_path.as_deref().unwrap_or(""))
        .replace("{keyArg}", &key_arg)
        .replace("{sshArgs}", &settings.default_ssh_args)
}

/// Very small shell-style splitter supporting double-quoted tokens.
/// Good enough for the templates we ship; users who need advanced quoting
/// can wrap their terminal in a shim script.
fn split_args(input: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;
    for ch in input.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            c if c.is_whitespace() && !in_quotes => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
            }
            c => cur.push(c),
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

pub fn spawn(profile: &Profile, settings: &Settings) -> Result<(), String> {
    let exe = settings.terminal_path.trim();
    if exe.is_empty() {
        return Err(
            "Terminal path is not configured. Open Settings and choose a terminal."
                .to_string(),
        );
    }
    let exe_path = PathBuf::from(exe);
    if !exe_path.exists() {
        return Err(format!("Terminal executable not found: {}", exe));
    }

    let rendered = render(&settings.terminal_args_template, profile, settings);
    let args = split_args(&rendered);

    Command::new(&exe_path)
        .args(&args)
        .spawn()
        .map_err(|e| format!("spawn terminal: {e}"))?;

    Ok(())
}
