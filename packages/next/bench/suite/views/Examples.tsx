import "./examples.css";
import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { Icon } from "@stratakit/mui";
import { getRouteApi, Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EXAMPLES } from "../../../examples/index.ts";
import { Engine } from "../../../src/index.ts";
import { Viewer } from "../../../widgets/index.ts";
import { ionToken } from "../ionToken.ts";
import { limitsTier } from "../limitsTier.ts";
import { Empty, Page, Section } from "./common.tsx";
import { ExampleSwitcher, ExampleThumbnail } from "./ExampleSwitcher.tsx";
import { captureThumbnail } from "./thumbnails.ts";

/**
 * Examples (plan §13.12): what 2.0 is for, one feature or use case each,
 * with its source. The example page keeps one engine while examples come
 * and go, each in a viewer of its own on it (examples/types.ts has the
 * contract).
 */

const exampleRoute = getRouteApi("/examples/$id");

/** Instance rows for each example's viewer: 100,000 tracks of a few parts. */
const MAX_INSTANCES = 1 << 20;

export function Examples() {
  return (
    <Page
      title="Examples"
      description="What 2.0 is for, one feature or use case each. Open one to run it and read its source; switch between them from its header."
    >
      <ul className="examples-gallery">
        {EXAMPLES.map((x) => (
          <li key={x.id}>
            <RouterLink
              to="/examples/$id"
              params={{ id: x.id }}
              className="examples-tile"
            >
              <span className="examples-tile-picture">
                <ExampleThumbnail
                  example={x}
                  className="examples-tile-thumb"
                  hint="Open it once for a preview"
                />
              </span>
              <span className="examples-tile-body">
                <Typography variant="subtitle-md" render={<h3 />}>
                  {x.title}
                </Typography>
                <Typography
                  variant="body-sm"
                  color="textSecondary"
                  render={<p />}
                >
                  {x.description}
                </Typography>
                <span className="examples-labels">
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
                </span>
              </span>
            </RouterLink>
          </li>
        ))}
      </ul>
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
  const [engine, setEngine] = useState<Engine>();
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

  // One engine while the page is open (the device, pipelines and
  // workers, the costly part); each example gets a viewer of its own on
  // it, destroyed when the example is left, so nothing one example changed
  // reaches the next (Sandcastle gets the same from a fresh iframe).
  useEffect(() => {
    if (!exists) {
      return;
    }
    let cancelled = false;
    let made: Engine | undefined;
    Engine.create({ limits: limitsTier() }).then(
      (e) => {
        if (cancelled) {
          e.destroy();
        } else {
          made = e;
          setEngine(e);
        }
      },
      (e) => !cancelled && setError(message(e)),
    );
    return () => {
      cancelled = true;
      made?.destroy();
      setEngine(undefined);
    };
  }, [exists]);

  // The example: a viewer of its own, run in it, and everything undone
  // when left (its undo, its scope, then the viewer with its world). A
  // layout effect, so the last example's canvas is gone before the browser
  // paints the new route; the new canvas shows once its first frame is
  // drawn (created with `suspendPresentation`).
  useLayoutEffect(() => {
    if (!engine || !info || !panel.current || !host.current) {
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const scope = new DisposableStack();
    let viewer: Viewer | undefined;
    let dispose: (() => void) | undefined;
    let thumbnail: ReturnType<typeof setTimeout> | undefined;
    setError(undefined);
    setRunning(true);
    const box = panel.current;
    const stage = host.current;
    const token = ionToken();
    void (async () => {
      try {
        const v = await Viewer.create(stage, {
          engine,
          suspendPresentation: true,
          globe: info.globe,
          maxInstances: MAX_INSTANCES,
          // Frame rate, timings, memory; top left (panels are top right).
          inspector: {
            storageKey: "dyno.examples.inspector",
            placement: "top-left",
          },
          ...(token ? { accessToken: token } : {}),
        });
        if (signal.aborted) {
          v.destroy();
          return;
        }
        viewer = v;
        // For the console, as the Viewer page's `dynoViewer`.
        Object.assign(globalThis, { dynoExamplesViewer: v });
        const module = await info.load();
        if (signal.aborted) {
          return;
        }
        const undo = await module.run({
          viewer: v,
          panel: box,
          accessToken: token,
          signal,
          scope,
        });
        if (signal.aborted) {
          undo();
        } else {
          dispose = undo;
          // The switcher's picture of it, once its scene has had a moment.
          thumbnail = setTimeout(() => {
            if (!signal.aborted) {
              captureThumbnail(info.id, v.canvas, () => engine.renderFrame());
            }
          }, 2500);
        }
      } catch (e) {
        if (!signal.aborted) {
          setError(message(e));
        }
      } finally {
        viewer?.resumePresentation();
        if (!signal.aborted) {
          setRunning(false);
        }
      }
    })();
    return () => {
      controller.abort();
      clearTimeout(thumbnail);
      dispose?.();
      scope.dispose();
      box.replaceChildren();
      viewer?.destroy();
    };
  }, [engine, info]);

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
      back={<ExampleSwitcher current={info} />}
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
