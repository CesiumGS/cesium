import "./viewer.css";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Slider,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { svgMap } from "@stratakit/icons/map";
import { svgReCenter } from "@stratakit/icons/re-center";
import { svgFolderOpen } from "@stratakit/icons/folder-open";
import { svgGlobe } from "@stratakit/icons/globe";
import { svgPanelCollapseLeft } from "@stratakit/icons/panel-collapse-left";
import { svgPanelExpandLeft } from "@stratakit/icons/panel-expand-left";
import { svgRefresh } from "@stratakit/icons/refresh";
import { svgWindowSplitVertical } from "@stratakit/icons/window-split-vertical";
import { svgWindowCollapse } from "@stratakit/icons/window-collapse";
import { svgWindowExpand } from "@stratakit/icons/window-expand";
import { IconButton } from "@stratakit/bricks";
import { Icon } from "@stratakit/mui";
import { unstable_Toolbar as Toolbar } from "@stratakit/structures";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import publicCatalog from "../catalog/public.json";
import { ensureCesium } from "../cesium1x.ts";
import { compareEngines, engineLabel, isRelease } from "../engines.mjs";
import { AEROSOLS, ionDefaults, type AerosolType } from "../../../src/index.ts";
import { attachInspector } from "../../../widgets/index.ts";
import { Choice, Page, toast, useRuns, useStored } from "./common.tsx";
import {
  DEFAULT_ION_TOKEN,
  IMODELS,
  ION_ASSETS,
  LegacyViewerHost,
  MODELS,
  NextViewerHost,
  TILESETS,
  sampleLabel,
  sourceName,
  type Capability,
  type Lighting,
  type Source,
  type ViewSettings,
  type ViewerHost,
} from "./viewerHost.ts";

/**
 * Dyno's viewer (DESIGN.md: Viewer): one engine at a time, for debugging
 * content and trying settings. The viewport is the page: content opens
 * from a dialog (samples, Cesium ion, iTwin), frequent actions sit on the
 * viewport (frame, split view, overview inset, globe), and settings live in
 * a panel beside it that folds away. Switching engines loads the same
 * content in the other, one engine at a time (each has the whole machine).
 * 2.0 runs through `Viewer` (widgets/), 1.x through `Cesium.Viewer`.
 *
 * The engine and content live in the route's search, so a view can be
 * linked: ?engine=1.146.0&asset=96188&at=-75.16,39.95,1500.
 */

const catalog = publicCatalog as unknown as {
  engines: { default: string[]; baseline: string; candidate: string };
};

const route = getRouteApi("/viewer");

const VIEW_DEFAULTS: ViewSettings = {
  policy: "budgeted",
  sse: 16,
  terrain: false,
  globe: true,
  unlit: false,
  continuous: false,
  split: false,
  overview: false,
};

// Each engine's own terms: 1.x's unitless sun (2) and exposure (1); 2.0's
// physical ones, a high sun (100 klx) and a daylight camera (EV100 15).
const LIGHTING_DEFAULTS: Lighting = {
  sunFromTime: true,
  azimuth: 150,
  elevation: 40,
  intensity: 2,
  diffuseIbl: 1,
  specularIbl: 1,
  exposure: 1,
  sunFromAtmosphere: true,
  aerialPerspective: true,
  shadows: true,
  ambientOcclusion: true,
  visibility: 60,
  aerosol: "continental",
  sunIlluminance: 100_000,
  ev100: 15,
  autoExposure: false,
  encoding: "srgb",
  toneMapping: "pbrNeutral",
};

const TOKEN_KEY = "viewer.ionToken";

/** The pasted ion token (this session, or remembered on this device). */
function readToken(): string | undefined {
  try {
    return (
      sessionStorage.getItem(TOKEN_KEY) ??
      localStorage.getItem(TOKEN_KEY) ??
      undefined
    );
  } catch {
    return undefined;
  }
}

type Phase =
  | { phase: "starting" | "loading" | "ready" }
  | { phase: "failed"; error: string };

