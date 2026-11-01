import "./workspace.css";
import {
  EnterFullScreenIcon,
  StarFilledIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Checkbox,
  Code,
  Dialog,
  Flex,
  IconButton,
  Text,
  TextField,
  VisuallyHidden,
} from "@radix-ui/themes";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import {
  memo,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { short, type Summary, when } from "../data.ts";
import {
  Chart,
  Choice,
  Empty,
  Field,
  toast,
  Toolbar,
  useRuns,
  useStored,
} from "./common.tsx";
import {
  configsOf,
  INFO,
  most,
  type PanelContext,
  panelChart,
  type PanelSpec,
  passes,
  type RunFilter,
  type SavedView,
  scenesOf,
  searchText,
  SECTIONS,
  verdictOf,
} from "./workspaceModel.ts";

/**
 * Dyno's workspace (plan §16.9), after W&B's: a runs sidebar (show or
 * hide each run, search, filter by hardware and validity, pin a run as
 * the reference) and collapsible sections of small panels. The headline
 * section shows the candidate over the baseline per metric with its
 * interval and a line at ×1; the other sections show one line per
 * configuration with its interval, a control band (mean ± 3σ of the
 * earlier runs) with run rules, annotations where a configuration, the
 * hardware or the render settings change, and the pinned run as a
 * reference. Any panel can split by scene or expand; clicking a point
 * opens that run. The view lives in the URL (shareable) and can be saved
 * by name; the run list's choices are the viewer's own (localStorage).
 */

const route = getRouteApi("/workspace");

/** The view's URL state, with defaults filled in. */
interface ViewState {
  scene: string;
  split: boolean;
  base: string;
  cand: string;
  pin: string;
}

export function Workspace() {
  const { summaries } = useRuns();
  if (!summaries.length) {
    return (
      <Empty title="No runs yet.">
        Run the suite to record one:{" "}
        <Code>
          node packages/next/bench/suite/cli.mjs run --note "what changed"
        </Code>
      </Empty>
    );
  }
  return <WorkspaceView summaries={summaries} />;
}

function WorkspaceView({ summaries }: { summaries: Summary[] }) {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/workspace" });

  const configs = useMemo(() => configsOf(summaries), [summaries]);
  const scenes = useMemo(() => scenesOf(summaries), [summaries]);
  const hardwares = useMemo(
    () => [...new Set(summaries.map((s) => s.hardware))],
    [summaries],
  );
  const defaultBase = useMemo(
    () => most(summaries, (s) => s.baseline, configs[0] ?? "1.x"),
    [summaries, configs],
  );
  const defaultCand = useMemo(
    () => most(summaries, (s) => s.candidate, "2.0"),
    [summaries],
  );
  const view: ViewState = {
    scene: search.scene && scenes.has(search.scene) ? search.scene : "*",
    split: search.split === true,
    base: search.base ?? defaultBase,
    cand: search.cand ?? defaultCand,
    pin: search.pin ?? "",
  };
  const { scene, split, base, cand, pin } = view;

  // Per viewer: which runs show, and the run list's filters.
  const [storedHardware, setHardware] = useStored("dyno.hardware", "*");
  const [hideInvalid, setHideInvalid] = useStored("dyno.hideInvalid", false);
  const [showSweeps, setShowSweeps] = useStored("dyno.showSweeps", false);
  const [hidden, setHidden] = useStored<string[]>("dyno.hidden", []);
  const [collapsed, setCollapsed] = useStored<string[]>("dyno.collapsed", []);
  const [views, setViews] = useStored<Record<string, SavedView>>(
    "dyno.views",
    {},
  );
  const hardware = hardwares.includes(storedHardware) ? storedHardware : "*";

  const filter = useMemo<RunFilter>(
    () => ({ hardware, hideInvalid, showSweeps }),
    [hardware, hideInvalid, showSweeps],
  );
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  /** The runs the sidebar lists, newest first. */
  const listed = useMemo(
    () => [...summaries].reverse().filter((s) => passes(s, filter)),
    [summaries, filter],
  );
  /** The runs the panels show, oldest first (x is the index here). */
  const visible = useMemo(
    () => summaries.filter((s) => !hiddenSet.has(s.name) && passes(s, filter)),
    [summaries, hiddenSet, filter],
  );

  const update = useCallback(
    (patch: Partial<ViewState>) => {
      const v = { scene, split, base, cand, pin, ...patch };
      return navigate({
        search: {
          scene: v.scene === "*" ? undefined : v.scene,
          split: v.split || undefined,
          base: v.base,
          cand: v.cand,
          pin: v.pin || undefined,
        },
        replace: true,
      });
    },
    [navigate, scene, split, base, cand, pin],
  );
  const togglePin = useCallback(
    (name: string) => void update({ pin: pin === name ? "" : name }),
    [update, pin],
  );
  const openRun = useCallback(
    (name: string) => void navigate({ to: "/report", search: { run: name } }),
    [navigate],
  );
  // Clicking a point opens that run.
  const pick = useCallback(
    (x: number) => {
      const run = visible[x];
      if (run) {
        openRun(run.name);
      }
    },
    [visible, openRun],
  );

  // ------------------------------------------------------------ panels
  const ctx = useMemo<PanelContext>(
    () => ({ runs: visible, configs, base, cand, pin }),
    [visible, configs, base, cand, pin],
  );
  const sceneKeys = useMemo(
    () => (split && scene === "*" ? [...scenes.keys()] : [scene]),
    [split, scene, scenes],
  );
  const sections = useMemo(
    () =>
      ctx.runs.length === 0
        ? []
        : SECTIONS.map(([id, title, keys]) => ({
            id,
            title,
            panels: keys
              .flatMap((key) =>
                sceneKeys.map((sceneKey) => {
                  const spec: PanelSpec = {
                    key,
                    scene: sceneKey,
                    headline: id === "headline",
                    title:
                      sceneKeys.length > 1
                        ? `${INFO.get(key)?.[1] ?? key}: ${scenes.get(sceneKey)}`
                        : undefined,
                  };
                  return { spec, html: panelChart(ctx, spec) };
                }),
              )
              .filter((p) => p.html),
          })),
    [ctx, sceneKeys, scenes],
  );

  const [expanded, setExpanded] = useState<PanelSpec | null>(null);
  const expandedHtml = useMemo(
    () =>
      expanded ? panelChart(ctx, expanded, { width: 1200, height: 420 }) : "",
    [ctx, expanded],
  );

  const toggleSection = useCallback(
    (id: string, open: boolean) => {
      // <details> also fires "toggle" when first shown open: only changes.
      if (open === !collapsed.includes(id)) {
        return;
      }
      setCollapsed(
        open ? collapsed.filter((c) => c !== id) : [...collapsed, id],
      );
    },
    [collapsed, setCollapsed],
  );

  // ------------------------------------------------------------ saved views
  const [current, setCurrent] = useState("");
  const [viewName, setViewName] = useState("");
  const applyView = (name: string) => {
    setCurrent(name);
    const v = views[name];
    if (!v) {
      return;
    }
    if (v.hardware !== undefined) {
      setHardware(v.hardware);
    }
    if (v.hideInvalid !== undefined) {
      setHideInvalid(v.hideInvalid);
    }
    if (v.showSweeps !== undefined) {
      setShowSweeps(v.showSweeps);
    }
    void update({
      scene: v.scene ?? "*",
      split: v.split ?? false,
      base: v.base ?? base,
      cand: v.cand ?? cand,
      pin: v.pin ?? "",
    });
  };
  const saveView = () => {
    const name = viewName.trim();
    if (!name) {
      return;
    }
    setViews({
      ...views,
      [name]: { ...view, hardware, hideInvalid, showSweeps },
    });
    setCurrent(name);
    toast(`View "${name}" saved`);
  };
  const copyLink = () => {
    // The link names the baseline and candidate, so it outlives new runs.
    void update({}).then(() =>
      navigator.clipboard?.writeText(location.href).then(
        () => toast("Link to this view copied"),
        () => toast("Couldn't copy the link", "bad"),
      ),
    );
  };

  return (
    <div className="workspace">
      <RunsSidebar
        listed={listed}
        hidden={hiddenSet}
        setHidden={setHidden}
        pin={pin}
        onPin={togglePin}
        hardwares={hardwares}
        hardware={hardware}
        setHardware={setHardware}
        hideInvalid={hideInvalid}
        setHideInvalid={setHideInvalid}
        showSweeps={showSweeps}
        setShowSweeps={setShowSweeps}
      />
      <section className="panels">
        <Toolbar>
          <Field label="Scene">
            <Choice
              value={scene}
              options={[
                ["*", "All scenes (geometric mean)"],
                ...scenes.entries(),
              ]}
              onChange={(v) => void update({ scene: v })}
            />
          </Field>
          <Check checked={split} onChange={(v) => void update({ split: v })}>
            Split by scene
          </Check>
          <Field label="Baseline">
            <Choice
              value={base}
              options={configs}
              onChange={(v) => void update({ base: v })}
            />
          </Field>
          <Field label="Candidate">
            <Choice
              value={cand}
              options={configs}
              onChange={(v) => void update({ cand: v })}
            />
          </Field>
          <Flex className="views" gap="2" align="center" wrap="wrap">
            <Choice
              label="Saved views"
              value={current}
              options={[["", "Saved views…"], ...Object.keys(views)]}
              onChange={applyView}
            />
            <TextField.Root
              placeholder="View name"
              aria-label="View name"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveView();
                }
              }}
            />
            <Button variant="soft" onClick={saveView}>
              Save view
            </Button>
            <Button variant="soft" color="gray" onClick={copyLink}>
              Copy link
            </Button>
          </Flex>
        </Toolbar>
        {visible.length === 0 ? (
          <Empty title="No runs shown.">Tick runs in the list.</Empty>
        ) : (
          sections.map(({ id, title, panels }) => (
            <details
              key={id}
              className="section"
              open={!collapsed.includes(id)}
              onToggle={(e) => toggleSection(id, e.currentTarget.open)}
            >
              <summary>{title}</summary>
              {id === "headline" ? (
                <p className="section-note">
                  {cand} over {base} per run (geometric mean across scenes) with
                  its interval; below ×1 is better. Red dotted lines are
                  budgets.
                </p>
              ) : id === "conditions" ? (
                <p className="section-note">
                  The machine's state during each configuration's runs: these
                  should match between engines.
                </p>
              ) : null}
              <div className="grid">
                {panels.length ? (
                  panels.map(({ spec, html }) => (
                    <div className="panel" key={`${spec.key} ${spec.scene}`}>
                      <Chart html={html} onPick={pick} />
                      <IconButton
                        className="panel-expand"
                        size="1"
                        variant="soft"
                        color="gray"
                        aria-label="Expand this panel"
                        title="Expand"
                        onClick={() => setExpanded(spec)}
                      >
                        <EnterFullScreenIcon />
                      </IconButton>
                    </div>
                  ))
                ) : (
                  <Text as="p" size="2" color="gray">
                    No data.
                  </Text>
                )}
              </div>
            </details>
          ))
        )}
      </section>
      <Dialog.Root
        open={expanded !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExpanded(null);
          }
        }}
      >
        <Dialog.Content
          className="workspace-expanded"
          width="94vw"
          maxWidth="1280px"
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <Dialog.Title>
              {expanded
                ? (expanded.title ?? INFO.get(expanded.key)?.[1] ?? "Panel")
                : "Panel"}
            </Dialog.Title>
          </VisuallyHidden>
          <Flex justify="end" mb="2">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Close
              </Button>
            </Dialog.Close>
          </Flex>
          <Chart html={expandedHtml} onPick={pick} />
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

