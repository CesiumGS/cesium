import "./lab.css";
import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CircularProgress,
  IconButton,
  Link,
  Typography,
} from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { svgCopy } from "@stratakit/icons/copy";
import { svgPlay } from "@stratakit/icons/play";
import { Icon } from "@stratakit/mui";
import { getRouteApi, Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { Harness } from "../../../lab/harness.ts";
import { HARNESS_GROUPS, HARNESSES } from "../../../lab/pages.ts";
import { ensureCesium } from "../cesium1x.ts";
import { Empty, Page, Section, toast } from "./common.tsx";

/**
 * The Lab (DESIGN.md, Workbench): parity checks, microbenchmarks and
 * spikes, each mounted in Dyno from its module (lab/harness.ts). Runs
 * here are for looking; measurements come from the CLI runner, which
 * opens each page on its own.
 */

const labRoute = getRouteApi("/lab/$id");

/** The command that runs a page headless, from the repository root. */
const runnerCommand = (id: string) => `node packages/next/bench/run.mjs ${id}`;

/** Group descriptions in Dyno's words (lab/pages.ts has the titles). */
const GROUP_DESCRIPTIONS: Partial<Record<string, string>> = {
  spikes: "Early prototypes behind the plan's first decisions.",
};

const copy = (text: string) =>
  void navigator.clipboard
    ?.writeText(text)
    .then(() => toast("Command copied"))
    .catch(() => toast("Could not copy: select the command instead", "bad"));

/** A command people run, with a button that copies it. */
function Command({ text }: { text: string }) {
  return (
    <div className="lab-command">
      <code>{text}</code>
      <IconButton label="Copy command" size="small" onClick={() => copy(text)}>
        <Icon href={svgCopy} />
      </IconButton>
    </div>
  );
}

export function Lab() {
  return (
    <Page
      title="Lab"
      description="Focused checks and measurements, one engine behavior each. Open one to run it here and look at the result."
      help={
        <>
          <p>
            Runs in Dyno share the page with everything else, so they are for
            looking, not for numbers. For measurements you can compare, run a
            page headless with the CLI runner, which opens it on its own:
          </p>
          <p>
            <code>{runnerCommand("<id>")}</code>
          </p>
        </>
      }
    >
      {HARNESS_GROUPS.map(([group, title, description]) => (
        <Section
          key={group}
          title={title}
          description={GROUP_DESCRIPTIONS[group] ?? description}
        >
          <ul className="lab-grid">
            {HARNESSES.filter((h) => h.group === group).map((h) => (
              <li key={h.id}>
                <Card className="lab-card">
                  <CardHeader
                    title={
                      <CardActionArea
                        render={
                          <RouterLink to="/lab/$id" params={{ id: h.id }} />
                        }
                        nativeButton={false}
                      >
                        {h.title}
                      </CardActionArea>
                    }
                    slotProps={{
                      title: { variant: "subtitle-sm", render: <h3 /> },
                    }}
                  />
                  <CardContent className="lab-card-content">
                    <Typography variant="body-sm" color="textSecondary">
                      {h.description}
                    </Typography>
                    {h.cesium1x && (
                      <Badge
                        variant="inline"
                        color="secondary"
                        type="outlined"
                        size="small"
                        badgeContent="1.x and 2.0"
                        className="lab-badge"
                      />
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </Page>
  );
}

const backToLab = (
  <Link render={<RouterLink to="/lab" />} className="lab-back">
    <Icon href={svgArrowLeft} />
    Lab
  </Link>
);

/** What a load failure means, and what to try. */
function loadError(e: unknown, needs1x: boolean): string {
  const message = e instanceof Error ? e.message : String(e);
  if (needs1x && /not found/i.test(message)) {
    return "This page needs this repository's 1.x build. Run npm run build at the repository root, then reload.";
  }
  return `${message}. Check the dev server's output, or open the page on its own to see its console.`;
}

export function LabPage() {
  const { id } = labRoute.useParams();
  const search = labRoute.useSearch();
  const info = HARNESSES.find((h) => h.id === id);
  const host = useRef<HTMLDivElement>(null);
  const [handle, setHandle] = useState<ReturnType<Harness["mount"]>>();
  const [error, setError] = useState<string>();
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!info) {
      return;
    }
    let cancelled = false;
    let mounted: ReturnType<Harness["mount"]> | undefined;
    setHandle(undefined);
    setError(undefined);
    void (async () => {
      try {
        if (info.cesium1x && !(await ensureCesium("repo"))) {
          // A released 1.x is loaded (the explorer's): a page holds one.
          location.reload();
          return;
        }
        const harness = await info.load();
        if (cancelled || !host.current) {
          return;
        }
        host.current.replaceChildren();
        mounted = harness.mount(
          host.current,
          new URLSearchParams(search as Record<string, string>),
        );
        setHandle(mounted);
      } catch (e) {
        if (!cancelled) {
          setError(loadError(e, !!info.cesium1x));
        }
      }
    })();
    return () => {
      cancelled = true;
      mounted?.dispose?.();
    };
    // The page's options apply when it mounts.
  }, [info]);

  if (!info) {
    return (
      <Page title="Lab page not found" back={backToLab}>
        <Empty
          title={`There is no Lab page called “${id}”`}
          action={
            <Button
              variant="outlined"
              render={<RouterLink to="/lab" />}
              nativeButton={false}
            >
              Show all Lab pages
            </Button>
          }
        >
          The link may be out of date; every page is listed in the Lab.
        </Empty>
      </Page>
    );
  }
  const run = async () => {
    if (!handle) {
      return;
    }
    setRunning(true);
    try {
      await handle.run();
      toast(`${info.title}: done`);
    } catch (e) {
      toast(
        `${info.title} failed: ${e instanceof Error ? e.message : String(e)}`,
        "bad",
      );
    } finally {
      setRunning(false);
    }
  };
  const query = new URLSearchParams(search as Record<string, string>);
  const loading = !handle && !error;
  return (
    <Page
      title={info.title}
      description={info.description}
      back={backToLab}
      actions={
        <>
          <Button
            variant="outlined"
            render={
              <a
                href={`${info.page}${query.size ? `?${query}` : ""}`}
                target="_blank"
                rel="noreferrer"
              />
            }
            nativeButton={false}
          >
            Open on its own
            <span aria-hidden="true">&nbsp;↗</span>
            <span className="visually-hidden"> (opens in a new tab)</span>
          </Button>
          <Button
            color="primary"
            onClick={() => void run()}
            disabled={!handle}
            loading={running}
            startIcon={<Icon href={svgPlay} />}
          >
            {running ? "Running" : "Run"}
          </Button>
        </>
      }
    >
      <div className="lab-runner">
        <Typography variant="body-sm" color="textSecondary">
          Measure it headless, from the repository root:
        </Typography>
        <Command text={runnerCommand(info.id)} />
      </div>
      {error && (
        <Alert severity="error" className="lab-error">
          <AlertTitle>Could not load this Lab page</AlertTitle>
          {error}
        </Alert>
      )}
      {loading && (
        <div className="lab-loading" role="status">
          <CircularProgress size={20} />
          <Typography variant="body-sm" color="textSecondary">
            {info.cesium1x
              ? "Loading the page and this repository's 1.x build…"
              : "Loading the page…"}
          </Typography>
        </div>
      )}
      <div ref={host} className="harness lab-host" />
    </Page>
  );
}
