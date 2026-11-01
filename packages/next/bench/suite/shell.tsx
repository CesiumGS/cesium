import "@radix-ui/themes/styles.css";
import "./dyno.css";
import {
  BellIcon,
  CardStackIcon,
  ColumnsIcon,
  DashboardIcon,
  DesktopIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  InfoCircledIcon,
  KeyboardIcon,
  LayersIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  MoonIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Box,
  Callout,
  Code,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Kbd,
  Popover,
  ScrollArea,
  Separator,
  Text,
  TextField,
  Theme,
  Tooltip,
} from "@radix-ui/themes";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { ALERT_METRICS, detectAlerts } from "./changepoints.mjs";
import { cellKey, cellTitle, store, type Summary } from "./data.ts";
import { DarkContext, useRuns } from "./views/common.tsx";
import { FirstRun } from "./views/FirstRun.tsx";

/** Views that work without runs; the others show the guided first run. */
const WITHOUT_RUNS = new Set(["/explorer", "/images", "/start"]);

/**
 * Dyno's shell (plan §16.9): navigation grouped by job, with counts of
 * what needs attention (new regressions, changed images); a page header
 * saying what each view is for; light and dark themes; a command palette
 * (Ctrl/⌘ K) to jump to any view, scene or run; keyboard shortcuts (g
 * then a letter; / to search; ? for help); and toasts for saved changes.
 * The views are routes (routes.tsx) rendered in the outlet; each keeps
 * its state in its route's search params.
 */

interface Page {
  /** The route's path. */
  id: string;
  label: string;
  icon: ReactNode;
  key?: string;
  description: string;
  hidden?: boolean;
}

const GROUPS: Array<{ label: string; pages: Page[] }> = [
  {
    label: "Track",
    pages: [
      {
        id: "/workspace",
        label: "Workspace",
        icon: <DashboardIcon />,
        key: "w",
        description:
          "Metrics run to run and commit to commit: headline ratios, control bands, annotations. Pick runs on the left; click a point for its report.",
      },
      {
        id: "/alerts",
        label: "Alerts",
        icon: <BellIcon />,
        key: "a",
        description:
          "Change points across runs that moved a metric by 3% or more. Triage each: acknowledge, mark expected or invalid, or fixed.",
      },
      {
        id: "/runs",
        label: "Runs",
        icon: <CardStackIcon />,
        key: "r",
        description:
          "Every run, newest first, with its headline ratios. Open one for its full report.",
      },
      {
        id: "/compare",
        label: "Compare",
        icon: <ColumnsIcon />,
        key: "c",
        description:
          "Two runs side by side per scene: the commit-to-commit view.",
      },
    ],
  },
  {
    label: "Inspect",
    pages: [
      {
        id: "/scenes",
        label: "Scenes",
        icon: <LayersIcon />,
        key: "s",
        description:
          "Each scene's history, best results per engine, filmstrip over time and the changes that moved it.",
      },
      {
        id: "/explorer",
        label: "Explorer",
        icon: <GlobeIcon />,
        key: "e",
        description:
          "Scenes live in one or two engines: follow the camera path or fly freely, pause streaming, color tiles by depth.",
      },
      {
        id: "/images",
        label: "Images",
        icon: <ImageIcon />,
        key: "i",
        description:
          "Image checks against approved baselines: review changes side by side, swipe or flicker, then approve or reject.",
      },
    ],
  },
  {
    label: "Explore",
    pages: [
      {
        id: "/sweeps",
        label: "Sweeps",
        icon: <MixerHorizontalIcon />,
        description:
          "What a parameter or a CesiumJS release does to every metric and to the image.",
      },
      {
        id: "/hardware",
        label: "Hardware",
        icon: <DesktopIcon />,
        description: "The same comparison on each machine.",
      },
    ],
  },
];
const START: Page = {
  id: "/start",
  label: "Getting started",
  icon: <InfoCircledIcon />,
  description:
    "What Dyno is for, your setup checked, and a first measured run.",
  hidden: true,
};
const REPORT: Page = {
  id: "/report",
  label: "Run report",
  icon: <FileTextIcon />,
  description:
    "One run: verdict and validity first, then the scorecard, budgets, scenes in detail and the setup.",
  hidden: true,
};
const PAGES = [...GROUPS.flatMap((g) => g.pages), REPORT, START];