/** A checkbox with its label. */
function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Text as="label" size="2">
      <Flex gap="2" align="center">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
        />
        {children}
      </Flex>
    </Text>
  );
}

/**
 * The runs sidebar. It owns the search text, so typing re-renders only
 * the list (the search is deferred, and unchanged rows are memoized).
 */
function RunsSidebar({
  listed,
  hidden,
  setHidden,
  pin,
  onPin,
  hardwares,
  hardware,
  setHardware,
  hideInvalid,
  setHideInvalid,
  showSweeps,
  setShowSweeps,
}: {
  listed: Summary[];
  hidden: Set<string>;
  setHidden: (names: string[]) => void;
  pin: string;
  onPin: (name: string) => void;
  hardwares: string[];
  hardware: string;
  setHardware: (value: string) => void;
  hideInvalid: boolean;
  setHideInvalid: (value: boolean) => void;
  showSweeps: boolean;
  setShowSweeps: (value: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const shown = useMemo(
    () =>
      deferred
        ? listed.filter((s) => searchText(s).includes(deferred))
        : listed,
    [listed, deferred],
  );
  const toggle = useCallback(
    (name: string, show: boolean) => {
      const next = new Set(hidden);
      if (show) {
        next.delete(name);
      } else {
        next.add(name);
      }
      setHidden([...next]);
    },
    [hidden, setHidden],
  );
  return (
    <aside className="runs">
      <TextField.Root
        type="search"
        placeholder="Search notes, tags, commits"
        aria-label="Search runs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Field label="Hardware">
        <Choice
          value={hardware}
          options={[["*", "All"], ...hardwares]}
          onChange={setHardware}
        />
      </Field>
      <Check checked={hideInvalid} onChange={setHideInvalid}>
        Hide runs with invalid results
      </Check>
      <Check checked={showSweeps} onChange={setShowSweeps}>
        Include sweep runs
      </Check>
      <div className="run-actions">
        <Button
          size="1"
          variant="soft"
          color="gray"
          onClick={() => setHidden([])}
        >
          Show all
        </Button>
        <Button
          size="1"
          variant="soft"
          color="gray"
          onClick={() =>
            setHidden([...new Set([...hidden, ...listed.map((s) => s.name)])])
          }
        >
          Hide all
        </Button>
      </div>
      <ol>
        {shown.map((s) => (
          <RunItem
            key={s.name}
            run={s}
            shown={!hidden.has(s.name)}
            pinned={pin === s.name}
            onToggle={toggle}
            onPin={onPin}
          />
        ))}
      </ol>
    </aside>
  );
}

const BADGES = {
  valid: ["✓", "green"],
  warning: ["!", "amber"],
  invalid: ["✕", "red"],
} as const;

/** One run in the sidebar: show it, open its report, pin it. */
const RunItem = memo(function RunItem({
  run: s,
  shown,
  pinned,
  onToggle,
  onPin,
}: {
  run: Summary;
  shown: boolean;
  pinned: boolean;
  onToggle: (name: string, show: boolean) => void;
  onPin: (name: string) => void;
}) {
  const verdict = verdictOf(s);
  return (
    <li className={shown ? undefined : "off"}>
      <Checkbox
        checked={shown}
        onCheckedChange={(v) => onToggle(s.name, v === true)}
        aria-label="Show this run"
      />
      <Link to="/report" search={{ run: s.name }} className="run-text">
        <div>
          <b>{when(s)}</b> <Code size="1">{short(s)}</Code>{" "}
          {verdict && s.validity ? (
            <Badge
              size="1"
              variant="outline"
              color={BADGES[verdict][1]}
              title={`${s.validity.valid} valid, ${s.validity.warning} with warnings, ${s.validity.invalid} invalid runs`}
            >
              {BADGES[verdict][0]}
            </Badge>
          ) : null}
        </div>
        <div className="muted">{s.note || s.subject || ""}</div>
        {s.tags.length ? (
          <div className="muted">{s.tags.join(", ")}</div>
        ) : null}
      </Link>
      <IconButton
        size="1"
        variant="ghost"
        color={pinned ? undefined : "gray"}
        aria-pressed={pinned}
        aria-label="Pin as the reference run"
        title="Pin as the reference run"
        onClick={() => onPin(s.name)}
      >
        {pinned ? <StarFilledIcon /> : <StarIcon />}
      </IconButton>
    </li>
  );
});
