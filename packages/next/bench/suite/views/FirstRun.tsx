import "./first-run.css";
import {} from "../engines.mjs";
import { Badge, Button, IconButton, Link, Typography } from "@mui/material";
import { svgCopy } from "@stratakit/icons/copy";
import { svgRefresh } from "@stratakit/icons/refresh";
import { Icon } from "@stratakit/mui";
import { Link as RouterLink } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Page, toast, useRuns } from "./common.tsx";

/**
 * The guided first run (DESIGN.md, Help): what Dyno is for, the setup
 * checked live (WebGPU, the 1.x builds, the results directory), one
 * command for a first measured run, and where to look afterwards. Shown
 * at /start, and wherever a view needs runs and there are none.
 */

type CheckState = "ready" | "missing" | "later" | "optional" | "checking";
type Check = { state: CheckState; detail: ReactNode };

/** Each state as a word and a color (never color alone). */
const STATE: Record<
  CheckState,
  [string, "success" | "error" | "info" | "secondary"]
> = {
  ready: ["Ready", "success"],
  missing: ["Missing", "error"],
  later: ["On first run", "info"],
  optional: ["Optional", "secondary"],
  checking: ["Checking", "secondary"],
};

const FIRST_RUN =
  'node packages/next/bench/suite/cli.mjs run --scenes osm-philadelphia --engines 1.146.0,2.0 --reps 3 --note "first run"';

