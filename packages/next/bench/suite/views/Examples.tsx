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
  CardMedia,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { Icon } from "@stratakit/mui";
import { getRouteApi, Link as RouterLink } from "@tanstack/react-router";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { EXAMPLES, type ExampleInfo } from "../../../examples/index.ts";
import { Engine } from "../../../src/index.ts";
import { Viewer } from "../../../widgets/index.ts";
import { ionToken } from "../ionToken.ts";
import { limitsTier } from "../limitsTier.ts";
import { Empty, Page, Section } from "./common.tsx";
import { ExampleSwitcher, ExampleThumbnail } from "./ExampleSwitcher.tsx";
import {
  createParamsStore,
  normalizeRun,
  type Params,
  searchToParams,
} from "./exampleRun.ts";
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
            {/* StrataKit's card, as the Lab's: the title is the link, and
                the whole card follows it (its own hover and focus). */}
            <Card className="examples-card">
              <CardMedia component="div" className="examples-card-media">
                <ExampleThumbnail
                  example={x}
                  className="examples-card-thumb"
                  hint="Open it once for a preview"
                />
              </CardMedia>
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
              </CardContent>
            </Card>
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
  const [reactPanel, setReactPanel] = useState<RunPanel>();
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
      {/* Order matters: on leaving, React tears siblings down in order, so
          the panel is removed before the runner's cleanup disposes the
          example (and, on switching, the panel is no longer rendered). */}
      <ExamplePanel
        shown={reactPanel}
        info={info}
        engine={engine}
        box={panel}
      />
      <ExampleRunner
        info={info}
        engine={engine}
        host={host}
        box={panel}
        setError={setError}
        setRunning={setRunning}
        setReactPanel={setReactPanel}
      />
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

/** The React panel an example returned, and the run it belongs to. */
interface RunPanel {
  info: ExampleInfo;
  engine: Engine;
  node: ReactNode;
}

/**
 * An example's React panel, rendered in the Controls body from this tree
 * (so under StrataKit's `Root`, with its theme, portals and focus), while
 * the run it came from is the current one.
 */
function ExamplePanel({
  shown,
  info,
  engine,
  box,
}: {
  shown: RunPanel | undefined;
  info: ExampleInfo;
  engine: Engine | undefined;
  box: RefObject<HTMLDivElement | null>;
}) {
  return shown && shown.info === info && shown.engine === engine && box.current
    ? createPortal(shown.node, box.current)
    : null;
}

/** Runs the current example in a viewer of its own; renders nothing. */
function ExampleRunner({
  info,
  engine,
  host,
  box,
  setError,
  setRunning,
  setReactPanel,
}: {
  info: ExampleInfo;
  engine: Engine | undefined;
  host: RefObject<HTMLDivElement | null>;
  box: RefObject<HTMLDivElement | null>;
  setError: (error: string | undefined) => void;
  setRunning: (running: boolean) => void;
  setReactPanel: (panel: RunPanel | undefined) => void;
}) {
  const navigate = exampleRoute.useNavigate();
  // The URL's params for the running example: they reach it through its
  // store (the first at start, later ones as back and forward).
  const search = searchToParams(exampleRoute.useSearch());
  const searchRef = useRef(search);
  searchRef.current = search;
  const paramsRef = useRef<ReturnType<typeof createParamsStore>>(undefined);
  const searchKey = JSON.stringify(search);
  useEffect(() => {
    paramsRef.current?.sync(JSON.parse(searchKey) as Params);
  }, [searchKey]);

  // The example: a viewer of its own, run in it, and everything undone
  // when left (its undo, its scope, then the viewer with its world). A
  // layout effect, so the last example's canvas is gone before the browser
  // paints the new route; the new canvas shows once its first frame is
  // drawn (created with `suspendPresentation`).
  useLayoutEffect(() => {
    if (!engine || !box.current || !host.current) {
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
    const boxElement = box.current;
    const stage = host.current;
    const params = createParamsStore(
      searchToParams(searchRef.current),
      (next) => void navigate({ search: next, replace: true }),
    );
    paramsRef.current = params;
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
        const run = normalizeRun(
          await module.run({
            viewer: v,
            panel: boxElement,
            accessToken: token,
            signal,
            scope,
            params: params.params,
            setParams: params.setParams,
            watchParams: params.watch,
          }),
        );
        if (signal.aborted) {
          run.dispose();
        } else {
          dispose = run.dispose;
          if (run.panel !== undefined) {
            setReactPanel({ info, engine, node: run.panel });
          }
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
      params.close();
      paramsRef.current = undefined;
      setReactPanel(undefined);
      dispose?.();
      scope.dispose();
      boxElement.replaceChildren();
      viewer?.destroy();
    };
  }, [engine, info, navigate, setError, setRunning, setReactPanel]);

  return null;
}
