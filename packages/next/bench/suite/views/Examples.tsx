import "./examples.css";
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
  Link,
  Typography,
} from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { Icon } from "@stratakit/mui";
import { getRouteApi, Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EXAMPLES } from "../../../examples/index.ts";
import { Viewer, type GlobeKind } from "../../../widgets/index.ts";
import { ionToken } from "../ionToken.ts";
import { limitsTier } from "../limitsTier.ts";
import { Empty, Page, Section } from "./common.tsx";

/**
 * Examples (plan §13.12): what 2.0 is for, one feature or use case each,
 * with its source. The example page keeps one viewer while examples come
 * and go in it (examples/types.ts has the contract).
 */

const exampleRoute = getRouteApi("/examples/$id");

/** Instance rows for the gallery's viewer: 100,000 tracks of a few parts. */
const MAX_INSTANCES = 1 << 20;

export function Examples() {
  return (
    <Page
      title="Examples"
      description="What 2.0 is for, one feature or use case each. Open one to run it and read its source."
    >
      <Section title="All examples">
        <ul className="examples-grid">
          {EXAMPLES.map((x) => (
            <li key={x.id}>
              <Card className="examples-card">
                <CardHeader
                  title={
                    <CardActionArea
                      render={
                        <RouterLink to="/examples/$id" params={{ id: x.id }} />
                      }
                      nativeButton={false}
                    >
                      {x.title}
                    </CardActionArea>
                  }
                  slotProps={{
                    title: { variant: "subtitle-sm", render: <h3 /> },
                  }}
                />
                <CardContent className="examples-card-content">
                  <Typography variant="body-sm" color="textSecondary">
                    {x.description}
                  </Typography>
                  <div className="examples-labels">
                    {x.labels.map((l) => (
                      <Badge
                        key={l}
                        variant="inline"
                        color="secondary"
                        type="outlined"
                        size="small"
                        badgeContent={l}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}

const backToExamples = (
  <Link render={<RouterLink to="/examples" />} className="examples-back">
    <Icon href={svgArrowLeft} />
    Examples
  </Link>
);

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

const PANEL_COLLAPSED = "dyno.examples.panel.collapsed";

export function ExamplePage() {
  const { id } = exampleRoute.useParams();
  const info = EXAMPLES.find((x) => x.id === id);
  const host = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeKind>(undefined as never);
  const [viewer, setViewer] = useState<Viewer>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [showSource, setShowSource] = useState(false);
  const [source, setSource] = useState<string>();
  // The controls panel collapses to its header, as the inspector does (kept
  // across examples and visits).
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(PANEL_COLLAPSED) === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((was) => {
      try {
        localStorage.setItem(PANEL_COLLAPSED, was ? "0" : "1");
      } catch {
        // Not kept (storage blocked): only this visit's.
      }
      return !was;
    });
  const exists = !!info;

  // One viewer while the page is open, on the first example's globe.
  useEffect(() => {
    if (!exists || !host.current) {
      return;
    }
    let cancelled = false;
    let made: Viewer | undefined;
    globe.current = info.globe;
    const token = ionToken();
    Viewer.create(host.current, {
      engine: { limits: limitsTier() },
      // Suspended until the first example has set its scene up: no frames
      // of the whole-Earth start (Viewer `suspendPresentation`).
      suspendPresentation: true,
      globe: info.globe,
      maxInstances: MAX_INSTANCES,
      // Frame rate, timings, memory; top left (examples' panels are top right).
      inspector: {
        storageKey: "dyno.examples.inspector",
        placement: "top-left",
      },
      ...(token ? { accessToken: token } : {}),
    }).then(
      (v) => {
        if (cancelled) {
          v.destroy();
        } else {
          made = v;
          setViewer(v);
          // For the console, as the Viewer page's `dynoViewer`.
          Object.assign(globalThis, { dynoExamplesViewer: v });
        }
      },
      (e) => !cancelled && setError(message(e)),
    );
    return () => {
      cancelled = true;
      made?.destroy();
      setViewer(undefined);
    };
    // The viewer outlives example switches.
  }, [exists]);

  // The example: run in the viewer, undone when left.
  useEffect(() => {
    if (!viewer || !info || !panel.current) {
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    let dispose: (() => void) | undefined;
    setError(undefined);
    setRunning(true);
    const box = panel.current;
    // Nothing new shows while the example sets its scene up (its globe,
    // content, framing): the last frame stays, the loading overlay over it.
    const resume = viewer.suspendPresentation();
    void (async () => {
      try {
        if (globe.current !== info.globe) {
          globe.current = info.globe;
          await viewer.setGlobe(info.globe);
        }
        const module = await info.load();
        if (signal.aborted) {
          return;
        }
        const undo = await module.run({
          viewer,
          panel: box,
          accessToken: ionToken(),
          signal,
        });
        if (signal.aborted) {
          undo();
        } else {
          dispose = undo;
        }
      } catch (e) {
        if (!signal.aborted) {
          setError(message(e));
        }
      } finally {
        resume();
        viewer.resumePresentation();
        if (!signal.aborted) {
          setRunning(false);
        }
      }
    })();
    return () => {
      controller.abort();
      resume();
      dispose?.();
      box.replaceChildren();
    };
  }, [viewer, info]);

  useEffect(() => {
    if (!showSource || !info) {
      return;
    }
    let cancelled = false;
    setSource(undefined);
    info.source().then(
      (text) => !cancelled && setSource(text),
      (e) =>
        !cancelled && setSource(`// Could not load the source: ${message(e)}`),
    );
    return () => {
      cancelled = true;
    };
  }, [showSource, info]);

  if (!info) {
    return (
      <Page title="Example not found" back={backToExamples}>
        <Empty
          title={`There is no example called “${id}”`}
          action={
            <Button
              variant="outlined"
              render={<RouterLink to="/examples" />}
              nativeButton={false}
            >
              Show all examples
            </Button>
          }
        >
          The link may be out of date; every example is listed in Examples.
        </Empty>
      </Page>
    );
  }
  return (
    <Page
      title={info.title}
      description={info.description}
      back={backToExamples}
      actions={
        <Button
          variant="outlined"
          onClick={() => setShowSource((v) => !v)}
          aria-expanded={showSource}
          aria-controls="example-source"
        >
          {showSource ? "Hide source" : "Show source"}
        </Button>
      }
    >
      {error && (
        <Alert severity="error" className="examples-error">
          <AlertTitle>Could not run this example</AlertTitle>
          {error}
        </Alert>
      )}
      <div className={`examples-stage${info.layout === "side" ? " side" : ""}`}>
        {/* The view and what goes over it: the loading overlay centers on
            the canvas, not the stage (which the side layout's panel shares). */}
        <div className="examples-view-area">
          <div ref={host} className="examples-view" />
          {running && !error && (
            <div className="examples-loading" role="status">
              <CircularProgress size={20} />
              <Typography variant="body-sm">Starting…</Typography>
            </div>
          )}
        </div>
        <div className="examples-panel">
          <button
            type="button"
            className="examples-panel-header"
            aria-expanded={!collapsed}
            aria-controls="example-controls"
            onClick={toggleCollapsed}
          >
            Controls
            <span className="examples-panel-chevron" aria-hidden="true" />
          </button>
          <div
            ref={panel}
            id="example-controls"
            className="examples-panel-body"
            aria-label="Controls"
            hidden={collapsed}
          />
        </div>
      </div>
      {showSource && (
        <Section title="Source" description={`examples/${info.id}/main.ts`}>
          <pre id="example-source" className="examples-source">
            <code>{source ?? "Loading…"}</code>
          </pre>
        </Section>
      )}
    </Page>
  );
}