function useChecks(): Record<"webgpu" | "release" | "repo", Check> {
  const checking: Check = { state: "checking", detail: "Checking…" };
  const [checks, setChecks] = useState({
    webgpu: checking,
    release: checking,
    repo: checking,
  });
  useEffect(() => {
    let cancelled = false;
    const set = (key: keyof typeof checks, check: Check) =>
      !cancelled && setChecks((c) => ({ ...c, [key]: check }));
    void (async () => {
      const gpu = (navigator as { gpu?: GPU }).gpu;
      const adapter = await gpu?.requestAdapter().catch(() => null);
      set(
        "webgpu",
        adapter
          ? {
              state: "ready",
              detail:
                `${adapter.info.vendor || "GPU"} ${adapter.info.architecture}`.trim(),
            }
          : {
              state: "missing",
              detail:
                "No WebGPU adapter in this browser. Runs drive Edge or Chrome themselves; this browser needs WebGPU only for the Explorer and the Lab.",
            },
      );
    })();
    // The dev server answers a missing file with the app's page (200,
    // text/html), so only a non-HTML answer means the file is there.
    const exists = (url: string) =>
      fetch(url, { method: "HEAD" })
        .then(
          (r) =>
            r.ok &&
            !(r.headers.get("content-type") ?? "").includes("text/html"),
        )
        .catch(() => false);
    void exists("/cesium-release/1.146.0/package/Build/Cesium/Cesium.js").then(
      (ok) =>
        set(
          "release",
          ok
            ? { state: "ready", detail: "CesiumJS 1.146.0 is in the store." }
            : {
                state: "later",
                detail:
                  "The first run downloads CesiumJS 1.146.0 from npm, once.",
              },
        ),
    );
    void exists("/cesium1x/Cesium.js").then((ok) =>
      set(
        "repo",
        ok
          ? { state: "ready", detail: "This repository's 1.x build is there." }
          : {
              state: "optional",
              detail: (
                <>
                  To measure this repository's 1.x (configuration{" "}
                  <code>1.x</code>), run <code>npm run build</code> at the
                  repository root.
                </>
              ),
            },
      ),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return checks;
}

function CheckRow({ label, check }: { label: string; check: Check }) {
  const [word, color] = STATE[check.state];
  return (
    <div className="first-run-check" role="listitem">
      <Typography variant="body-sm" className="first-run-check-label">
        {label}
      </Typography>
      <span>
        <Badge
          variant="inline"
          size="small"
          type="muted"
          color={color}
          badgeContent={word}
        />
      </span>
      <Typography variant="body-sm" color="textSecondary">
        {check.detail}
      </Typography>
    </div>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="first-run-step">
      <Typography variant="subtitle-md" render={<h2 />}>
        {title}
      </Typography>
      <div className="first-run-step-body">{children}</div>
    </li>
  );
}

/** A link to one of Dyno's views. */
const To = ({
  to,
  children,
}: {
  to: "/runs" | "/trends" | "/alerts" | "/explorer" | "/images" | "/lab";
  children: ReactNode;
}) => <Link render={<RouterLink to={to} />}>{children}</Link>;

export function FirstRun() {
  const { index, summaries } = useRuns();
  const checks = useChecks();
  const copy = () =>
    void navigator.clipboard
      ?.writeText(FIRST_RUN)
      .then(() => toast("Command copied"))
      .catch(() => toast("Could not copy: select the command instead", "bad"));
  return (
    <Page
      title={summaries.length ? "Getting started" : "No runs yet"}
      description="Dyno measures CesiumJS 1.x and 2.0 on the same scenes, camera paths and settings, and follows the results run to run. A first run takes a few minutes."
      className="first-run"
    >
      <ol className="first-run-steps">
        <Step title="Check the setup">
          <div className="first-run-checks" role="list">
            <CheckRow label="WebGPU" check={checks.webgpu} />
            <CheckRow label="Released 1.x" check={checks.release} />
            <CheckRow label="Repository 1.x" check={checks.repo} />
            <CheckRow
              label="Results"
              check={{
                state: "ready",
                detail: (
                  <>
                    Read from <code>{index.directory}</code>, outside the
                    repository because they record machine details. Set{" "}
                    <code>BENCH_RESULTS</code> to keep them elsewhere.
                  </>
                ),
              }}
            />
          </div>
        </Step>
        <Step title="Run one scene in both engines">
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            From the repository root, with nothing else using the GPU. The suite
            records clocks, temperature and power, and flags runs it can't
            trust.
          </Typography>
          <div className="first-run-command">
            <pre>
              <code>{FIRST_RUN}</code>
            </pre>
            <IconButton label="Copy command" variant="outlined" onClick={copy}>
              <Icon href={svgCopy} />
            </IconButton>
          </div>
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            Drop <code>--scenes</code> to run the whole catalog (about an hour);
            add <code>--scenarios uncapped-orbit</code> to measure frame rates
            above the display's.
          </Typography>
        </Step>
        <Step title="Reload to see the results">
          <div>
            <Button
              color="primary"
              startIcon={<Icon href={svgRefresh} />}
              onClick={() => location.reload()}
            >
              Reload
            </Button>
          </div>
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            Each run's report in <To to="/runs">Runs</To> gives the verdict and
            every scene in detail. <To to="/trends">Trends</To> follows metrics
            from run to run, and <To to="/alerts">Alerts</To> start after about
            six runs of a scene.
          </Typography>
        </Step>
        <Step title="Meanwhile, look at a scene live">
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            The <To to="/explorer">Explorer</To> needs no runs: both engines
            side by side on a scene's camera path, with tiles tinted by depth,
            bounding volumes and each level's selection compared. Image checks
            from <code>cli.mjs images --parity</code> are reviewed in{" "}
            <To to="/images">Images</To>, and the <To to="/lab">Lab</To> has
            focused parity checks and microbenchmarks.
          </Typography>
        </Step>
      </ol>
      <Typography variant="caption-lg" color="textSecondary" render={<p />}>
        More in the plan, §16 (benchmark suite) and §16.9 (Dyno):{" "}
        <Link href="/CESIUM2_WEBGPU_PLAN.md" target="_blank" rel="noreferrer">
          CESIUM2_WEBGPU_PLAN.md
          <span aria-hidden="true">&nbsp;↗</span>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </Link>
      </Typography>
    </Page>
  );
}
