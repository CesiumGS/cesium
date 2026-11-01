import "./explorer.css";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgCopy } from "@stratakit/icons/copy";
import { svgPause } from "@stratakit/icons/pause";
import { svgPlay } from "@stratakit/icons/play";
import { svgStopwatch } from "@stratakit/icons/stopwatch";
import { Icon } from "@stratakit/mui";
import { getRouteApi } from "@tanstack/react-router";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import publicCatalog from "../catalog/public.json";
import type {
  Dataset,
  EngineConfig,
  RenderSettings,
  Scenario,
  Scene,
} from "../schema.ts";
import { ensureCesium } from "../cesium1x.ts";
import { DEPTH_COLORS, type DrawnTile } from "../suite.ts";
import { Choice, Empty, Page, Section, toast } from "./common.tsx";
import {
  ExplorerSession,
  PANE_COLORS,
  type Snapshot,
  type TileColors,
} from "./explorerSession.ts";

/**
 * Dyno's explorer (DESIGN.md: Explorer): a catalog scene live in one or
 * two engine configurations side by side, for looking, not measuring (the
 * engines share one GPU and main thread).
 *
 * - Camera path: both cameras on the scene's benchmark camera path; scrub
 *   it or play it. Free flight: fly either engine; linked cameras follow
 *   the one you touch.
 * - Inspect: pause streaming (1.x `debugFreezeFrame`, 2.0
 *   `Tileset3D.freezeSelection`); tint tiles by tree depth or by which
 *   engine draws them; bounding and content volumes (1.x
 *   `debugShowBoundingVolume`, 2.0 `Tileset3D.debugShowBoundingVolume`);
 *   the selection by depth in both engines.
 *
 * State lives in the route's search (scene, left, right, t, cesium), so
 * a report can link to a place on a scene's camera path. The engines live
 * in an `ExplorerSession` outside React, which survives StrictMode's
 * mount, unmount and mount.
 */

// CesiumJS 1.x, a page global, injected on demand.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

const catalog = publicCatalog as unknown as {
  datasets: Dataset[];
  scenes: Scene[];
  scenarios: Scenario[];
  configs: EngineConfig[];
  render?: RenderSettings;
};

const route = getRouteApi("/explorer");

/**
 * A configuration by id: the catalog's, or a released 1.x build named the
 * way runs name it ("1.x@1.146.0"), so reports can link here.
 */
function configById(id: string): EngineConfig | undefined {
  const found = catalog.configs.find((c) => c.id === id);
  const release = /^1\.x@(\d+\.\d+\.\d+)$/.exec(id);
  if (found || !release) {
    return found;
  }
  const config: EngineConfig = {
    ...catalog.configs.find((c) => c.engine === "1.x")!,
    id,
    cesium: release[1]!,
  };
  catalog.configs.push(config);
  return config;
}

/** The 1.x build a configuration needs: "repo" or an exact version. */
const buildOf = (config: EngineConfig | undefined) =>
  config?.engine === "1.x" ? (config.cesium ?? "repo") : undefined;

const SPEEDS = [
  ["0.25", "¼×"],
  ["0.5", "½×"],
  ["1", "1×"],
  ["2", "2×"],
] as const;

