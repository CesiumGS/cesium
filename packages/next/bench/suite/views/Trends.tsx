import "./trends.css";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Popover,
  Switch,
  TextField,
  ToggleButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgFilter, svgFilterFilled } from "@stratakit/icons/filter";
import { svgLink } from "@stratakit/icons/link";
import { svgPanelCollapseLeft } from "@stratakit/icons/panel-collapse-left";
import { svgPanelExpandLeft } from "@stratakit/icons/panel-expand-left";
import { svgPin } from "@stratakit/icons/pin";
import { svgSwap } from "@stratakit/icons/swap";
import { svgWarning } from "@stratakit/icons/warning";
import { svgWindowMaximize } from "@stratakit/icons/window-maximize";
import { Icon } from "@stratakit/mui";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import {
  memo,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { short, type Summary, when } from "../data.ts";
import { engineLabel, engineOf, isRelease } from "../engines.mjs";
import {
  Chart,
  Choice,
  Empty,
  formatChange,
  Help,
  Page,
  toast,
  useDark,
  useRuns,
  useStored,
} from "./common.tsx";
import {
  configsOf,
  most,
  nounOf,
  type Panel,
  type PanelContext,
  panelOf,
  type PanelSpec,
  passes,
  type RunFilter,
  type SavedView,
  scenesOf,
  searchText,
  SECTIONS,
  verdictOf,
} from "./trendsModel.ts";

/**
 * Trends (plan §16.9, after W&B's workspace): every metric run to run.
 * A toolbar picks the scene, baseline and candidate; a run list beside
 * the charts shows or hides each run, searches and filters them, and pins
 * one as the reference; collapsible sections hold same-sized chart panels.
 * Headline panels show the candidate over the baseline with its interval
 * and a line at 1×; the others show one line per configuration with its
 * interval, a control band (mean ± 3σ of the earlier runs) with run rules,
 * annotations where a configuration, the hardware or the render settings
 * change, budgets, and the pinned run as dashed reference lines. Any panel
 * can split by scene or expand; clicking a point opens that run. The view
 * lives in the URL (shareable) and can be saved by name; the run list's
 * choices are the viewer's own (localStorage).
 */

const route = getRouteApi("/trends");

/** The view's URL state, with defaults filled in. */
interface ViewState {
  scene: string;
  split: boolean;
  base: string;
  cand: string;
  pin: string;
}

const TITLE = "Trends";
const DESCRIPTION =
  "Each metric run to run, to catch regressions and confirm wins.";

export function Trends() {
  const { summaries } = useRuns();
  if (!summaries.length) {
    return (
      <Page title={TITLE} description={DESCRIPTION}>
        <Empty title="No runs yet.">
          Trends need a few runs to draw a line. Record one with{" "}
          <code>
            node packages/next/bench/suite/cli.mjs run --note "what changed"
          </code>
        </Empty>
      </Page>
    );
  }
  return <TrendsView summaries={summaries} />;
}

function TrendsView({ summaries }: { summaries: Summary[] }) {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/trends" });
  const dark = useDark();

  const configs = useMemo(() => configsOf(summaries), [summaries]);
  const scenes = useMemo(() => scenesOf(summaries), [summaries]);
  const hardwares = useMemo(
    () => [...new Set(summaries.map((s) => s.hardware))],
    [summaries],
  );
  const defaultBase = useMemo(
    () =>
      most(
        summaries,
        (s) => s.baseline,
        configs.find(isRelease) ?? configs[0] ?? "",
      ),
    [summaries, configs],
  );
  const defaultCand = useMemo(
    () =>
      most(
        summaries,
        (s) => s.candidate,
        configs.find((c) => engineOf(c) === "2.0") ?? "",
      ),
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

  // Per viewer: which runs show, the run list's filters, open sections.
  const [storedHardware, setHardware] = useStored("dyno.hardware", "*");
  const [hideInvalid, setHideInvalid] = useStored("dyno.hideInvalid", false);
  const [showSweeps, setShowSweeps] = useStored("dyno.showSweeps", false);
  const [hidden, setHidden] = useStored<string[]>("dyno.hidden", []);
  const [collapsed, setCollapsed] = useStored<string[]>("dyno.collapsed", []);
  const [listOpen, setListOpen] = useStored("dyno.trends.runList", true);
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
  /** The runs the list shows, newest first. */
  const listed = useMemo(
    () => [...summaries].reverse().filter((s) => passes(s, filter)),
    [summaries, filter],
  );
  /** The runs the panels show, oldest first (x is the index here). */
  const visible = useMemo(
    () => summaries.filter((s) => !hiddenSet.has(s.name) && passes(s, filter)),
    [summaries, hiddenSet, filter],
  );
  const pinnedRun = summaries.find((s) => s.name === pin);

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

  // ------------------------------------------------------------ panels
  const [expanded, setExpanded] = useState<Panel | null>(null);
  // Clicking a point opens that run.
  const pick = useCallback(
    (x: number) => {
      const run = visible[x];
      if (run) {
        setExpanded(null);
        void navigate({ to: "/runs/$run", params: { run: run.name } });
      }
    },
    [visible, navigate],
  );
  const ctx = useMemo<PanelContext>(
    () => ({ runs: visible, configs, base, cand, pin }),
    [visible, configs, base, cand, pin],
  );
  const splitting = split && scene === "*" && scenes.size > 1;
  const sceneKeys = useMemo(
    () => (splitting ? [...scenes.keys()] : [scene]),
    [splitting, scene, scenes],
  );
  const sections = useMemo(
    () =>
      ctx.runs.length === 0
        ? []
        : SECTIONS.map((section) => ({
            ...section,
            panels: section.keys.flatMap((key) =>
              sceneKeys.flatMap((sceneKey) => {
                const spec: PanelSpec = {
                  key,
                  scene: sceneKey,
                  headline: section.id === "headline",
                };
                const panel = panelOf(
                  ctx,
                  spec,
                  splitting ? scenes.get(sceneKey) : undefined,
                );
                return panel ? [panel] : [];
              }),
            ),
          })),
    [ctx, sceneKeys, scenes, splitting],
  );
  const expandedPanel = useMemo(
    () =>
      expanded
        ? panelOf(ctx, expanded.spec, expanded.scene, {
            width: 1200,
            height: 420,
          })
        : undefined,
    [ctx, expanded],
  );

  const allOpen = collapsed.length === 0;
  const setOpen = (id: string, open: boolean) =>
    setCollapsed(open ? collapsed.filter((c) => c !== id) : [...collapsed, id]);

  // ------------------------------------------------------------ saved views
  const [current, setCurrent] = useState("");
  const applyView = (name: string) => {
    const v = views[name];
    if (!v) {
      return;
    }
    setCurrent(name);
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
  const saveView = (name: string) => {
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
        () =>
          toast("Couldn't copy the link. Copy it from the address bar.", "bad"),
      ),
    );
  };

  const toolbar = (
    <>
      {!listOpen && (
        <IconButton
          label="Show the run list"
          variant="outlined"
          onClick={() => setListOpen(true)}
        >
          <Icon href={svgPanelExpandLeft} />
        </IconButton>
      )}
      <Choice
        label="Scene"
        value={scene}
        minWidth={240}
        options={[["*", "All scenes (geometric mean)"], ...scenes.entries()]}
        onChange={(v) => void update({ scene: v })}
      />
      <div className="trends-pair">
        <Choice
          label="Baseline"
          value={base}
          options={configs.map((c) => [c, engineLabel(c)] as const)}
          onChange={(v) => void update({ base: v })}
        />
        <IconButton
          label="Swap baseline and candidate"
          onClick={() => void update({ base: cand, cand: base })}
        >
          <Icon href={svgSwap} />
        </IconButton>
        <Choice
          label="Candidate"
          value={cand}
          options={configs.map((c) => [c, engineLabel(c)] as const)}
          onChange={(v) => void update({ cand: v })}
        />
      </div>
      <Tooltip
        title={
          scene !== "*"
            ? "Pick all scenes to split them"
            : scenes.size < 2
              ? "The runs measured one scene"
              : "One chart per scene instead of their geometric mean"
        }
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={splitting}
              disabled={scene !== "*" || scenes.size < 2}
              onChange={(e) => void update({ split: e.target.checked })}
            />
          }
          label="Split by scene"
        />
      </Tooltip>
      <span className="trends-spacer" />
      {pinnedRun && (
        <Chip
          label={`Reference: ${when(pinnedRun)}`}
          variant="outlined"
          deleteLabel="Unpin the reference run"
          onDelete={() => void update({ pin: "" })}
        />
      )}
      <Button
        variant="text"
        size="small"
        onClick={() => setCollapsed(allOpen ? SECTIONS.map((s) => s.id) : [])}
      >
        {allOpen ? "Collapse all" : "Expand all"}
      </Button>
    </>
  );

  return (
    <Page
      className="trends"
      title={TITLE}
      description={DESCRIPTION}
      help={<PageHelp />}
      actions={
        <>
          <SavedViews
            names={Object.keys(views)}
            current={current}
            onApply={applyView}
            onSave={saveView}
          />
          <Button
            variant="outlined"
            startIcon={<Icon href={svgLink} />}
            onClick={copyLink}
          >
            Copy link
          </Button>
        </>
      }
      toolbar={toolbar}
    >
      <div className={`trends-layout${listOpen ? "" : " list-closed"}`}>
        {listOpen && (
          <RunList
            listed={listed}
            total={summaries.length}
            shownCount={visible.length}
            hidden={hiddenSet}
            setHidden={setHidden}
            pin={pin}
            onPin={togglePin}
            onClose={() => setListOpen(false)}
            hardwares={hardwares}
            hardware={hardware}
            setHardware={setHardware}
            hideInvalid={hideInvalid}
            setHideInvalid={setHideInvalid}
            showSweeps={showSweeps}
            setShowSweeps={setShowSweeps}
          />
        )}
        <div className="trends-main">
          {visible.length === 0 ? (
            <Empty
              title="No runs on the charts."
              action={
                listed.length ? (
                  <Button variant="outlined" onClick={() => setHidden([])}>
                    Show all runs
                  </Button>
                ) : undefined
              }
            >
              {listed.length
                ? "Tick runs in the run list to draw them."
                : "No run matches the run list's filters. Clear them in the run list."}
            </Empty>
          ) : (
            <div role="list" className="trends-sections">
              {sections.map((section) => (
                <div
                  role="listitem"
                  className="trends-section"
                  key={section.id}
                >
                  <Accordion
                    expanded={!collapsed.includes(section.id)}
                    onChange={(_, open) => setOpen(section.id, open)}
                    slotProps={{ heading: { render: <h2 /> } }}
                  >
                    <AccordionSummary markerPlacement="start">
                      <span className="trends-section-title">
                        {section.title}
                      </span>
                      <Typography
                        variant="body-sm"
                        color="textSecondary"
                        render={<span />}
                      >
                        {section.id === "headline"
                          ? `${engineLabel(cand)} relative to ${engineLabel(base)}`
                          : `${section.panels.length} ${section.panels.length === 1 ? "chart" : "charts"}`}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {section.panels.length ? (
                        <div className="trends-grid">
                          {section.panels.map((panel) => (
                            <PanelCard
                              key={`${panel.spec.key} ${panel.spec.scene}`}
                              panel={panel}
                              onPick={pick}
                              onExpand={setExpanded}
                            />
                          ))}
                        </div>
                      ) : (
                        <Typography
                          variant="body-sm"
                          color="textSecondary"
                          render={<p />}
                          className="trends-none"
                        >
                          {section.id === "headline"
                            ? `No run on the charts measured both ${engineLabel(base)} and ${engineLabel(cand)}. Pick another baseline or candidate.`
                            : "The runs on the charts didn't record these metrics."}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                  {/* Beside the summary, not in it: no controls in a summary. */}
                  <div className="trends-section-help">
                    <Help label={`About ${section.title.toLowerCase()}`}>
                      <p>{section.help}</p>
                    </Help>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={expanded !== null}
        onClose={() => setExpanded(null)}
        fullWidth
        maxWidth="xl"
      >
        {expandedPanel && (
          <>
            <DialogTitle>
              {expandedPanel.title}
              {expandedPanel.scene ? `, ${expandedPanel.scene}` : ""}
            </DialogTitle>
            <DialogContent>
              <PanelMeta panel={expandedPanel} />
              <div className={`trends-expanded viz ${dark ? "dark" : ""}`}>
                <Chart
                  html={expandedPanel.html}
                  onPick={pick}
                  className="trends-chart"
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={() => setExpanded(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Page>
  );
}

/** The page's Help: how to read the charts. */
function PageHelp() {
  return (
    <>
      <p>
        Each chart has one point per run, oldest on the left. Click a point to
        open that run. Expand a chart to see it larger.
      </p>
      <p>
        Shaded areas along a line are its interval. The wider band is the
        candidate's control band: the mean ± 3σ of the earlier runs, drawn once
        there are six. Hollow points break a run rule (outside the band, or
        seven runs in a row on one side of the average).
      </p>
      <p>
        Dotted vertical lines mark where a configuration first appears, the
        hardware changes or the render settings change. Red dotted lines are
        budgets. Dashed lines are the reference run: pin one in the run list.
      </p>
      <p>
        The scene, baseline, candidate and reference live in the link, so Copy
        link shares this view. The run list's choices stay in this browser.
      </p>
    </>
  );
}

// ------------------------------------------------------------ panels

/** One chart panel: plain title, the latest value in words, the chart. */
const PanelCard = memo(function PanelCard({
  panel,
  onPick,
  onExpand,
}: {
  panel: Panel;
  onPick: (x: number) => void;
  onExpand: (panel: Panel) => void;
}) {
  return (
    <article className="trends-panel">
      <header className="trends-panel-header">
        <div className="trends-panel-heading">
          <Typography variant="subtitle-md" render={<h3 />}>
            {panel.title}
          </Typography>
          {panel.scene && (
            <Typography variant="caption-md" color="textSecondary">
              {panel.scene}
            </Typography>
          )}
        </div>
        <IconButton
          size="small"
          label="Expand this chart"
          onClick={() => onExpand(panel)}
        >
          <Icon href={svgWindowMaximize} />
        </IconButton>
      </header>
      <PanelMeta panel={panel} />
      <Chart html={panel.html} onPick={onPick} className="trends-chart" />
    </article>
  );
});

/** A panel's one line of words: the latest change or value, and alerts. */
function PanelMeta({ panel }: { panel: Panel }) {
  const parts: ReactNode[] = [];
  if (panel.ratio) {
    const [value, low, high] = panel.ratio;
    const change = formatChange(value, { noun: nounOf(panel.spec.key) });
    parts.push(
      <Tooltip
        key="change"
        title={`${value.toFixed(2)}× (interval ${low.toFixed(2)}–${high.toFixed(2)}×)`}
      >
        <span>
          Latest run: <span className={change.tone}>{change.text}</span>
        </span>
      </Tooltip>,
    );
  } else if (panel.latest) {
    parts.push(
      <span key="latest">
        Latest {panel.focus}: <b className="num">{panel.latest}</b>
      </span>,
    );
  }
  if (panel.pinned) {
    parts.push(<span key="pinned">dashed: reference run</span>);
  }
  for (const alert of panel.alerts) {
    parts.push(
      <span key={alert} className="trends-alert">
        <Icon href={svgWarning} /> {alert}
      </span>,
    );
  }
  return (
    <Typography
      variant="caption-lg"
      color="textSecondary"
      render={<p />}
      className="trends-panel-meta"
    >
      {parts.length ? parts : " "}
    </Typography>
  );
}

// ------------------------------------------------------------ saved views

/** Saved views: apply one, or save the current view by name. */
function SavedViews({
  names,
  current,
  onApply,
  onSave,
}: {
  names: string[];
  current: string;
  onApply: (name: string) => void;
  onSave: (name: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const labelId = useId();
  const input = useRef<HTMLInputElement>(null);
  const save = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed);
      setSaving(false);
    }
  };
  return (
    <>
      <Button
        variant="outlined"
        aria-haspopup="true"
        aria-expanded={anchor ? "true" : "false"}
        endIcon={<Icon href={svgChevronDown} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        id={labelId}
      >
        Saved views
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { "aria-labelledby": labelId } }}
      >
        {names.length ? (
          names.map((n) => (
            <MenuItem
              key={n}
              role="menuitemradio"
              aria-checked={n === current ? "true" : "false"}
              selected={n === current}
              onClick={() => {
                setAnchor(null);
                onApply(n);
              }}
            >
              {n}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No saved views yet</MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setName(current);
            setSaving(true);
          }}
        >
          Save this view…
        </MenuItem>
      </Menu>
      <Dialog
        open={saving}
        onClose={() => setSaving(false)}
        maxWidth="xs"
        fullWidth
        // The menu hands focus back to its button as the dialog opens, so
        // `autoFocus` loses; focus the field once the dialog is in.
        slotProps={{ transition: { onEntered: () => input.current?.focus() } }}
      >
        <DialogTitle>Save this view</DialogTitle>
        <DialogContent>
          <TextField
            inputRef={input}
            fullWidth
            size="small"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                save();
              }
            }}
            helperText="Saves the scene, baseline, candidate, reference run and run list filters, in this browser."
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setSaving(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            Save view
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------------ run list

/**
 * The run list. It owns the search text, so typing re-renders only the
 * list (the search is deferred, and unchanged rows are memoized).
 */
function RunList({
  listed,
  total,
  shownCount,
  hidden,
  setHidden,
  pin,
  onPin,
  onClose,
  hardwares,
  hardware,
  setHardware,
  hideInvalid,
  setHideInvalid,
  showSweeps,
  setShowSweeps,
}: {
  listed: Summary[];
  total: number;
  shownCount: number;
  hidden: Set<string>;
  setHidden: (names: string[]) => void;
  pin: string;
  onPin: (name: string) => void;
  onClose: () => void;
  hardwares: string[];
  hardware: string;
  setHardware: (value: string) => void;
  hideInvalid: boolean;
  setHideInvalid: (value: boolean) => void;
  showSweeps: boolean;
  setShowSweeps: (value: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
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
  const shownHere = shown.filter((s) => !hidden.has(s.name)).length;
  const setAll = (show: boolean) => {
    const next = new Set(hidden);
    for (const s of shown) {
      if (show) {
        next.delete(s.name);
      } else {
        next.add(s.name);
      }
    }
    setHidden([...next]);
  };
  const active = [
    hardware !== "*" ? hardware : "",
    hideInvalid ? "invalid runs hidden" : "",
    showSweeps ? "sweep runs included" : "",
  ].filter(Boolean);
  const headingId = useId();

  return (
    <aside className="trends-runs" aria-labelledby={headingId}>
      <div className="trends-runs-header">
        <div>
          <Typography variant="subtitle-md" render={<h2 />} id={headingId}>
            Runs
          </Typography>
          <Typography variant="caption-md" color="textSecondary">
            {shownCount} of {total} on the charts
          </Typography>
        </div>
        <div className="trends-runs-actions">
          <IconButton
            size="small"
            label={active.length ? "Filters (on)" : "Filters"}
            aria-haspopup="dialog"
            onClick={(e) => setFilterAnchor(e.currentTarget)}
          >
            <Icon href={active.length ? svgFilterFilled : svgFilter} />
          </IconButton>
          <IconButton size="small" label="Hide the run list" onClick={onClose}>
            <Icon href={svgPanelCollapseLeft} />
          </IconButton>
        </div>
      </div>
      <Popover
        open={!!filterAnchor}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { "aria-label": "Run filters" } }}
      >
        <div className="trends-filters">
          <Choice
            label="Hardware"
            value={hardware}
            options={[["*", "All hardware"], ...hardwares]}
            onChange={setHardware}
            minWidth={220}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={hideInvalid}
                onChange={(e) => setHideInvalid(e.target.checked)}
              />
            }
            label="Hide runs with invalid results"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showSweeps}
                onChange={(e) => setShowSweeps(e.target.checked)}
              />
            }
            label="Include sweep runs"
          />
        </div>
      </Popover>
      <TextField
        type="search"
        size="small"
        fullWidth
        placeholder="Search notes, tags, commits"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        slotProps={{ htmlInput: { "aria-label": "Search runs" } }}
      />
      {active.length > 0 && (
        <div className="trends-runs-filtered">
          <Typography variant="caption-md" color="textSecondary">
            Filtered: {active.join(", ")}
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setHardware("*");
              setHideInvalid(false);
              setShowSweeps(false);
            }}
          >
            Clear
          </Button>
        </div>
      )}
      {shown.length > 0 && (
        <FormControlLabel
          className="trends-runs-all"
          control={
            <Checkbox
              checked={shownHere === shown.length}
              indeterminate={shownHere > 0 && shownHere < shown.length}
              onChange={(e) => setAll(e.target.checked)}
            />
          }
          label={
            <Typography variant="body-sm">
              {deferred ? "All matching runs" : "All runs"}
            </Typography>
          }
        />
      )}
      {shown.length ? (
        <ol className="trends-run-list">
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
      ) : (
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="trends-none"
        >
          {deferred
            ? `No run matches "${query.trim()}".`
            : "No run matches the filters."}
        </Typography>
      )}
    </aside>
  );
}

const STATUS = {
  valid: ["Valid", "success"],
  warning: ["Warnings", "warning"],
  invalid: ["Invalid", "error"],
} as const;

/** One run in the list: show it on the charts, open it, pin it. */
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
  const label = `${when(s)} (${short(s)})`;
  return (
    <li className={`trends-run${shown ? "" : " off"}`}>
      <Checkbox
        checked={shown}
        onChange={(e) => onToggle(s.name, e.target.checked)}
        slotProps={{
          input: { "aria-label": `Show the run of ${label} on the charts` },
        }}
      />
      <div className="trends-run-text">
        <div className="trends-run-line">
          <Link
            render={<RouterLink to="/runs/$run" params={{ run: s.name }} />}
            className="trends-run-link"
          >
            {when(s)}
          </Link>
          <Typography variant="mono-sm" color="textSecondary" render={<span />}>
            {short(s)}
          </Typography>
          {verdict && s.validity ? (
            <Tooltip
              title={`${s.validity.valid} valid, ${s.validity.warning} with warnings, ${s.validity.invalid} invalid measurements`}
            >
              <Badge
                variant="inline"
                size="small"
                type={verdict === "valid" ? "muted" : "outlined"}
                color={STATUS[verdict][1]}
                badgeContent={STATUS[verdict][0]}
              />
            </Tooltip>
          ) : null}
        </div>
        {s.note || s.subject ? (
          <Typography
            variant="caption-lg"
            color="textSecondary"
            render={<p />}
            className="trends-run-note"
          >
            {s.note || s.subject}
          </Typography>
        ) : null}
        {s.tags.length ? (
          <Typography
            variant="caption-md"
            color="textTertiary"
            render={<p />}
            className="trends-run-tags"
          >
            {s.tags.join(", ")}
          </Typography>
        ) : null}
      </div>
      <ToggleButton
        value="pin"
        size="small"
        selected={pinned}
        label={pinned ? "Unpin the reference run" : "Pin as the reference run"}
        onChange={() => onPin(s.name)}
      >
        <Icon href={svgPin} />
      </ToggleButton>
    </li>
  );
});