type Appearance = "light" | "dark";
const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

function useAttention(summaries: Summary[]): {
  alerts: number;
  images: number;
} {
  const [counts, setCounts] = useState({ alerts: 0, images: 0 });
  useEffect(() => {
    void (async () => {
      let triage: Record<string, { status: string }> = {};
      try {
        const res = await fetch("/bench-results/triage.json");
        if (res.ok) {
          triage = await res.json();
        }
      } catch {
        // Nothing triaged yet.
      }
      const alerts = detectAlerts(summaries, ALERT_METRICS).filter(
        (a) =>
          a.kind === "regression" && (triage[a.id]?.status ?? "new") === "new",
      );
      let images = 0;
      try {
        const list = await (
          await fetch("/bench-results/images/index.json")
        ).json();
        if (list.runs[0]) {
          const run = await (
            await fetch(`/bench-results/images/${list.runs[0]}`)
          ).json();
          images = run.checks.filter(
            (c: { status: string; approved?: boolean; review?: unknown }) =>
              (c.status === "changed" || c.status === "new") &&
              !c.approved &&
              !c.review,
          ).length;
        }
      } catch {
        // No image checks yet.
      }
      // Grouped like the Alerts view: one per change across scenes.
      const groups = new Set(
        alerts.map(
          (a) =>
            `${a.metric}|${a.config}|${a.range.from.commit}|${a.range.to.commit}`,
        ),
      );
      setCounts({ alerts: groups.size, images });
    })();
  }, [summaries]);
  return counts;
}

/** Loading the runs (before any view can draw). */
export function ShellPending() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading runs…
    </div>
  );
}

/** The runs could not be read (no dev server, or a broken index). */
export function ShellError({ error }: { error: unknown }) {
  return (
    <Callout.Root color="red" m="4">
      <Callout.Text>
        Dyno could not read the results ({String(error)}). It reads them through
        the dev server: run <Code>npm run dev</Code> in packages/next.
      </Callout.Text>
    </Callout.Root>
  );
}

