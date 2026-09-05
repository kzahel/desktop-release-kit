fn main() {
    println!("cargo:rerun-if-env-changed=CANARY_BUILD_ID");
    println!("cargo:rerun-if-env-changed=GITHUB_SHA");
    println!("cargo:rerun-if-changed=../.git/HEAD");
    if let Ok(output) = std::process::Command::new("git")
        .args(["rev-parse", "--git-path", "refs/heads/main"])
        .output()
    {
        if output.status.success() {
            println!(
                "cargo:rerun-if-changed={}",
                String::from_utf8_lossy(&output.stdout).trim()
            );
        }
    }
    let build_id = std::env::var("CANARY_BUILD_ID")
        .ok()
        .or_else(|| {
            std::env::var("GITHUB_SHA")
                .ok()
                .map(|sha| sha.chars().take(12).collect())
        })
        .unwrap_or_else(|| {
            std::process::Command::new("git")
                .args(["rev-parse", "--short=12", "HEAD"])
                .output()
                .ok()
                .filter(|output| output.status.success())
                .map_or_else(
                    || "uncommitted".into(),
                    |output| String::from_utf8_lossy(&output.stdout).trim().to_owned(),
                )
        });
    println!("cargo:rustc-env=CANARY_BUILD_ID={build_id}");
    tauri_build::build();
}