export function Explorer() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const sceneId = search.scene ?? catalog.scenes[0]!.id;
  const left =
    search.left ?? catalog.configs.find((c) => c.engine === "1.x")!.id;
  const right =
    search.right ?? catalog.configs.find((c) => c.engine === "2.0")!.id;
  const scene = catalog.scenes.find((s) => s.id === sceneId);
  const ids = [left, right].filter(Boolean);
  const configs = ids.map((id) => configById(id)).filter((c) => !!c);
  const loadKey = `${sceneId}|${ids.join("|")}`;

  const [session] = useState(() => new ExplorerSession());
  useEffect(() => {
    session.start();
    // A handle for the browser console while developing.
    if (import.meta.env.DEV) {
      Object.assign(globalThis, { dynoExplorer: session });
    }
    return () => session.destroy();
  }, [session]);
  const panes = useRef<HTMLDivElement[]>([]);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const [mode, setMode] = useState(session.mode);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [link, setLink] = useState(true);
  const [paused, setPaused] = useState(false);
  const [colors, setColors] = useState<TileColors>("plain");
  const [volumes, setVolumes] = useState({ bounding: false, content: false });
  const [progress, setProgress] = useState(search.t ?? 0);
  const [snapshot, setSnapshot] = useState<Snapshot>();

  useEffect(() => {
    session.onProgress = setProgress;
    session.onSnapshot = setSnapshot;
  }, [session]);

  // A different scene starts at the path's start.
  const loadedScene = useRef(search.scene);
  useEffect(() => {
    if (!scene) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const builds = new Set(configs.map(buildOf).filter(Boolean));
      if (builds.size > 1) {
        setStatus({
          text: "Pick at most one 1.x build: a page loads one. Change the left or right configuration.",
          error: true,
        });
        return;
      }
      const wanted = [...builds][0];
      const same = wanted ? await ensureCesium(wanted) : true;
      if (cancelled) {
        return;
      }
      if (!same) {
        // Another 1.x build: a page holds one, so load the page again.
        await navigate({ search: (s) => ({ ...s, cesium: wanted }) });
        location.reload();
        return;
      }
      if (loadedScene.current !== sceneId) {
        // A different scene starts at the path's start, or where a link
        // says.
        loadedScene.current = sceneId;
        session.setProgress(search.t ?? 0);
        setProgress(search.t ?? 0);
        setPlaying((session.playing = false));
      } else {
        session.setProgress(progress);
      }
      setSnapshot(undefined);
      setStatus({ text: "Loading the scene…" });
      const datasetIds = new Set([
        ...(typeof scene.globe === "object" ? [scene.globe.terrain] : []),
        ...(scene.imagery ? [scene.imagery] : []),
        ...scene.layers.map((l) => l.dataset),
      ]);
      const scenario = catalog.scenarios[0]!;
      try {
        const done = await session.load(
          {
            scene,
            datasets: catalog.datasets.filter((d) => datasetIds.has(d.id)),
            scenario,
            // The benchmark's render settings, so what you see is what runs.
            ...(catalog.render ? { render: catalog.render } : {}),
          },
          configs,
          panes.current,
          scenario.motionSeconds,
        );
        if (done && !cancelled) {
          setStatus(undefined);
          if (wanted && search.cesium !== wanted) {
            void navigate({
              search: (s) => ({ ...s, cesium: wanted }),
              replace: true,
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setStatus({
            text: `Could not load the scene: ${e instanceof Error ? e.message : String(e)}. Check the browser console, or try one engine at a time.`,
            error: true,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reload only when the scene or engines change.
  }, [session, loadKey]);

  const setSearch = (patch: Record<string, string | number | undefined>) =>
    void navigate({ search: (s) => ({ ...s, ...patch }), replace: true });
  const commitProgress = (t: number) => setSearch({ t: Number(t.toFixed(3)) });

  const chooseMode = (next: "path" | "free") => {
    session.setMode(next);
    setMode(next);
    if (next === "free") {
      setPlaying(false);
    }
  };
  const togglePlay = () => {
    session.playing = !playing;
    setPlaying(!playing);
    if (playing) {
      commitProgress(session.progress);
    }
  };

  const release = [left, right].find((id) => id.startsWith("1.x@"));
  const command = `node packages/next/bench/suite/cli.mjs run --scenes ${sceneId} --configs ${[
    ...new Set(
      ids.map((id) =>
        catalog.configs.some((c) => c.id === id && !/@/.test(id))
          ? id
          : id.startsWith("1.x@")
            ? "1.x-release"
            : id,
      ),
    ),
  ].join(
    ",",
  )}${release ? ` --cesium ${release.slice(4)}` : ""} --reps 3 --note "explorer: ${sceneId}"`;

  const configOptions = catalog.configs.map((c) => c.id);
  const help = (
    <>
      <p>
        Both engines draw the same scene with the benchmark's render settings.
        They share one GPU and main thread, so the numbers here are for looking;
        use <b>Measure this</b> for numbers you can compare.
      </p>
      <p>
        <b>Camera path</b>: both cameras follow the scene's benchmark camera
        path; play it or drag the slider. <b>Free flight</b>: drag to rotate the
        globe, wheel or right-drag to zoom, middle- or Ctrl-drag to tilt,
        Shift-drag to look around. With linked cameras, the engine you touch
        leads.
      </p>
      <p>
        <b>Inspect</b>: pause streaming freezes each engine's tile selection;
        tint tiles by tree depth or by which engine draws them; show bounding
        volumes and content volumes. The selection by depth below the viewports
        counts the tiles each engine draws per level.
      </p>
    </>
  );

  if (!scene) {
    return (
      <Page title="Explorer" help={help}>
        <Empty title={`No scene “${sceneId}” in the catalog.`}>
          Pick a scene:{" "}
          <Choice
            label="Scene"
            value={undefined}
            minWidth={280}
            options={catalog.scenes.map((s) => [s.id, s.title] as const)}
            onChange={(v) => setSearch({ scene: v, t: undefined })}
          />
        </Empty>
      </Page>
    );
  }
  return (
    <Page
      className="explorer-page"
      title="Explorer"
      description="A scene live in two engines side by side, to look at what each one draws."
      help={help}
      actions={<MeasureThis command={command} />}
      toolbar={
        <>
          <div className="explorer-group">
            <Choice
              label="Scene"
              value={sceneId}
              minWidth={300}
              options={catalog.scenes.map(
                (s) => [s.id, `${s.title} (${s.group})`] as const,
              )}
              onChange={(v) => setSearch({ scene: v, t: undefined })}
            />
            <Choice
              label="Left"
              value={left}
              options={
                configOptions.includes(left)
                  ? configOptions
                  : [left, ...configOptions]
              }
              onChange={(v) => setSearch({ left: v })}
            />
            <Choice
              label="Right"
              value={right}
              options={[
                ["", "None"],
                ...(configOptions.includes(right) || !right
                  ? configOptions
                  : [right, ...configOptions]
                ).map((c) => [c, c] as const),
              ]}
              onChange={(v) => setSearch({ right: v })}
            />
          </div>
          <Divider
            orientation="vertical"
            flexItem
            className="explorer-divider"
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, next: "path" | "free" | null) => {
              if (next) {
                chooseMode(next);
              }
            }}
            aria-label="Camera"
          >
            <ToggleButton
              value="path"
              render={<Button variant="outlined" size="small" />}
            >
              Camera path
            </ToggleButton>
            <ToggleButton
              value="free"
              render={<Button variant="outlined" size="small" />}
            >
              Free flight
            </ToggleButton>
          </ToggleButtonGroup>
          <Divider
            orientation="vertical"
            flexItem
            className="explorer-divider"
          />
          <Group label="Inspect">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={
                colors === "difference" && configs.length < 2 ? "plain" : colors
              }
              onChange={(_, next: TileColors | null) => {
                if (next) {
                  session.setTileColors(next);
                  setColors(next);
                }
              }}
              aria-label="Tile tint"
            >
              <ToggleButton
                value="plain"
                render={<Button variant="outlined" size="small" />}
              >
                Plain
              </ToggleButton>
              <ToggleButton
                value="depth"
                render={<Button variant="outlined" size="small" />}
              >
                By depth
              </ToggleButton>
              {configs.length > 1 && (
                <ToggleButton
                  value="difference"
                  render={<Button variant="outlined" size="small" />}
                >
                  By engine
                </ToggleButton>
              )}
            </ToggleButtonGroup>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={paused}
                  onChange={(_, on) => {
                    session.setPaused(on);
                    setPaused(on);
                  }}
                />
              }
              label="Pause streaming"
            />
            {(["bounding", "content"] as const).map((kind) => (
              <FormControlLabel
                key={kind}
                control={
                  <Switch
                    size="small"
                    checked={volumes[kind]}
                    onChange={(_, on) => {
                      const next = { ...volumes, [kind]: on };
                      session.setVolumes(next.bounding, next.content);
                      setVolumes(next);
                    }}
                  />
                }
                label={
                  kind === "bounding" ? "Bounding volumes" : "Content volumes"
                }
              />
            ))}
          </Group>
        </>
      }
    >
      {status?.error && (
        <Alert severity="error" className="explorer-alert">
          {status.text}
        </Alert>
      )}

      <div className="explorer-stage">
        <div className="explorer-transport">
          {mode === "path" ? (
            <>
              <IconButton
                label={
                  playing ? "Pause the camera path" : "Play the camera path"
                }
                variant="outlined"
                onClick={togglePlay}
              >
                <Icon href={playing ? svgPause : svgPlay} />
              </IconButton>
              <Slider
                size="small"
                className="explorer-scrubber"
                value={Math.round(progress * 1000)}
                max={1000}
                aria-label="Place on the camera path"
                getAriaValueText={(v) => `${(v / 10).toFixed(1)}%`}
                onChange={(_, v) => {
                  const t = (v as number) / 1000;
                  session.playing = false;
                  setPlaying(false);
                  session.setProgress(t);
                  setProgress(t);
                }}
                onChangeCommitted={(_, v) =>
                  commitProgress((v as number) / 1000)
                }
              />
              <Typography
                variant="body-sm"
                color="textSecondary"
                className="explorer-percent"
                aria-hidden="true"
              >
                {(progress * 100).toFixed(1)}%
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={speed}
                onChange={(_, v: string | null) => {
                  if (v) {
                    session.speed = Number(v);
                    setSpeed(v);
                  }
                }}
                aria-label="Playback speed"
              >
                {SPEEDS.map(([v, text]) => (
                  <ToggleButton
                    key={v}
                    value={v}
                    render={<Button variant="outlined" size="small" />}
                  >
                    {text}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </>
          ) : (
            <>
              {configs.length > 1 && (
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={link}
                      onChange={(_, on) => setLink((session.link = on))}
                    />
                  }
                  label="Link cameras"
                />
              )}
              <Typography variant="body-sm" color="textSecondary">
                Drag to rotate, wheel to zoom, Ctrl-drag to tilt.
              </Typography>
            </>
          )}
          {status && !status.error && (
            <div className="explorer-status" role="status">
              <CircularProgress size={14} />
              <Typography variant="body-sm" color="textSecondary">
                {status.text}
              </Typography>
            </div>
          )}
        </div>

        <div className="explorer-panes" data-count={configs.length}>
          {configs.map((config, i) => (
            <div
              key={`${loadKey}#${i}`}
              className="explorer-pane"
              onPointerDownCapture={() => session.lead(i)}
              onWheelCapture={() => session.lead(i)}
            >
              <div
                className="explorer-view"
                ref={(el) => {
                  if (el) {
                    panes.current[i] = el;
                  }
                }}
              />
              <Hud
                config={config}
                color={PANE_COLORS[i]!}
                stats={snapshot?.panes[i]}
                interval={snapshot?.interval}
                paused={paused}
              />
            </div>
          ))}
        </div>

        <div className="explorer-below">
          {(colors !== "plain" || volumes.bounding || volumes.content) && (
            <Legend colors={colors} volumes={volumes} configs={configs} />
          )}
          {snapshot?.camera && (
            <Typography
              variant="body-sm"
              color="textSecondary"
              className="explorer-readout"
            >
              Camera {snapshot.camera[0].toFixed(5)}°,{" "}
              {snapshot.camera[1].toFixed(5)}°,{" "}
              {Math.round(snapshot.camera[2]).toLocaleString()} m
            </Typography>
          )}
        </div>
        <div id="credits" className="explorer-credits" />
      </div>

      {snapshot && <Selection drawn={snapshot.drawn} configs={configs} />}
    </Page>
  );
}

/** A labeled group of controls in the toolbar. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="explorer-group" role="group" aria-labelledby={id}>
      <Typography variant="caption-lg" color="textSecondary" id={id}>
        {label}
      </Typography>
      {children}
    </div>
  );
}

/** "Measure this": the CLI command that measures this view properly. */
function MeasureThis({ command }: { command: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const titleId = useId();
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Icon href={svgStopwatch} />}
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Measure this
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { "aria-labelledby": titleId } }}
      >
        <div className="explorer-measure">
          <Typography variant="subtitle-sm" render={<h2 />} id={titleId}>
            Measure this scene
          </Typography>
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            Each engine runs alone, with a cold cache and repetitions, and the
            conditions are recorded. Run this from the repository root:
          </Typography>
          <pre className="explorer-command">
            <code>{command}</code>
          </pre>
          <div className="explorer-measure-actions">
            <Button
              startIcon={<Icon href={svgCopy} />}
              onClick={() => {
                if (!navigator.clipboard) {
                  toast(
                    "Could not copy: select the command and copy it.",
                    "bad",
                  );
                  return;
                }
                void navigator.clipboard.writeText(command).then(
                  () => toast("Command copied"),
                  () =>
                    toast(
                      "Could not copy: select the command and copy it.",
                      "bad",
                    ),
                );
              }}
            >
              Copy command
            </Button>
          </div>
        </div>
      </Popover>
    </>
  );
}

function Hud({
  config,
  color,
  stats,
  interval,
  paused,
}: {
  config: EngineConfig;
  color: string;
  stats: Snapshot["panes"][number] | undefined;
  interval: number | undefined;
  paused: boolean;
}) {
  const version =
    config.engine === "1.x" && typeof Cesium !== "undefined"
      ? ` · CesiumJS ${Cesium.VERSION}`
      : "";
  return (
    <div className="explorer-hud" aria-live="off">
      <span className="explorer-key" style={{ background: color }} />
      <b>
        {config.id}
        {version}
      </b>
      {stats
        ? `\nCPU / frame  ${stats.cpu.toFixed(2)} ms` +
          `\nGPU / frame  ${stats.gpu === undefined ? "not exposed" : `${stats.gpu.toFixed(2)} ms`}` +
          `\nframe        ${interval!.toFixed(1)} ms (shared)` +
          `\ntiles        ${stats.selected} drawn · ${stats.loading} loading` +
          `\n             ${stats.note}` +
          `\n${paused ? "streaming paused" : stats.settled ? "settled" : "loading…"}`
        : "\nloading…"}
    </div>
  );
}

const css = (c: readonly number[]) =>
  `rgb(${c.map((v) => Math.round(v ** (1 / 2.2) * 255)).join(" ")})`;

/** What the tints and wireframes mean, in both engines' terms. */
function Legend({
  colors,
  volumes,
  configs,
}: {
  colors: TileColors;
  volumes: { bounding: boolean; content: boolean };
  configs: EngineConfig[];
}) {
  const swatch = (color: string, label: string, outline = false) => (
    <span className="explorer-legend-item" key={label}>
      <span
        className={outline ? "explorer-swatch outline" : "explorer-swatch"}
        style={outline ? { borderColor: color } : { background: color }}
      />
      {label}
    </span>
  );
  return (
    <div className="explorer-legend">
      {colors === "depth" && (
        <div className="explorer-legend-group">
          <span className="explorer-legend-title">Depth</span>
          {DEPTH_COLORS.map((c, i) => swatch(css(c), String(i)))}
          <span className="explorer-legend-note">then again from 8</span>
        </div>
      )}
      {colors === "difference" && configs.length > 1 && (
        <div className="explorer-legend-group">
          <span className="explorer-legend-title">Drawn by</span>
          {swatch("rgb(179 179 179)", "both")}
          {configs.map((c, i) => swatch(PANE_COLORS[i]!, `only ${c.id}`))}
          <span className="explorer-legend-note">
            1.x's globe takes no tint
          </span>
        </div>
      )}
      {volumes.bounding && (
        <div className="explorer-legend-group">
          <span className="explorer-legend-title">Bounding volumes</span>
          {swatch("#ffffff", "final resolution", true)}
          {swatch("#ffff00", "refining (finer tiles loading)", true)}
          {swatch("#666666", "no content of its own", true)}
          <span className="explorer-legend-note">
            1.x's globe tiles in white
          </span>
        </div>
      )}
      {volumes.content && (
        <div className="explorer-legend-group">
          {swatch("#0000ff", "content volume", true)}
        </div>
      )}
    </div>
  );
}

interface DepthRow {
  kind: DrawnTile["kind"];
  depth: number;
  counts: number[];
  /** Tiles at this depth only this pane draws. */
  only: number[];
}

/**
 * The selection by depth in each engine: how many tiles each draws per
 * level of the tree, and how many only one draws (the same tile header,
 * or terrain address, in both counts as shared).
 */
function Selection({
  drawn,
  configs,
}: {
  drawn: DrawnTile[][];
  configs: EngineConfig[];
}) {
  const rows = useMemo(() => {
    const keys = drawn.map((list) => new Set(list.map((t) => t.key)));
    const byDepth = new Map<string, DepthRow>();
    drawn.forEach((list, pane) => {
      for (const t of list) {
        const id = `${t.kind}|${t.depth}`;
        const row = byDepth.get(id) ?? {
          kind: t.kind,
          depth: t.depth,
          counts: drawn.map(() => 0),
          only: drawn.map(() => 0),
        };
        row.counts[pane]!++;
        if (keys.some((k, i) => i !== pane && !k.has(t.key))) {
          row.only[pane]!++;
        }
        byDepth.set(id, row);
      }
    });
    return [...byDepth.values()].sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.depth - b.depth,
    );
  }, [drawn]);
  if (!rows.length) {
    return null;
  }
  const max = Math.max(...rows.flatMap((r) => r.counts));
  const totals = drawn.map((list) => list.length);
  return (
    <Section
      title="Selection by depth"
      description={`Tiles each engine draws now, per level of the tree${
        configs.length > 1
          ? "; “only” counts tiles the other engine doesn't draw"
          : ""
      }. Updates as the camera moves.`}
    >
      <Table size="small" className="explorer-selection">
        <TableHead>
          <TableRow>
            <TableCell>Depth</TableCell>
            {configs.map((c, i) => (
              <TableCell key={c.id} align="right">
                <span
                  className="explorer-key"
                  style={{ background: PANE_COLORS[i] }}
                />
                {c.id} ({totals[i]})
              </TableCell>
            ))}
            <TableCell className="explorer-bars-cell">
              <span className="visually-hidden">Tiles drawn</span>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`${r.kind}|${r.depth}`}>
              <TableCell render={<th scope="row" />}>
                {r.kind === "terrain" ? `Terrain level ${r.depth}` : r.depth}
              </TableCell>
              {r.counts.map((n, i) => (
                <TableCell key={i} align="right" className="num">
                  {n}
                  {configs.length > 1 && r.only[i] ? (
                    <span className="explorer-only"> · {r.only[i]} only</span>
                  ) : null}
                </TableCell>
              ))}
              <TableCell className="explorer-bars-cell">
                <div className="explorer-bars" aria-hidden="true">
                  {r.counts.map((n, i) => (
                    <div
                      key={i}
                      className="explorer-bar"
                      style={{
                        width: `${(n / max) * 100}%`,
                        background: PANE_COLORS[i],
                      }}
                    />
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}
