import { useEffect, useMemo, useState } from "react";
import { loadRuntimeFacts, type RuntimeFacts } from "./native";
import { progressPercent, type UpdaterState } from "./updater/state";
import { useDesktopUpdater } from "./updater/useDesktopUpdater";

const RELEASES_URL = "https://github.com/kzahel/desktop-release-kit/releases";

function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function statusCopy(state: UpdaterState): { title: string; body: string } {
  switch (state.phase) {
    case "idle":
      return {
        title: "Update system ready",
        body: state.lastReason
          ? `The last ${state.lastReason} check completed without presenting an update.`
          : "Startup and daily checks run silently. Manual checks report their result.",
      };
    case "checking":
      return {
        title: "Checking the shared server",
        body: "Resolving signed release metadata for this exact target and architecture.",
      };
    case "up-to-date":
      return {
        title: "This is the newest release",
        body: "The update server returned no newer compatible version.",
      };
    case "available":
      return {
        title: `Signed update ${state.version} is available`,
        body: `Discovered by the ${state.reason} check. Installation remains an explicit action.`,
      };
    case "manual-install":
      return {
        title: "This package keeps its own update boundary",
        body: `${state.packageLabel} installations should be replaced through the same package channel.`,
      };
    case "downloading":
      return {
        title: `Downloading ${state.version}`,
        body: state.totalBytes
          ? `${Math.round(state.downloadedBytes / 1024)} KB of ${Math.round(state.totalBytes / 1024)} KB received.`
          : `${Math.round(state.downloadedBytes / 1024)} KB received.`,
      };
    case "installing":
      return {
        title: `Installing ${state.version}`,
        body: "The canary will relaunch after Tauri replaces the signed application.",
      };
    case "error":
      return {
        title: `${state.operation === "check" ? "Update check" : "Installation"} failed`,
        body: state.message,
      };
  }
}

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd title={title}>{value}</dd>
    </div>
  );
}

export function App() {
  const [facts, setFacts] = useState<RuntimeFacts | null>(null);
  const [factsError, setFactsError] = useState<string | null>(null);
  const updater = useDesktopUpdater();
  const copy = useMemo(() => statusCopy(updater.state), [updater.state]);
  const progress = progressPercent(updater.state);

  useEffect(() => {
    void loadRuntimeFacts()
      .then(setFacts)
      .catch((error: unknown) => {
        setFactsError(error instanceof Error ? error.message : String(error));
      });
  }, []);

  const busy =
    updater.state.phase === "checking" ||
    updater.state.phase === "downloading" ||
    updater.state.phase === "installing";
  const canInstall =
    updater.state.phase === "available" ||
    (updater.state.phase === "error" && updater.state.operation === "install");

  return (
    <main>
      <header className="hero">
        <div className="mark" aria-hidden="true">
          <span>✓</span>
        </div>
        <div>
          <div className="hero-labels">
            <p className="eyebrow">Desktop release infrastructure</p>
            <span className="acceptance-build">
              {facts ? `${facts.version} acceptance build` : "Acceptance build"}
            </span>
          </div>
          <h1>Canary control panel</h1>
          <p className="lede">
            A deliberately small application that exercises signed packaging,
            shared update routing, installation, relaunch, resources, and a
            nested sidecar across macOS, Windows, and Linux.
          </p>
        </div>
      </header>

      <section className={`status status-${updater.state.phase}`} aria-live="polite">
        <div>
          <p className="status-kicker">Updater state</p>
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
        <div className="actions">
          <button
            className="primary"
            type="button"
            disabled={busy}
            onClick={() => void (canInstall ? updater.install() : updater.check("manual"))}
          >
            {canInstall ? "Install and relaunch" : busy ? "Working…" : "Check now"}
          </button>
          {updater.state.phase !== "idle" && !busy ? (
            <button type="button" onClick={updater.dismiss}>
              Dismiss
            </button>
          ) : null}
        </div>
        {updater.state.phase === "downloading" ? (
          <div
            className={`progress ${progress === undefined ? "indeterminate" : ""}`}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={progress === undefined ? undefined : { width: `${progress}%` }} />
          </div>
        ) : null}
        {updater.state.phase === "available" && updater.state.notes ? (
          <pre className="notes">{updater.state.notes}</pre>
        ) : null}
      </section>

      <div className="grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Installed artifact</p>
              <h2>Runtime identity</h2>
            </div>
            <span className={factsError ? "health bad" : facts ? "health good" : "health"}>
              {factsError ? "failed" : facts ? "verified" : "loading"}
            </span>
          </div>
          {facts ? (
            <dl className="facts">
              <Fact label="Version" value={facts.version} />
              <Fact label="Target" value={`${facts.target} / ${facts.arch}`} />
              <Fact label="Bundle" value={facts.bundleType ?? "unknown"} />
              <Fact
                label="Install ID"
                value={shortId(facts.installationId)}
                title={facts.installationId}
              />
            </dl>
          ) : (
            <p className="muted">{factsError ?? "Reading native runtime facts…"}</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Replacement proof</p>
              <h2>Build markers</h2>
            </div>
          </div>
          {facts ? (
            <dl className="facts">
              <Fact
                label="Webview"
                value={shortId(facts.webviewBuildId)}
                title={facts.webviewBuildId}
              />
              <Fact
                label="Sidecar"
                value={shortId(facts.sidecar.buildId)}
                title={facts.sidecar.buildId}
              />
              <Fact label="Sidecar version" value={facts.sidecar.version} />
              <Fact label="Sidecar target" value={`${facts.sidecar.target} / ${facts.sidecar.arch}`} />
            </dl>
          ) : (
            <p className="muted">The packaged sidecar is probed at startup.</p>
          )}
        </section>
      </div>

      <section className="panel route-panel">
        <div>
          <p className="section-label">Shared control plane</p>
          <h2>Product-owned route</h2>
        </div>
        <code>{facts?.endpoint ?? "https://updates.graehlarts.com/canary/tauri/…"}</code>
        <a href={RELEASES_URL} target="_blank" rel="noreferrer">
          GitHub releases ↗
        </a>
      </section>

      <footer>
        The updater public key is embedded in this app. Private signing material
        remains outside the repository and is unique to this canary.
      </footer>
    </main>
  );
}
