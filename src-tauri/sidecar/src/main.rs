use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Probe<'a> {
    schema_version: u8,
    version: &'a str,
    build_id: &'a str,
    target: &'a str,
    arch: &'a str,
}

fn main() {
    let probe = Probe {
        schema_version: 1,
        version: env!("CARGO_PKG_VERSION"),
        build_id: option_env!("CANARY_BUILD_ID").unwrap_or("local"),
        target: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    };
    println!(
        "{}",
        serde_json::to_string(&probe).expect("serialize sidecar probe")
    );
}
