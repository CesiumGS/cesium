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
  IconButton,
  Link,
  Typography,
} from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { Icon } from "@stratakit/mui";
import {
  getRouteApi,
  Link as RouterLink,
  useRouter,
} from "@tanstack/react-router";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { EXAMPLES, type ExampleInfo } from "../../../examples/index.ts";
import { Engine } from "../../../src/index.ts";
import { Viewer } from "../../../widgets/index.ts";
import { needsToken, tokenSource } from "../ionToken.ts";
import { TokenPrompt } from "../IonTokenSettings.tsx";
import { useIonToken } from "../useIonToken.ts";
import { limitsTier } from "../limitsTier.ts";
import { Empty, Page, Section } from "./common.tsx";
import { ExampleSwitcher, ExampleThumbnail } from "./ExampleSwitcher.tsx";
import {
  createParamsStore,
  exampleLink,
  normalizeRun,
  type Params,
  searchToParams,
  type Shared,
  share,
  undoAll,
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
  const [shared, setShared] = useState<Shared<Engine>>();
  const engine = shared?.value;
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  // The last example's undoing, when it threw: a notice of its own, kept
  // until dismissed or the next leave (the run error is this example's).
  const [leaveError, setLeaveError] = useState<string>();
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
  // reaches the next (Sandcastle gets the same from a fresh iframe). Shared:
  // on leaving, React runs this cleanup before the runner's (parent first),
  // so the engine goes when the example on it has been disposed, not before.
  useEffect(() => {
    if (!exists) {
      return;
    }
    let cancelled = false;
    let release: (() => void) | undefined;
    Engine.create({ limits: limitsTier() }).then(
      (e) => {
        if (cancelled) {
          e.destroy();
        } else {
          const made = share(e, (x) => x.destroy());
          release = made.release;
          setShared(made.shared);
        }
      },
      (e) => !cancelled && setError(message(e)),
    );
    return () => {
      cancelled = true;
      release?.();
      setShared(undefined);
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
      {leaveError && (
        <Alert
          severity="warning"
          className="examples-error"
          action={
            <IconButton
              label="Dismiss"
              onClick={() => setLeaveError(undefined)}
            >
              <Icon href={svgDismiss} />
            </IconButton>
          }
        >
          <AlertTitle>The last example didn't undo cleanly</AlertTitle>
          {leaveError}
        </Alert>
      )}
      {error && needsToken(error) && (
        <TokenPrompt className="examples-error">
          {tokenSource() === "pasted"
            ? `${info.title} can't load its Cesium ion content with the token pasted in Dyno.`
            : `${info.title} loads Cesium ion content that needs your own token.`}{" "}
          The example runs again with the new one. ({error})
        </TokenPrompt>
      )}
      {error && !needsToken(error) && (
        <Alert severity="error" className="examples-error">
          <AlertTitle>Could not run this example</AlertTitle>
          {error}
        </Alert>
      )}
      <div
        className={`examples-stage${info.layout === "side" ? " side" : ""}${info.layout === "side" && info.stackNarrow === true ? " stack-narrow" : ""}`}
      >
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
        {/* `.react`: the example's own StrataKit panel, which the plain
            element rules for DOM panels must not restyle (examples.css). */}
        <div className={`examples-panel${reactPanel ? " react" : ""}`}>
          <button
            type="button"
            className="examples-panel-header"
            aria-expanded={!collapsed}
            aria-controls="example-controls"
            onClick={toggleCollapsed}
          >
            {info.panelTitle ?? "Controls"}
            <span className="examples-panel-chevron" aria-hidden="true" />
          </button>
          <div
            ref={panel}
            id="example-controls"
            className="examples-panel-body"
            aria-label={info.panelTitle ?? "Controls"}
            hidden={collapsed}
          />
        </div>
      </div>
      {/* Order matters: React runs a removed subtree's cleanups, layout and
          passive, in tree order, and the runner disposes in a passive
          cleanup. So the panel (removed on leaving, and not rendered once
          the run changes) is gone, its own cleanups run, before `dispose`.
          Keep the panel before the runner. */}
      <ExamplePanel
        shown={reactPanel}
        info={info}
        engine={engine}
        box={panel}
      />
      <ExampleRunner
        info={info}
        shared={shared}
        host={host}
        box={panel}
        setError={setError}
        setLeaveError={setLeaveError}
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
  shared,
  host,
  box,
  setError,
  setLeaveError,
  setRunning,
  setReactPanel,
}: {
  info: ExampleInfo;
  shared: Shared<Engine> | undefined;
  host: RefObject<HTMLDivElement | null>;
  box: RefObject<HTMLDivElement | null>;
  setError: (error: string | undefined) => void;
  setLeaveError: (error: string | undefined) => void;
  setRunning: (running: boolean) => void;
  setReactPanel: (panel: RunPanel | undefined) => void;
}) {
  const navigate = exampleRoute.useNavigate();
  const router = useRouter();
  // Dyno's ion token: pasting or clearing one runs the example again.
  const { token } = useIonToken();
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
  // passive effect on purpose: React runs the passive cleanups of a removed
  // React panel (a `useEffect` unsubscribing from the viewer) in tree order
  // before this one, so they precede `dispose`; a layout cleanup here would
  // run before them. (`flushSync` can't unmount the panel from a cleanup:
  // React ignores it mid-commit.) The new canvas shows once its first frame
  // is drawn (created with `suspendPresentation`). The run holds the engine
  // until it's undone, and so does its start until it settles (one left
  // mid-start finishes, then disposes, after this cleanup); both holds are
  // taken once nothing before the cleanup's return can throw.
  useEffect(() => {
    if (!shared || !box.current || !host.current) {
      return;
    }
    const engine = shared.value;
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
    const releaseRun = shared.hold();
    const releaseStart = shared.hold();
    void (async () => {
      try {
        const v = await Viewer.create(stage, {
          engine,
          suspendPresentation: true,
          globe: info.globe,
          ...(info.noWarningNotice ? { warningNotice: false } : {}),
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
        // The globe's default imagery and terrain come from ion: a failure
        // (no token, or one ion turns away) is this run's error, shown
        // as such, not an unhandled rejection.
        v.ready.catch((e) => {
          if (!signal.aborted) {
            setError(message(e));
          }
        });
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
            link: (next) =>
              exampleLink(router, info.id, next, window.location.href),
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
        releaseStart();
      }
    })();
    return () => {
      // Every step, even after one throws; the engine's hold last.
      const errors = undoAll([
        () => controller.abort(),
        () => clearTimeout(thumbnail),
        () => params.close(),
        () => (paramsRef.current = undefined),
        () => setReactPanel(undefined),
        () => dispose?.(),
        () => scope.dispose(),
        () => boxElement.replaceChildren(),
        () => viewer?.destroy(),
        releaseRun,
      ]);
      // Each leave's own notice (or none), set here, in the cleanup: not
      // the run error, which the next run's start clears and its own
      // failure sets; never thrown into the router's boundary. Leaving the
      // page drops it with the page (the console still has it).
      for (const e of errors) {
        console.error(`Dyno: leaving the ${info.id} example`, e);
      }
      setLeaveError(
        errors.length > 0
          ? `Leaving ${info.title}: ${message(errors[0])}`
          : undefined,
      );
    };
  }, [
    shared,
    info,
    token,
    navigate,
    router,
    setError,
    setLeaveError,
    setRunning,
    setReactPanel,
  ]);

  return null;
}