export function Viewer() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { index, summaries } = useRuns();
  const engine = search.engine ?? "2.0";
  const source: Source = search.model
    ? { kind: "model", path: search.model }
    : search.tileset
      ? { kind: "tileset", path: search.tileset }
      : search.asset
        ? { kind: "ion", asset: Number(search.asset) }
        : search.imodel
          ? { kind: "imodel", id: search.imodel }
          : search.scene === "city"
            ? { kind: "city" }
            : { kind: "model", path: MODELS[0]! };
  const sourceKey = JSON.stringify(source);
  const at = search.at?.split(",").map(Number);

  const [view, setView] = useStored<ViewSettings>(
    "dyno.viewer.view",
    VIEW_DEFAULTS,
  );
  const [storedLighting, setLighting] = useStored<Lighting>(
    "dyno.viewer.lighting",
    LIGHTING_DEFAULTS,
  );
  // Settings stored before a field existed get its default.
  const lighting = useMemo(
    () => ({ ...LIGHTING_DEFAULTS, ...storedLighting }),
    [storedLighting],
  );
  const [panelOpen, setPanelOpen] = useStored("dyno.viewer.panel", true);
  const [pastedToken, setPastedToken] = useState(readToken);
  const [host, setHost] = useState<ViewerHost>();
  const [state, setState] = useState<Phase>({ phase: "starting" });
  const [warnings, setWarnings] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  // Fullscreen: the canvas card with its tools, inspector and credits.
  const card = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === card.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  const viewRef = useRef(view);
  viewRef.current = view;
  const lightingRef = useRef(lighting);
  lightingRef.current = lighting;

  // ion token, first found: pasted here, VITE_ION_TOKEN, CesiumJS's
  // evaluation token (public assets only).
  const envToken = import.meta.env.VITE_ION_TOKEN as string | undefined;
  const token = pastedToken ?? envToken ?? DEFAULT_ION_TOKEN;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const tokenSource = pastedToken
    ? "pasted here"
    : envToken
      ? "VITE_ION_TOKEN from .env.local"
      : "CesiumJS's evaluation token";

  // The engine: one host at a time, rebuilt when the engine changes.
  useEffect(() => {
    let cancelled = false;
    let made: ViewerHost | undefined;
    setHost(undefined);
    setState({ phase: "starting" });
    void (async () => {
      try {
        if (engine === "2.0") {
          made = await NextViewerHost.create(stage.current!, viewRef.current);
        } else {
          if (!(await ensureCesium(engine))) {
            // Another 1.x build is loaded: a page holds one.
            location.reload();
            return;
          }
          // Before the viewer resolves its default imagery from ion.
          Cesium.Ion.defaultAccessToken = tokenRef.current;
          made = await LegacyViewerHost.create(stage.current!);
        }
        if (cancelled) {
          made.destroy();
          return;
        }
        // A handle for the browser console and scripts (bench/trace.mjs).
        if (import.meta.env.DEV) {
          Object.assign(globalThis, { dynoViewer: made });
        }
        setHost(made);
      } catch (error) {
        if (!cancelled) {
          setState({
            phase: "failed",
            error: `Couldn't start ${engineName(engine, index.branch)}: ${message(error)}`,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      setHost(undefined);
      made?.destroy();
    };
  }, [engine, index.branch]);

  // The ion token, for both engines.
  useEffect(() => {
    ionDefaults.accessToken = token;
    if (typeof Cesium !== "undefined" && token) {
      Cesium.Ion.defaultAccessToken = token;
    }
  }, [token, host]);

  // The content: loaded into the host, again when either changes.
  useEffect(() => {
    if (!host) {
      return;
    }
    let cancelled = false;
    setState({ phase: "loading" });
    host
      .load(source, viewRef.current)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (at) {
          host.frame(at);
        }
        host.setLighting(lightingRef.current);
        setWarnings(result.warnings.length);
        setState({ phase: "ready" });
      })
      .catch((error) => {
        if (!cancelled && message(error) !== "superseded") {
          setState({
            phase: "failed",
            error: `Couldn't load ${sourceName(source)}: ${message(error)}`,
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // `source` is keyed by its JSON; `at` only frames a new load.
  }, [host, sourceKey, pastedToken, attempt]);

  useEffect(() => host?.setView(view), [host, view]);
  useEffect(() => host?.setLighting(lighting), [host, lighting]);
  // The time controls' night action: open the camera up.
  useEffect(() => {
    if (host instanceof NextViewerHost) {
      host.onNight = () =>
        setLighting({ ...lightingRef.current, autoExposure: true });
    }
  }, [host, setLighting]);

  // The inspector over the viewport, and picking on a click (not a drag).
  useEffect(() => {
    if (!host) {
      return;
    }
    const element = stage.current!;
    const handle = attachInspector(
      element,
      host.inspectable(engineName(engine, index.branch)),
      // Top right: the canvas's tools are top left (StrataKit's layout).
      { storageKey: "dyno.viewer.inspector", placement: "top-right" },
    );
    let downAt: [number, number] | undefined;
    const down = (e: PointerEvent) => (downAt = [e.clientX, e.clientY]);
    const up = (e: PointerEvent) => {
      if (
        !downAt ||
        Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 3
      ) {
        return;
      }
      const rect = element.getBoundingClientRect();
      void host
        .pick(e.clientX - rect.left, e.clientY - rect.top)
        .then((pick) => handle.showPick(pick));
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      handle.dispose();
    };
  }, [host, engine, index.branch]);

  const open = (next: Source) => {
    setOpening(false);
    void navigate({
      search: (s) => ({
        engine: s.engine,
        ...(next.kind === "model" ? { model: next.path } : {}),
        ...(next.kind === "tileset" ? { tileset: next.path } : {}),
        ...(next.kind === "ion" ? { asset: String(next.asset) } : {}),
        ...(next.kind === "imodel" ? { imodel: next.id } : {}),
        ...(next.kind === "city" ? { scene: "city" } : {}),
      }),
    });
  };

  // Releases: the catalog's and any a run measured, newest first.
  const releases = [
    ...new Set([
      ...catalog.engines.default.filter(isRelease),
      ...summaries.flatMap((s) => s.configs.filter(isRelease)),
    ]),
  ].sort((a, b) => compareEngines(b, a));
  const engineOptions = [
    ["2.0", engineName("2.0", index.branch)] as const,
    ...releases.map((r) => [r, r] as const),
  ];
  const unsupported = (host?.unsupported ?? {}) as Partial<
    Record<Capability, string>
  >;
  const set = <K extends keyof ViewSettings>(key: K, v: ViewSettings[K]) =>
    setView({ ...view, [key]: v });
  const light = <K extends keyof Lighting>(key: K, v: Lighting[K]) =>
    setLighting({ ...lighting, [key]: v });

  const help = (
    <>
      <p>
        Open a sample, a Cesium ion asset or an iModel, and switch engines to
        see the same content in the other. One engine runs at a time, with the
        whole machine, so the inspector's timings are its own; they are still
        live readings, not measurements. For numbers you can compare, see the
        scenes' measured results.
      </p>
      <p>
        Drag to orbit, right- or Shift-drag to pan, wheel to zoom; click a
        feature to see its properties in the inspector. Split view adds a second
        camera on the right half; the overview inset follows the main camera.
      </p>
    </>
  );

  return (
    <Page
      className="viewer-page"
      title="Viewer"
      description="One engine at a time, to debug content and try settings."
      help={help}
    >
      {/* StrataKit's app layout: a docked panel, then the canvas. */}
      <div className={panelOpen ? "viewer-layout" : "viewer-layout closed"}>
        {panelOpen ? (
          <aside className="viewer-panel" aria-label="Content and settings">
            {/* What's loaded, as StrataKit's sandbox heads its panel with
                the model: here, with where to open other content. */}
            <div className="viewer-panel-header">
              <div className="viewer-panel-title">
                <Typography variant="subtitle-sm" render={<h2 />}>
                  {sourceName(source)}
                </Typography>
                <Typography variant="body-sm" color="textSecondary">
                  {sourceDetail(source)}
                </Typography>
              </div>
              <GhostButton
                label="Hide panel"
                icon={svgPanelCollapseLeft}
                onClick={() => setPanelOpen(false)}
              />
            </div>
            <div className="viewer-panel-content">
              <Button
                variant="outlined"
                startIcon={<Icon href={svgFolderOpen} />}
                onClick={() => setOpening(true)}
              >
                Open content
              </Button>
              <Choice
                label="Engine"
                value={engine}
                minWidth={0}
                options={engineOptions}
                onChange={(v) =>
                  void navigate({ search: (s) => ({ ...s, engine: v }) })
                }
              />
            </div>
            <div className="viewer-subheader">
              <Typography variant="body-sm" render={<h2 />}>
                Settings
              </Typography>
              <GhostButton
                label="Reset all settings to their defaults"
                icon={svgRefresh}
                onClick={() => {
                  setView(VIEW_DEFAULTS);
                  setLighting(LIGHTING_DEFAULTS);
                  toast("All settings reset");
                }}
              />
            </div>
            <Group title="Tile selection" defaultOpen>
              <Choice
                label="Policy"
                value={view.policy}
                minWidth={0}
                disabled={!!unsupported.policy}
                options={[
                  ["budgeted", "Budgeted (default)"],
                  ["stepwise", "Stepwise (as CesiumJS 1.x)"],
                ]}
                onChange={(v) => set("policy", v as ViewSettings["policy"])}
              />
              <Range
                label="Maximum screen-space error"
                value={Math.log2(view.sse)}
                min={0}
                max={7}
                step={0.25}
                text={`${view.sse} px`}
                onChange={(v) => set("sse", Math.round(2 ** v * 10) / 10)}
              />
              <NotHere reasons={[unsupported.policy]} />
            </Group>
            <Group title="Globe and rendering" defaultOpen>
              <Setting
                label="Cesium World Terrain"
                checked={view.terrain}
                onChange={(v) => set("terrain", v)}
              />
              <Setting
                label="Unlit"
                checked={view.unlit}
                onChange={(v) => set("unlit", v)}
              />
              <Setting
                label="Render continuously"
                checked={view.continuous}
                onChange={(v) => set("continuous", v)}
              />
              <Choice
                label="Output encoding"
                value={lighting.encoding}
                minWidth={0}
                disabled={!!unsupported.encoding}
                options={[
                  ["srgb", "sRGB (exact)"],
                  ["gamma2.2", "Gamma 2.2 (as 1.x)"],
                ]}
                onChange={(v) => light("encoding", v as Lighting["encoding"])}
              />
              <Choice
                label="Tone mapping"
                value={lighting.toneMapping}
                minWidth={0}
                options={[
                  ["pbrNeutral", "PBR Neutral"],
                  ["agx", "AgX"],
                  ["aces", "ACES (as 1.x)"],
                ]}
                onChange={(v) =>
                  light("toneMapping", v as Lighting["toneMapping"])
                }
              />
              <NotHere
                reasons={[
                  unsupported.encoding,
                  unsupported.split,
                  unsupported.overview,
                ]}
              />
            </Group>
            <Group title="Lighting">
              {engine === "2.0" && (
                <Setting
                  label="Sun from date and time"
                  checked={lighting.sunFromTime}
                  onChange={(v) => light("sunFromTime", v)}
                />
              )}
              {(engine !== "2.0" || !lighting.sunFromTime) && (
                <>
                  <Range
                    label="Sun azimuth"
                    value={lighting.azimuth}
                    min={0}
                    max={360}
                    text={`${lighting.azimuth}°`}
                    onChange={(v) => light("azimuth", v)}
                  />
                  <Range
                    label="Sun elevation"
                    value={lighting.elevation}
                    min={-10}
                    max={90}
                    text={`${lighting.elevation}°`}
                    onChange={(v) => light("elevation", v)}
                  />
                </>
              )}
              {engine === "2.0" ? (
                <>
                  <Setting
                    label="Sunlight from the atmosphere"
                    checked={lighting.sunFromAtmosphere}
                    onChange={(v) => light("sunFromAtmosphere", v)}
                  />
                  <Setting
                    label="Aerial perspective"
                    checked={lighting.aerialPerspective}
                    onChange={(v) => light("aerialPerspective", v)}
                  />
                  <Setting
                    label="Sun shadows"
                    checked={lighting.shadows}
                    onChange={(v) => light("shadows", v)}
                  />
                  <Setting
                    label="Ambient occlusion"
                    checked={lighting.ambientOcclusion}
                    onChange={(v) => light("ambientOcclusion", v)}
                  />
                  <Choice
                    label="Aerosols"
                    value={lighting.aerosol}
                    minWidth={0}
                    options={Object.entries(AEROSOLS).map(([key, a]) => [
                      key,
                      a.name,
                    ])}
                    onChange={(v) => light("aerosol", v as AerosolType)}
                  />
                  <Range
                    label="Visibility"
                    value={lighting.visibility}
                    min={5}
                    max={200}
                    step={5}
                    text={`${lighting.visibility} km`}
                    onChange={(v) => light("visibility", v)}
                  />
                  {!lighting.sunFromAtmosphere && (
                    <Range
                      label="Sun illuminance"
                      value={lighting.sunIlluminance}
                      min={0}
                      max={150_000}
                      step={1000}
                      text={`${Math.round(lighting.sunIlluminance / 1000)} klx`}
                      onChange={(v) => light("sunIlluminance", v)}
                    />
                  )}
                </>
              ) : (
                <Range
                  label="Sun intensity"
                  value={lighting.intensity}
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) => light("intensity", v)}
                />
              )}
              <Range
                label="Diffuse IBL"
                value={lighting.diffuseIbl}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => light("diffuseIbl", v)}
              />
              <Range
                label="Specular IBL"
                value={lighting.specularIbl}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => light("specularIbl", v)}
              />
              {engine === "2.0" ? (
                <>
                  <Setting
                    label="Automatic exposure"
                    checked={lighting.autoExposure}
                    onChange={(v) => light("autoExposure", v)}
                  />
                  {lighting.autoExposure ? (
                    <Typography variant="caption-md" color="textSecondary">
                      Exposure metered from the image.
                    </Typography>
                  ) : (
                    <Range
                      label="Exposure (EV100)"
                      value={lighting.ev100}
                      min={4}
                      max={18}
                      step={0.1}
                      text={lighting.ev100.toFixed(1)}
                      onChange={(v) => light("ev100", v)}
                    />
                  )}
                </>
              ) : (
                <Range
                  label="Exposure"
                  value={lighting.exposure}
                  min={0.1}
                  max={4}
                  step={0.05}
                  onChange={(v) => light("exposure", v)}
                />
              )}
            </Group>
          </aside>
        ) : (
          // Folded: a rail at the same edge brings it back.
          <div className="viewer-rail">
            <GhostButton
              label="Show panel"
              icon={svgPanelExpandLeft}
              onClick={() => setPanelOpen(true)}
            />
          </div>
        )}
        <div className="viewer-stage" ref={card}>
          {/* The engine's own DOM (canvas or 1.x widget), not React's. */}
          <div className="viewer-engine" key={engine} ref={stage} />
          {(state.phase === "starting" || state.phase === "loading") && (
            <LinearProgress
              className="viewer-progress"
              aria-label={
                state.phase === "starting"
                  ? `Starting ${engineName(engine, index.branch)}`
                  : `Loading ${sourceName(source)}`
              }
            />
          )}
          {state.phase === "failed" && (
            <Alert
              severity="error"
              className="viewer-alert"
              action={
                <Button size="small" onClick={() => setAttempt(attempt + 1)}>
                  Try again
                </Button>
              }
            >
              {state.error}
            </Alert>
          )}
          {state.phase === "ready" && warnings > 0 && (
            <Alert severity="warning" className="viewer-alert">
              Loaded with {warnings} {warnings === 1 ? "warning" : "warnings"}:
              see Problems in the inspector.
            </Alert>
          )}
          <Toolbar.Group
            variant="solid"
            className="viewer-tools"
            aria-label="View"
          >
            <Toolbar.Item
              render={
                <GhostButton
                  label="Frame content"
                  icon={svgReCenter}
                  onClick={() => host?.frame(at)}
                />
              }
            />
            <ViewToggle
              label="Split view"
              icon={svgWindowSplitVertical}
              active={view.split}
              reason={unsupported.split}
              onChange={(v) => set("split", v)}
            />
            <ViewToggle
              label="Overview inset"
              icon={svgMap}
              active={view.overview}
              reason={unsupported.overview}
              onChange={(v) => set("overview", v)}
            />
            <ViewToggle
              label="Globe"
              icon={svgGlobe}
              active={view.globe}
              onChange={(v) => set("globe", v)}
            />
          </Toolbar.Group>
          {/* Apart from the view tools, where maps and players put it. */}
          <Toolbar.Group
            variant="solid"
            className="viewer-screen"
            aria-label="Screen"
          >
            <Toolbar.Item
              render={
                <GhostButton
                  label={fullscreen ? "Exit full screen" : "Full screen"}
                  icon={fullscreen ? svgWindowCollapse : svgWindowExpand}
                  onClick={() =>
                    void (fullscreen
                      ? document.exitFullscreen()
                      : card.current?.requestFullscreen())
                  }
                />
              }
            />
          </Toolbar.Group>
        </div>
      </div>

      <OpenContent
        open={opening}
        source={source}
        tokenSource={tokenSource}
        pastedToken={pastedToken}
        unsupported={unsupported}
        onClose={() => setOpening(false)}
        onOpen={open}
        onToken={(t) => {
          setPastedToken(t);
          toast(t ? "Token in use for this session" : "Pasted token cleared");
        }}
      />
    </Page>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

function engineName(engine: string, branch: string | undefined): string {
  return engine === "2.0"
    ? branch
      ? `2.0 · ${branch}`
      : "2.0"
    : engineLabel(engine);
}

/** What kind of content, and where it comes from. */
function sourceDetail(source: Source): string {
  switch (source.kind) {
    case "model":
      return "glTF sample";
    case "tileset":
      return "3D Tiles sample";
    case "ion":
      return `Cesium ion asset ${source.asset}`;
    case "imodel":
      return "iModel mesh export";
    case "city":
      return "generated";
  }
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// ---------------------------------------------------------------- pieces

/** A ghost icon button with its name in a tooltip (StrataKit bricks). */
function GhostButton({
  label,
  icon,
  onClick,
  ...rest
}: {
  label: string;
  icon: string;
  onClick: () => void;
} & Record<string, unknown>) {
  return (
    <IconButton
      {...rest}
      label={label}
      icon={icon}
      variant="ghost"
      onClick={onClick}
    />
  );
}

/** A view toggle on the canvas; disabled, with why, where the engine can't. */
function ViewToggle({
  label,
  icon,
  active,
  reason,
  onChange,
}: {
  label: string;
  icon: string;
  active: boolean;
  reason?: string | undefined;
  onChange: (on: boolean) => void;
}) {
  return (
    <Toolbar.Item
      render={
        <IconButton
          label={reason ? `${label} (not in this engine: ${reason})` : label}
          icon={icon}
          variant="ghost"
          active={active && !reason}
          disabled={!!reason}
          onClick={() => onChange(!active)}
        />
      }
    />
  );
}

/** A settings group in the panel, open or folded (remembered). */
function Group({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useStored(`dyno.viewer.group.${title}`, defaultOpen);
  return (
    <Accordion
      expanded={open}
      onChange={(_, v) => setOpen(v)}
      slotProps={{ heading: { render: <h2 /> } }}
      disableGutters
    >
      <AccordionSummary>{title}</AccordionSummary>
      <AccordionDetails className="viewer-group">{children}</AccordionDetails>
    </Accordion>
  );
}

function Setting({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      }
      label={label}
    />
  );
}

/** What this engine can't do of a group's settings, said once. */
function NotHere({ reasons }: { reasons: Array<string | undefined> }) {
  const shown = [...new Set(reasons.filter((r): r is string => !!r))];
  return shown.length > 0 ? (
    <Typography variant="caption-md" color="textSecondary">
      Not in this engine: {shown.join("; ")}.
    </Typography>
  ) : null;
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  text = String(value),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  text?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="viewer-range">
      <div className="viewer-range-head">
        <Typography variant="body-sm">{label}</Typography>
        <Typography variant="body-sm" color="textSecondary">
          {text}
        </Typography>
      </div>
      <Slider
        size="small"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        aria-valuetext={text}
        onChange={(_, v) => onChange(v as number)}
      />
    </div>
  );
}

// ---------------------------------------------------------------- open

/** The content dialog: samples, Cesium ion assets (and the token), iModels. */
function OpenContent({
  open,
  source,
  tokenSource,
  pastedToken,
  unsupported,
  onClose,
  onOpen,
  onToken,
}: {
  open: boolean;
  source: Source;
  tokenSource: string;
  pastedToken: string | undefined;
  unsupported: Partial<Record<Capability, string>>;
  onClose: () => void;
  onOpen: (source: Source) => void;
  onToken: (token: string | undefined) => void;
}) {
  const kindTab =
    source.kind === "ion"
      ? "ion"
      : source.kind === "imodel"
        ? "itwin"
        : "samples";
  const [tab, setTab] = useState<"samples" | "ion" | "itwin">(kindTab);
  // Opens on the tab of what's shown.
  useEffect(() => {
    if (open) {
      setTab(kindTab);
    }
  }, [open, kindTab]);
  const [ionId, setIonId] = useState("");
  const [imodelId, setIModelId] = useState("");
  const asset = Number(ionId.trim());
  const validAsset = Number.isInteger(asset) && asset > 0;
  const shareKey = import.meta.env.VITE_ITWIN_SHARE_KEY as string | undefined;
  const current = (s: Source) => JSON.stringify(s) === JSON.stringify(source);
  const item = (
    s: Source,
    primary: string,
    secondary?: string,
    why?: string,
  ) => (
    <ListItemButton
      key={JSON.stringify(s)}
      selected={current(s)}
      disabled={!!why}
      onClick={() => onOpen(s)}
    >
      <ListItemText
        primary={primary}
        secondary={why ? `Not in this engine: ${why}` : secondary}
      />
    </ListItemButton>
  );
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Open content</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        className="viewer-tabs"
        aria-label="Content source"
      >
        <Tab value="samples" label="Samples" />
        <Tab value="ion" label="Cesium ion" />
        <Tab value="itwin" label="iTwin" />
      </Tabs>
      <DialogContent dividers className="viewer-open">
        {tab === "samples" && (
          <List dense>
            <ListSubheader>glTF models</ListSubheader>
            {MODELS.map((p) =>
              item({ kind: "model", path: p }, sampleLabel(p)),
            )}
            <ListSubheader>3D Tiles (streamed)</ListSubheader>
            {TILESETS.map((p) =>
              item({ kind: "tileset", path: p }, sampleLabel(p)),
            )}
            <ListSubheader>Generated</ListSubheader>
            {item(
              { kind: "city" },
              "Synthetic city",
              "144 buildings standing on the globe",
              unsupported.city,
            )}
          </List>
        )}
        {tab === "ion" && (
          <>
            <div className="viewer-open-row">
              <TextField
                size="small"
                label="Asset id"
                value={ionId}
                inputMode="numeric"
                onChange={(e) => setIonId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && validAsset) {
                    onOpen({ kind: "ion", asset });
                  }
                }}
              />
              <Button
                variant="outlined"
                disabled={!validAsset}
                onClick={() => onOpen({ kind: "ion", asset })}
              >
                Open asset
              </Button>
            </div>
            <List dense>
              <ListSubheader>Public assets (Sandcastle)</ListSubheader>
              {ION_ASSETS.map(([id, name]) =>
                item({ kind: "ion", asset: Number(id) }, name, `Asset ${id}`),
              )}
            </List>
            <TokenSettings
              source={tokenSource}
              pasted={pastedToken}
              onChange={onToken}
            />
          </>
        )}
        {tab === "itwin" &&
          (shareKey ? (
            <>
              <div className="viewer-open-row">
                <TextField
                  size="small"
                  label="iModel id"
                  value={imodelId}
                  onChange={(e) => setIModelId(e.target.value)}
                />
                <Button
                  variant="outlined"
                  disabled={!imodelId.trim()}
                  onClick={() =>
                    onOpen({ kind: "imodel", id: imodelId.trim() })
                  }
                >
                  Open iModel
                </Button>
              </div>
              <List dense>
                <ListSubheader>Demo iModels (mesh export)</ListSubheader>
                {IMODELS.map(([id, name]) =>
                  item({ kind: "imodel", id }, name),
                )}
              </List>
            </>
          ) : (
            <Alert severity="info">
              iModels load with an iTwin share key: set VITE_ITWIN_SHARE_KEY in
              packages/next/.env.local and restart the dev server.
            </Alert>
          ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function TokenSettings({
  source,
  pasted,
  onChange,
}: {
  source: string;
  pasted: string | undefined;
  onChange: (token: string | undefined) => void;
}) {
  const [remember, setRemember] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) !== null;
    } catch {
      return false;
    }
  });
  const save = (token: string | undefined, keep: boolean) => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      if (token) {
        (keep ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      }
    } catch {
      // Storage unavailable: the token lasts until reload.
    }
    onChange(token);
  };
  return (
    <div className="viewer-token">
      <Typography variant="subtitle-sm" render={<h3 />}>
        Access token
      </Typography>
      <Typography variant="body-sm" color="textSecondary">
        In use: {source}. A token pasted here comes first; with none, public
        assets load with CesiumJS's evaluation token.
      </Typography>
      <div className="viewer-open-row">
        <TextField
          size="small"
          type="password"
          label="Paste a token"
          autoComplete="off"
          defaultValue={pasted ?? ""}
          onBlur={(e) => save(e.target.value.trim() || undefined, remember)}
        />
        {pasted && (
          <Button variant="text" onClick={() => save(undefined, false)}>
            Clear
          </Button>
        )}
      </div>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={remember}
            onChange={(e) => {
              setRemember(e.target.checked);
              save(pasted, e.target.checked);
            }}
          />
        }
        label="Remember on this device"
      />
    </div>
  );
}
