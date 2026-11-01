import {
  Badge,
  Button,
  Card,
  Code,
  Flex,
  Heading,
  Link as RadixLink,
  Text,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ClipboardCopyIcon,
  CrossCircledIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { toast, useRuns } from "./common.tsx";

/**
 * The guided first run (plan §16.9, Experience): what Dyno is for, the
 * setup checked live (WebGPU, the 1.x builds, the results directory),
 * one command for a first measured run, and where to look afterwards.
 * Shown wherever a view needs runs and there are none, and at /start.
 */

type Check = { state: "ok" | "bad" | "pending"; detail: ReactNode };

const FIRST_RUN =
  'node packages/next/bench/suite/cli.mjs run --scenes osm-philadelphia --configs 1.x-release,2.0 --reps 3 --note "first run"';

function useChecks(): Record<"webgpu" | "release" | "repo", Check> {
  const pending: Check = { state: "pending", detail: "checking…" };
  const [checks, setChecks] = useState({
    webgpu: pending,
    release: pending,
    repo: pending,
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
              state: "ok",
              detail:
                `${adapter.info.vendor || "GPU"} ${adapter.info.architecture}`.trim(),
            }
          : {
              state: "bad",
              detail:
                "No WebGPU adapter in this browser. The suite drives Edge or Chrome with WebGPU; this page only needs it for the Explorer.",
            },
      );
    })();
    const exists = (url: string) =>
      fetch(url, { method: "HEAD" })
        .then((r) => r.ok)
        .catch(() => false);
    void exists("/cesium-release/1.146.0/package/Build/Cesium/Cesium.js").then(
      (ok) =>
        set(
          "release",
          ok
            ? { state: "ok", detail: "CesiumJS 1.146.0 is in the store." }
            : {
                state: "pending",
                detail:
                  "Not downloaded yet: the first run fetches CesiumJS 1.146.0 from npm (once) into the store.",
              },
        ),
    );
    void exists("/cesium1x/Cesium.js").then((ok) =>
      set(
        "repo",
        ok
          ? { state: "ok", detail: "This repository's 1.x build is there." }
          : {
              state: "pending",
              detail: (
                <>
                  Optional: <Code>npm run build</Code> at the repository root to
                  benchmark this repository's 1.x (configuration{" "}
                  <Code>1.x</Code>).
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
  return (
    <Flex gap="2" align="start">
      {check.state === "ok" ? (
        <CheckCircledIcon color="var(--green-11)" />
      ) : check.state === "bad" ? (
        <CrossCircledIcon color="var(--red-11)" />
      ) : (
        <CheckCircledIcon color="var(--gray-8)" />
      )}
      <Text size="2">
        <Text weight="medium">{label}</Text> · {check.detail}
      </Text>
    </Flex>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <Flex gap="3">
      <Badge radius="full" size="2" variant="soft">
        {n}
      </Badge>
      <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
        <Text weight="medium">{title}</Text>
        {children}
      </Flex>
    </Flex>
  );
}

export function FirstRun() {
  const { index, summaries } = useRuns();
  const checks = useChecks();
  const copy = (text: string) =>
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast("Command copied"));
  return (
    <Card size="3" className="first-run" style={{ maxWidth: 820 }}>
      <Flex direction="column" gap="4">
        <div>
          <Heading size="4" mb="1">
            {summaries.length ? "Getting started" : "No runs yet"}
          </Heading>
          <Text as="p" size="2" color="gray">
            Dyno measures CesiumJS 1.x and 2.0 on the same scenes, camera paths
            and render settings, and tracks the results run to run. A run takes
            a few minutes per scene; here is a first one.
          </Text>
        </div>
        <Step n={1} title="Check the setup">
          <CheckRow label="WebGPU" check={checks.webgpu} />
          <CheckRow label="Released 1.x" check={checks.release} />
          <CheckRow label="Repository 1.x" check={checks.repo} />
          <CheckRow
            label="Results"
            check={{
              state: "ok",
              detail: (
                <>
                  read from <Code>{index.directory}</Code>, outside the
                  repository (they carry machine details); set{" "}
                  <Code>BENCH_RESULTS</Code> to move them.
                </>
              ),
            }}
          />
        </Step>
        <Step n={2} title="Run one scene in both engines">
          <Text size="2" color="gray">
            From the repository root, with nothing else using the GPU (the suite
            records clocks, temperature and power, and flags runs it can't
            trust):
          </Text>
          <Flex gap="2" align="start">
            <Code size="2" className="command" style={{ flex: 1 }}>
              {FIRST_RUN}
            </Code>
            <Button size="1" variant="soft" onClick={() => copy(FIRST_RUN)}>
              <ClipboardCopyIcon /> Copy
            </Button>
          </Flex>
          <Text size="2" color="gray">
            Drop <Code>--scenes</Code> to run the whole catalog (about an hour),
            add <Code>--scenarios uncapped-orbit</Code> for frame rates above
            the display's.
          </Text>
        </Step>
        <Step n={3} title="Reload, then read the results">
          <Flex gap="2" wrap="wrap">
            <Button size="1" onClick={() => location.reload()}>
              <ReloadIcon /> Reload
            </Button>
          </Flex>
          <Text size="2" color="gray">
            The run's report (from <Link to="/runs">Runs</Link>) gives the
            verdict, the scorecard and each scene in detail; the{" "}
            <Link to="/workspace">Workspace</Link> follows metrics across runs;{" "}
            <Link to="/alerts">Alerts</Link> appear after about six runs of a
            scene.
          </Text>
        </Step>
        <Step n={4} title="Meanwhile, look at a scene live">
          <Text size="2" color="gray">
            The <Link to="/explorer">Explorer</Link> needs no runs: both engines
            side by side on a scene's camera path, or flying freely, with tiles
            tinted by depth, bounding volumes and the selection compared level
            by level. Image checks: <Code>cli.mjs images --parity</Code>,
            reviewed under <Link to="/images">Images</Link>.
          </Text>
        </Step>
        <Text size="1" color="gray">
          More in the plan, §16 (benchmark suite) and §16.9 (Dyno):{" "}
          <RadixLink href="/CESIUM2_WEBGPU_PLAN.md" target="_blank">
            CESIUM2_WEBGPU_PLAN.md
          </RadixLink>
        </Text>
      </Flex>
    </Card>
  );
}