export function Shell() {
  const { index, summaries } = useRuns();
  const tab = useRouterState({ select: (s) => s.location.pathname });
  const routerNavigate = useNavigate();
  const [choice, setChoice] = useState<Appearance | "system">(() =>
    store.get("dyno.theme", "system"),
  );
  const [system, setSystem] = useState(systemDark());
  const appearance: Appearance =
    choice === "system" ? (system ? "dark" : "light") : choice;
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; tone: string }>
  >([]);
  const body = useRef<HTMLDivElement>(null);
  const attention = useAttention(summaries);

  const navigate = useCallback(
    (to: string, search?: Record<string, string>) => {
      void routerNavigate({ to, search: search ?? {} } as never);
    },
    [routerNavigate],
  );

  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystem(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  // Standalone report styles read the page's theme.
  useEffect(() => {
    document.documentElement.dataset.theme = appearance;
  }, [appearance]);

  useEffect(() => {
    const page = PAGES.find((p) => p.id === tab);
    document.title = page ? `${page.label} · Dyno` : "Dyno";
  }, [tab]);

  // Toasts from any view.
  useEffect(() => {
    let next = 0;
    const on = (e: Event) => {
      const { message, tone } = (e as CustomEvent).detail;
      const id = ++next;
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    };
    addEventListener("dyno:toast", on);
    return () => removeEventListener("dyno:toast", on);
  }, []);

  // Keyboard: Ctrl/⌘ K, g + letter, /, ?.
  useEffect(() => {
    let pendingG = 0;
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.closest('[role="listbox"], [role="menu"]') !== null);
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      if (e.key === "?") {
        setHelp(true);
      } else if (e.key === "/") {
        const search = body.current?.querySelector<HTMLInputElement>(
          'input[type="search"]',
        );
        if (search) {
          e.preventDefault();
          search.focus();
        }
      } else if (e.key === "g") {
        pendingG = Date.now();
      } else if (Date.now() - pendingG < 1200) {
        const page = PAGES.find((p) => p.key === e.key);
        if (page) {
          navigate(page.id);
        }
        pendingG = 0;
      }
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [navigate]);

  const page = PAGES.find((p) => p.id === tab) ?? PAGES[0]!;
  const runsCount = summaries.length;

  return (
    <Theme
      appearance={appearance}
      accentColor="blue"
      grayColor="sand"
      radius="medium"
      scaling="95%"
      panelBackground="solid"
    >
      <div className="shell">
        <nav className="sidebar" aria-label="Dyno">
          <Flex align="baseline" gap="2" px="3" pt="3" pb="2">
            <Heading size="5" as="h1">
              Dyno
            </Heading>
            <Text size="1" color="gray">
              CesiumJS benchmarks
            </Text>
          </Flex>
          <Box px="2" pb="2">
            <button className="search-button" onClick={() => setPalette(true)}>
              <MagnifyingGlassIcon />
              <span>Go to…</span>
              <Kbd size="1">Ctrl K</Kbd>
            </button>
          </Box>
          <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1 }}>
            {GROUPS.map((group) => (
              <Box key={group.label} px="2" pb="2">
                <Text
                  as="div"
                  size="1"
                  color="gray"
                  weight="medium"
                  className="group-label"
                >
                  {group.label}
                </Text>
                {group.pages.map((p) => {
                  const count =
                    p.id === "/alerts"
                      ? attention.alerts
                      : p.id === "/images"
                        ? attention.images
                        : 0;
                  return (
                    <Link
                      key={p.id}
                      to={p.id}
                      className="nav-item"
                      aria-current={tab === p.id ? "page" : undefined}
                      title={p.key ? `g then ${p.key}` : undefined}
                    >
                      {p.icon}
                      <span className="label">{p.label}</span>
                      {count > 0 && (
                        <Badge
                          color={p.id === "alerts" ? "red" : "orange"}
                          variant="solid"
                          radius="full"
                          size="1"
                        >
                          {count}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </Box>
            ))}
          </ScrollArea>
          <Separator size="4" />
          <Flex align="center" justify="between" p="2" gap="1">
            <Popover.Root>
              <Popover.Trigger>
                <button className="nav-item small">
                  <InfoCircledIcon />
                  <span className="label">{runsCount} runs</span>
                </button>
              </Popover.Trigger>
              <Popover.Content width="420px">
                <Text as="p" size="2" mb="2">
                  Results are read from <Code>{index.directory}</Code> (set{" "}
                  <Code>BENCH_RESULTS</Code> to change it). They stay outside
                  the repository: they carry machine details.
                </Text>
                <Text as="p" size="2" mb="1">
                  Run the suite:
                </Text>
                <Code size="2">
                  node packages/next/bench/suite/cli.mjs run --note "what
                  changed"
                </Code>
                <Text as="p" size="2" mt="2" mb="1">
                  Image checks and alerts:
                </Text>
                <Code size="2">cli.mjs images --parity · cli.mjs alerts</Code>
                <Text as="p" size="2" mt="2">
                  <Link to="/start">Getting started</Link>: your setup checked
                  and a first run, step by step.
                </Text>
              </Popover.Content>
            </Popover.Root>
            <Flex gap="1">
              <Tooltip content="Keyboard shortcuts (?)">
                <IconButton
                  variant="ghost"
                  color="gray"
                  onClick={() => setHelp(true)}
                  aria-label="Keyboard shortcuts"
                >
                  <KeyboardIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content={`Theme: ${choice} (click to change)`}>
                <IconButton
                  variant="ghost"
                  color="gray"
                  aria-label="Change theme"
                  onClick={() => {
                    const order = ["system", "light", "dark"] as const;
                    const next = order[(order.indexOf(choice) + 1) % 3]!;
                    setChoice(next);
                    store.set("dyno.theme", next);
                  }}
                >
                  {appearance === "dark" ? <MoonIcon /> : <SunIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>
        </nav>
        <main className="content">
          <header className="page-header">
            <Flex align="center" gap="2">
              {page.hidden && (
                <Link className="back" to="/runs">
                  ← Runs
                </Link>
              )}
              <Heading size="6" as="h2">
                {page.label}
              </Heading>
            </Flex>
            <Text as="p" size="2" color="gray">
              {page.description}
            </Text>
          </header>
          <DarkContext.Provider value={appearance === "dark"}>
            <div ref={body} className={`dyno-view viz ${appearance}`}>
              {summaries.length || WITHOUT_RUNS.has(tab) ? (
                <Outlet />
              ) : (
                <FirstRun />
              )}
            </div>
          </DarkContext.Provider>
        </main>
      </div>
      <CommandPalette
        open={palette}
        onOpenChange={setPalette}
        navigate={navigate}
        summaries={summaries}
      />
      <Dialog.Root open={help} onOpenChange={setHelp}>
        <Dialog.Content maxWidth="440px">
          <Dialog.Title>Keyboard shortcuts</Dialog.Title>
          <table className="shortcuts">
            <tbody>
              <tr>
                <td>
                  <Kbd>Ctrl K</Kbd>
                </td>
                <td>Go to a view, scene or run</td>
              </tr>
              {PAGES.filter((p) => p.key).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Kbd>g</Kbd> <Kbd>{p.key}</Kbd>
                  </td>
                  <td>{p.label}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <Kbd>/</Kbd>
                </td>
                <td>Search (runs, workspace)</td>
              </tr>
              <tr>
                <td>
                  <Kbd>?</Kbd>
                </td>
                <td>This list</td>
              </tr>
            </tbody>
          </table>
        </Dialog.Content>
      </Dialog.Root>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <Callout.Root
            key={t.id}
            color={t.tone === "bad" ? "red" : "green"}
            variant="surface"
            size="1"
          >
            <Callout.Text>{t.message}</Callout.Text>
          </Callout.Root>
        ))}
      </div>
    </Theme>
  );
}

interface Item {
  label: string;
  hint: string;
  go: () => void;
}

function CommandPalette({
  open,
  onOpenChange,
  navigate,
  summaries,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  navigate: (to: string, search?: Record<string, string>) => void;
  summaries: Summary[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const items = useMemo<Item[]>(() => {
    const out: Item[] = PAGES.filter((p) => !p.hidden).map((p) => ({
      label: p.label,
      hint: "view",
      go: () => navigate(p.id),
    }));
    const scenes = new Map<string, string>();
    for (const s of summaries) {
      for (const c of s.scenes) {
        scenes.set(cellKey(c), cellTitle(c));
      }
    }
    for (const [key, title] of scenes) {
      out.push({
        label: title,
        hint: "scene",
        go: () => navigate("/scenes", { scene: key }),
      });
    }
    for (const s of [...summaries].reverse()) {
      out.push({
        label: `${new Date(s.date).toLocaleString()} · ${s.commit.slice(0, 7)}${s.note ? ` · ${s.note}` : ""}`,
        hint: "run",
        go: () => navigate("/report", { run: s.name }),
      });
    }
    return out;
  }, [navigate, summaries]);
  const q = query.trim().toLowerCase();
  const matches = (
    q
      ? items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q))
      : items
  ).slice(0, 40);
  useEffect(() => setActive(0), [query, open]);
  const choose = (item?: Item) => {
    if (item) {
      onOpenChange(false);
      setQuery("");
      item.go();
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="560px" aria-describedby={undefined}>
        <Dialog.Title size="3">Go to</Dialog.Title>
        <TextField.Root
          autoFocus
          placeholder="A view, a scene or a run…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(matches.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              choose(matches[active]);
            }
          }}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
        <ScrollArea type="auto" style={{ maxHeight: 360, marginTop: 8 }}>
          <div role="listbox" aria-label="Results">
            {matches.map((item, i) => (
              <button
                key={`${item.hint}:${item.label}`}
                role="option"
                aria-selected={i === active}
                className="palette-item"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(item)}
              >
                <span>{item.label}</span>
                <Text size="1" color="gray">
                  {item.hint}
                </Text>
              </button>
            ))}
            {!matches.length && (
              <Text as="p" size="2" color="gray" m="2">
                Nothing matches.
              </Text>
            )}
          </div>
        </ScrollArea>
      </Dialog.Content>
    </Dialog.Root>
  );
}
