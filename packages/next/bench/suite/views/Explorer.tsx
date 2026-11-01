import "./explorer.css";
import {
  Button,
  Callout,
  Card,
  Checkbox,
  Code,
  Flex,
  IconButton,
  Popover,
  SegmentedControl,
  Slider,
  Table,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { ClipboardCopyIcon, PauseIcon, PlayIcon } from "@radix-ui/react-icons";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import publicCatalog from "../catalog/public.json";
import type {
  Dataset,
  EngineConfig,
  RenderSettings,
  Scenario,
  Scene,
} from "../schema.ts";
import { DEPTH_COLORS, type DrawnTile } from "../suite.ts";
import { Choice, Field, Toolbar, toast } from "./common.tsx";
import {
  ExplorerSession,
  PANE_COLORS,
  type Snapshot,
  type TileColors,
} from "./explorerSession.ts";

/**
 * Dyno's explorer (plan §16.9, Explore): a catalog scene live in one or
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
 * a report can link to a place on a scene's camera path.
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

/** The 1.x build in this page, if any (a global: one per page). */
let cesiumBuild: { build: string; loaded: Promise<void> } | undefined;

/** Loads a 1.x build once; false when another build is already loaded. */
async function ensureCesium(build: string): Promise<boolean> {
  if (!cesiumBuild) {
    const base =
      build === "repo"
        ? "/cesium1x/"
        : `/cesium-release/${build}/package/Build/Cesium/`;
    (globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = base;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${base}Widgets/widgets.css`;
    document.head.append(css);
    const loaded = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${base}Cesium.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`CesiumJS ${build}: not found`));
      document.head.append(script);
    });
    cesiumBuild = { build, loaded };
  }
  await cesiumBuild.loaded;
  return cesiumBuild.build === build;
}

const HINTS = {
  path: "Both cameras follow the scene's benchmark camera path. Switch to free flight to fly around and inspect.",
  free: "Drag to rotate the globe, wheel or right-drag to zoom, middle- or ctrl-drag to tilt, shift-drag to look around. The engine you touch leads when cameras are linked.",
};

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
          text: "Pick at most one 1.x build (a page loads one).",
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
      setStatus({ text: "loading…" });
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
          setStatus({ text: String(e), error: true });
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
  if (!scene) {
    return (
      <Callout.Root color="red">
        <Callout.Text>No scene “{sceneId}” in the catalog.</Callout.Text>
      </Callout.Root>
    );
  }
  return (
    <div className="explorer">
      <Toolbar>
        <Field label="Scene">
          <Choice
            value={sceneId}
            options={catalog.scenes.map(
              (s) => [s.id, `${s.group} · ${s.title}`] as const,
            )}
            onChange={(v) => setSearch({ scene: v, t: undefined })}
          />
        </Field>
        <Field label="Left">
          <Choice
            value={left}
            options={
              configOptions.includes(left)
                ? configOptions
                : [left, ...configOptions]
            }
            onChange={(v) => setSearch({ left: v })}
          />
        </Field>
        <Field label="Right">
          <Choice
            value={right}
            options={[
              ["", "none"],
              ...(configOptions.includes(right) || !right
                ? configOptions
                : [right, ...configOptions]
              ).map((c) => [c, c] as const),
            ]}
            onChange={(v) => setSearch({ right: v })}
          />
        </Field>
        {status && (
          <Text size="2" color={status.error ? "red" : "gray"} role="status">
            {status.text}
          </Text>
        )}
      </Toolbar>

      <Toolbar>
        <SegmentedControl.Root
          value={mode}
          onValueChange={(v) => chooseMode(v as "path" | "free")}
          aria-label="Camera"
        >
          <SegmentedControl.Item value="path">
            Camera path
          </SegmentedControl.Item>
          <SegmentedControl.Item value="free">
            Free flight
          </SegmentedControl.Item>
        </SegmentedControl.Root>
        {mode === "free" && configs.length > 1 && (
          <Text as="label" size="2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={link}
                onCheckedChange={(c) => setLink((session.link = c === true))}
              />
              Link cameras
            </Flex>
          </Text>
        )}
        {mode === "free" && (
          <Button variant="soft" onClick={() => chooseMode("path")}>
            Back to the path
          </Button>
        )}
        <Text as="label" size="2">
          <Flex gap="2" align="center">
            <Checkbox
              checked={paused}
              onCheckedChange={(c) => {
                session.setPaused(c === true);
                setPaused(c === true);
              }}
            />
            Pause streaming
          </Flex>
        </Text>
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="soft" color="gray">
              Measure this…
            </Button>
          </Popover.Trigger>
          <Popover.Content width="520px">
            <Text as="p" size="2" mb="2">
              Measure this scene properly: each engine alone, cold cache,
              repetitions, conditions recorded.
            </Text>
            <Code size="2" className="command">
              {command}
            </Code>
            <Flex justify="end" mt="2">
              <Button
                size="1"
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(command)
                    .then(() => toast("Command copied"))
                }
              >
                <ClipboardCopyIcon /> Copy
              </Button>
            </Flex>
          </Popover.Content>
        </Popover.Root>
        {snapshot?.camera && (
          <Text size="2" color="gray" className="readout">
            camera {snapshot.camera[0].toFixed(5)}°,{" "}
            {snapshot.camera[1].toFixed(5)}°, {snapshot.camera[2].toFixed(0)} m
          </Text>
        )}
      </Toolbar>

      <Toolbar>
        <Text size="2" color="gray">
          Tiles
        </Text>
        <SegmentedControl.Root
          size="1"
          value={colors}
          onValueChange={(v) => {
            session.setTileColors(v as TileColors);
            setColors(v as TileColors);
          }}
          aria-label="Tile colors"
        >
          <SegmentedControl.Item value="plain">Plain</SegmentedControl.Item>
          <SegmentedControl.Item value="depth">By depth</SegmentedControl.Item>
          {configs.length > 1 && (
            <SegmentedControl.Item value="difference">
              By engine
            </SegmentedControl.Item>
          )}
        </SegmentedControl.Root>
        {(["bounding", "content"] as const).map((kind) => (
          <Text as="label" size="2" key={kind}>
            <Flex gap="2" align="center">
              <Checkbox
                checked={volumes[kind]}
                onCheckedChange={(c) => {
                  const next = { ...volumes, [kind]: c === true };
                  session.setVolumes(next.bounding, next.content);
                  setVolumes(next);
                }}
              />
              {kind === "bounding" ? "Bounding volumes" : "Content volumes"}
            </Flex>
          </Text>
        ))}
      </Toolbar>

      {mode === "path" && (
        <Flex align="center" gap="3" mb="2" className="scrub">
          <Tooltip content={playing ? "Pause" : "Play the camera path"}>
            <IconButton
              variant="soft"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>
          <Slider
            value={[Math.round(progress * 1000)]}
            max={1000}
            aria-label="Camera path progress"
            onValueChange={([v]) => {
              session.playing = false;
              setPlaying(false);
              session.setProgress(v! / 1000);
              setProgress(v! / 1000);
            }}
            onValueCommit={([v]) => commitProgress(v! / 1000)}
          />
          <Text size="2" color="gray" className="percent">
            {(progress * 100).toFixed(1)}%
          </Text>
          <Field label="Speed">
            <Choice
              value={speed}
              options={[
                ["0.25", "¼×"],
                ["0.5", "½×"],
                ["1", "1×"],
                ["2", "2×"],
              ]}
              onChange={(v) => {
                session.speed = Number(v);
                setSpeed(v);
              }}
            />
          </Field>
        </Flex>
      )}

      <div className="panes">
        {configs.map((config, i) => (
          <div
            key={`${loadKey}#${i}`}
            className="pane"
            onPointerDownCapture={() => session.lead(i)}
            onWheelCapture={() => session.lead(i)}
          >
            <div
              className="view"
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
      <Text as="p" size="1" color="gray" mt="2">
        {HINTS[mode]}
      </Text>
      {(colors !== "plain" || volumes.bounding || volumes.content) && (
        <Legend colors={colors} volumes={volumes} configs={configs} />
      )}
      {snapshot && <Selection drawn={snapshot.drawn} configs={configs} />}
      <div id="credits" className="credits" />
    </div>
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
    <div className="hud" aria-live="off">
      <span className="key" style={{ background: color }} />
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
    <Flex align="center" gap="1" key={label}>
      <span
        className={outline ? "swatch outline" : "swatch"}
        style={outline ? { borderColor: color } : { background: color }}
      />
      <Text size="1">{label}</Text>
    </Flex>
  );
  return (
    <Flex gap="4" wrap="wrap" align="center" my="2" className="legend">
      {colors === "depth" && (
        <Flex gap="2" align="center" wrap="wrap">
          <Text size="1" color="gray">
            Depth
          </Text>
          {DEPTH_COLORS.map((c, i) => swatch(css(c), String(i)))}
          <Text size="1" color="gray">
            (then again from 8)
          </Text>
        </Flex>
      )}
      {colors === "difference" && (
        <Flex gap="2" align="center" wrap="wrap">
          {swatch("rgb(179 179 179)", "drawn by both")}
          {configs.map((c, i) => swatch(PANE_COLORS[i]!, `only ${c.id}`))}
          <Text size="1" color="gray">
            (1.x's globe takes no tint)
          </Text>
        </Flex>
      )}
      {volumes.bounding && (
        <Flex gap="2" align="center" wrap="wrap">
          <Text size="1" color="gray">
            Volumes
          </Text>
          {swatch("#ffffff", "final resolution", true)}
          {swatch("#ffff00", "refining (finer tiles loading)", true)}
          {swatch("#666666", "no content of its own", true)}
          <Text size="1" color="gray">
            (1.x draws none for its globe)
          </Text>
        </Flex>
      )}
      {volumes.content && swatch("#0000ff", "content volume", true)}
    </Flex>
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
    <Card mt="3" className="selection">
      <Flex justify="between" align="baseline" mb="2" wrap="wrap" gap="2">
        <Text weight="medium">Selection by depth</Text>
        <Text size="1" color="gray">
          Tiles drawn now per level of the tree;{" "}
          {configs.length > 1
            ? "“only” counts tiles the other engine doesn't draw. "
            : ""}
          Updates as the camera moves.
        </Text>
      </Flex>
      <Table.Root size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Depth</Table.ColumnHeaderCell>
            {configs.map((c, i) => (
              <Table.ColumnHeaderCell key={c.id} justify="end">
                <span className="key" style={{ background: PANE_COLORS[i] }} />
                {c.id} ({totals[i]})
              </Table.ColumnHeaderCell>
            ))}
            <Table.ColumnHeaderCell width="40%" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((r) => (
            <Table.Row key={`${r.kind}|${r.depth}`}>
              <Table.RowHeaderCell>
                {r.kind === "terrain" ? `terrain level ${r.depth}` : r.depth}
              </Table.RowHeaderCell>
              {r.counts.map((n, i) => (
                <Table.Cell key={i} justify="end" className="num">
                  {n}
                  {configs.length > 1 && r.only[i] ? (
                    <Text color="gray"> · {r.only[i]} only</Text>
                  ) : null}
                </Table.Cell>
              ))}
              <Table.Cell>
                <div className="bars">
                  {r.counts.map((n, i) => (
                    <div
                      key={i}
                      className="bar"
                      style={{
                        width: `${(n / max) * 100}%`,
                        background: PANE_COLORS[i],
                      }}
                    />
                  ))}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Card>
  );
}
