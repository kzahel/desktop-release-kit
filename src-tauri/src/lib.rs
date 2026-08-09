use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{Manager, State};

const UPDATE_ENDPOINT: &str =
    "https://updates.graehlarts.com/canary/tauri/{{target}}/{{arch}}/{{current_version}}";
const INSTALL_ID_FILE: &str = "cfu-id";

struct CanaryState {
    installation_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CanaryInfo {
    version: &'static str,
    target: &'static str,
    arch: &'static str,
    installation_id: String,
    endpoint: &'static str,
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarProbe {
    schema_version: u8,
    version: String,
    build_id: String,
    target: String,
    arch: String,
}

fn read_valid_installation_id(path: &Path) -> Option<String> {
    let value = std::fs::read_to_string(path).ok()?;
    let value = value.trim();
    uuid::Uuid::parse_str(value).ok()?;
    Some(value.to_owned())
}

fn get_or_create_installation_id(config_dir: &Path) -> Result<String, String> {
    let path = config_dir.join(INSTALL_ID_FILE);
    if let Some(id) = read_valid_installation_id(&path) {
        return Ok(id);
    }

    std::fs::create_dir_all(config_dir)
        .map_err(|error| format!("create canary config directory: {error}"))?;
    let id = uuid::Uuid::new_v4().to_string();
    let temporary = config_dir.join(format!("{INSTALL_ID_FILE}.tmp"));
    std::fs::write(&temporary, format!("{id}\n"))
        .map_err(|error| format!("write temporary installation ID: {error}"))?;
    std::fs::rename(&temporary, &path)
        .map_err(|error| format!("publish installation ID: {error}"))?;
    Ok(id)
}

fn resolve_sidecar(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let target_triple = option_env!("TARGET_TRIPLE").unwrap_or(env!("TAURI_ENV_TARGET_TRIPLE"));
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("resolve resource directory: {error}"))?;
    let executable_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf));
    let suffix = std::env::consts::EXE_SUFFIX;
    let names = [
        format!("binaries/canary-sidecar-{target_triple}{suffix}"),
        format!("binaries/canary-sidecar{suffix}"),
        format!("canary-sidecar-{target_triple}{suffix}"),
        format!("canary-sidecar{suffix}"),
    ];

    for directory in [Some(resource_dir.as_path()), executable_dir.as_deref()]
        .into_iter()
        .flatten()
    {
        for name in &names {
            let candidate = directory.join(name);
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }
    Err(format!(
        "could not locate packaged canary sidecar for {target_triple}"
    ))
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn get_canary_info(state: State<'_, CanaryState>) -> CanaryInfo {
    CanaryInfo {
        version: env!("CARGO_PKG_VERSION"),
        target: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        installation_id: state.installation_id.clone(),
        endpoint: UPDATE_ENDPOINT,
    }
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn probe_sidecar(app: tauri::AppHandle) -> Result<SidecarProbe, String> {
    let path = resolve_sidecar(&app)?;
    let output = std::process::Command::new(&path)
        .output()
        .map_err(|error| format!("run {}: {error}", path.display()))?;
    if !output.status.success() {
        return Err(format!(
            "sidecar exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let probe: SidecarProbe = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("parse sidecar probe: {error}"))?;
    if probe.schema_version != 1 {
        return Err(format!(
            "unsupported sidecar probe schema {}",
            probe.schema_version
        ));
    }
    if probe.version != env!("CARGO_PKG_VERSION") {
        return Err(format!(
            "sidecar version {} does not match app version {}",
            probe.version,
            env!("CARGO_PKG_VERSION")
        ));
    }
    Ok(probe)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
/// Start the Desktop Release Canary application.
///
/// # Panics
///
/// Panics when Tauri cannot create or run the native application runtime.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![get_canary_info, probe_sidecar])
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .map_err(|error| format!("resolve canary config directory: {error}"))?;
            let installation_id = get_or_create_installation_id(&config_dir)?;
            let updater = tauri_plugin_updater::Builder::new()
                .header("X-CFU-Id", &installation_id)?
                .build();
            app.handle().plugin(updater)?;
            app.manage(CanaryState { installation_id });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Desktop Release Canary");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn installation_id_is_stable_and_valid() {
        let directory = tempfile::tempdir().expect("temporary directory");
        let first = get_or_create_installation_id(directory.path()).expect("create ID");
        let second = get_or_create_installation_id(directory.path()).expect("read ID");
        assert_eq!(first, second);
        assert!(uuid::Uuid::parse_str(&first).is_ok());
    }

    #[test]
    fn malformed_stored_id_is_replaced() {
        let directory = tempfile::tempdir().expect("temporary directory");
        std::fs::write(directory.path().join(INSTALL_ID_FILE), "not-a-uuid\n")
            .expect("write malformed ID");
        let replacement =
            get_or_create_installation_id(directory.path()).expect("replace malformed ID");
        assert!(uuid::Uuid::parse_str(&replacement).is_ok());
        assert_ne!(replacement, "not-a-uuid");
    }
}
