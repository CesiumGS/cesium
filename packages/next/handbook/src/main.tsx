import "./font.ts";
import "./handbook.css";
import { IconButton } from "@mui/material";
import { Icon, Root } from "@stratakit/mui";
import { unstable_NavigationList as NavigationList } from "@stratakit/structures";
import { svgMoon } from "@stratakit/icons/moon";
import { svgSun } from "@stratakit/icons/sun";
import {
  StrictMode,
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentType,
  Component,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { data, day } from "./data.ts";
import { Api } from "./tabs/api.tsx";
import { Breps } from "./tabs/breps.tsx";
import { Architecture } from "./tabs/architecture.tsx";
import { Benchmarks } from "./tabs/benchmarks.tsx";
import { Cameras } from "./tabs/cameras.tsx";
import { Compatibility } from "./tabs/compatibility.tsx";
import { Compare } from "./tabs/compare.tsx";
import { Differences } from "./tabs/differences.tsx";
import { Dyno } from "./tabs/dyno.tsx";
import { Frames } from "./tabs/frames.tsx";
import { Ion } from "./tabs/ion.tsx";
import { Mobile } from "./tabs/mobile.tsx";
import { Overview } from "./tabs/overview.tsx";
import { Precision } from "./tabs/precision.tsx";
import { Rendering } from "./tabs/rendering.tsx";
import { Scene } from "./tabs/scene.tsx";
import { Selection } from "./tabs/selection.tsx";
import { Shadows } from "./tabs/shadows.tsx";
import { Tessellation } from "./tabs/tessellation.tsx";
import { Shading } from "./tabs/shading.tsx";
import { Specs } from "./tabs/specs.tsx";
import { Vector } from "./tabs/vector.tsx";

interface Tab {
  id: string;
  label: string;
  view: ComponentType;
}

const GROUPS: { title: string; tabs: Tab[] }[] = [
  {
    title: "The engine",
    tabs: [
      { id: "overview", label: "Overview", view: Overview },
      { id: "architecture", label: "System architecture", view: Architecture },
      { id: "api", label: "Public API", view: Api },
      { id: "differences", label: "Differences from 1.x", view: Differences },
      { id: "compare", label: "1.x to 2.0 API", view: Compare },
    ],
  },
  {
    title: "Evidence and proposals",
    tabs: [
      { id: "benchmarks", label: "Benchmarks", view: Benchmarks },
      { id: "dyno", label: "Dyno", view: Dyno },
      { id: "browsers", label: "Browser compatibility", view: Compatibility },
      { id: "specs", label: "Spec extensions", view: Specs },
    ],
  },
  {
    title: "Deep dives",
    tabs: [
      { id: "scene", label: "Scene representation", view: Scene },
      { id: "frames", label: "Frame tree", view: Frames },
      { id: "cameras", label: "Cameras", view: Cameras },
      { id: "rendering", label: "Rendering", view: Rendering },
      { id: "shadows", label: "Shadows", view: Shadows },
      { id: "selection", label: "Tile selection", view: Selection },
      { id: "precision", label: "Precision and accuracy", view: Precision },
      { id: "shading", label: "Shading and linker", view: Shading },
      { id: "vector", label: "Vector rendering", view: Vector },
      { id: "breps", label: "B-reps and geometry queries", view: Breps },
      {
        id: "tessellation",
        label: "Tessellation",
        view: Tessellation,
      },
      { id: "mobile", label: "Mobile", view: Mobile },
      { id: "ion", label: "Cesium ion", view: Ion },
    ],
  },
];
const TABS = GROUPS.flatMap((g) => g.tabs);
const FIRST = TABS[0]!;

const tabFromHash = (): Tab =>
  TABS.find((t) => `#/${t.id}` === location.hash) ?? FIRST;

function useTab(): Tab {
  const [tab, setTab] = useState(tabFromHash);
  useEffect(() => {
    const on = () => setTab(tabFromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return tab;
}

type Scheme = "light" | "dark";
const THEME_KEY = "cesium-handbook.theme";

function readTheme(): Scheme | undefined {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : undefined;
  } catch {
    return undefined;
  }
}

function writeTheme(theme: Scheme | undefined): void {
  try {
    if (theme) {
      localStorage.setItem(THEME_KEY, theme);
    } else {
      localStorage.removeItem(THEME_KEY);
    }
  } catch {
    // Not remembered this time; it still changes.
  }
}

/**
 * The system's theme, unless the reader has chosen the other one. A choice
 * lasts until the toggle comes back to the system's theme or the system's
 * theme changes, so it can't leave the page stuck on one theme for good.
 */
function useScheme(): [Scheme, () => void] {
  const query = matchMedia("(prefers-color-scheme: dark)");
  const [stored, setStored] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(query.matches);
  useEffect(() => {
    const on = () => {
      setSystemDark(query.matches);
      writeTheme(undefined);
      setStored(undefined);
    };
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, [query]);
  const system: Scheme = systemDark ? "dark" : "light";
  const scheme = stored ?? system;
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = scheme;
  }, [scheme]);
  return [
    scheme,
    () => {
      const next = scheme === "dark" ? "light" : "dark";
      const choice = next === system ? undefined : next;
      writeTheme(choice);
      setStored(choice);
    },
  ];
}

/** One tab's failure stays in that tab, and the rest of the handbook works. */
class TabBoundary extends Component<
  { label: string; children: ReactNode },
  { error?: Error }
> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <div className="tab-error" role="alert">
        <h1>{this.props.label} couldn't draw</h1>
        <p>
          The other tabs still work. If this page is being edited, it may just
          be waiting for new data.
        </p>
        <p className="provenance">{error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: undefined })}
        >
          Try again
        </button>
      </div>
    );
  }
}

function App() {
  const tab = useTab();
  const [scheme, toggle] = useScheme();
  // A new tab reads from its top, and a keyboard or screen-reader user lands
  // on its title rather than back in the list.
  const [first, setFirst] = useState(true);
  useEffect(() => {
    document.title = `${tab.label}: CesiumJS 2.0 engine handbook`;
    if (first) {
      setFirst(false);
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById("page-title")?.focus({ preventScroll: true });
    document
      .querySelector('.strip a[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
    // Only when the tab changes.
  }, [tab]);
  const View = tab.view;
  const nextScheme = scheme === "dark" ? "light" : "dark";
  return (
    <Root colorScheme={scheme}>
      <div className="shell">
        <div className="side">
          <div className="brand">
            <p className="brand-name">CesiumJS 2.0</p>
            <p className="brand-sub">Engine handbook</p>
          </div>
          <nav aria-label="Handbook tabs">
            {GROUPS.map((group) => (
              <div className="nav-group" key={group.title}>
                <h2>{group.title}</h2>
                <NavigationList.Root
                  items={group.tabs.map((t) => (
                    <NavigationList.Anchor
                      key={t.id}
                      href={`#/${t.id}`}
                      label={t.label}
                      active={t.id === tab.id}
                    />
                  ))}
                />
              </div>
            ))}
          </nav>
          <div className="side-foot">
            <p>
              Data from {data.meta.commit}, {day(data.meta.commitDate)}.
            </p>
            <div>
              <IconButton
                label={`Switch to ${nextScheme} theme`}
                onClick={toggle}
              >
                <Icon href={scheme === "dark" ? svgSun : svgMoon} />
              </IconButton>
            </div>
          </div>
        </div>
        <nav className="strip" aria-label="Handbook tabs, as a strip">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#/${t.id}`}
              aria-current={t.id === tab.id ? "page" : undefined}
            >
              {t.label}
            </a>
          ))}
        </nav>
        <main className="main">
          <TabBoundary key={tab.id} label={tab.label}>
            <View />
          </TabBoundary>
          <footer className="stamp">
            <p>
              Built {day(data.meta.generatedAt)} from commit {data.meta.commit}
              {data.meta.dirty ? " plus uncommitted changes" : ""}. This page is
              one self-contained file: it needs no server or network, except to
              follow links to its sources.
            </p>
            <p>
              Set in Inter, copyright The Inter Project Authors, under the{" "}
              <a
                href="https://openfontlicense.org"
                target="_blank"
                rel="noreferrer"
              >
                SIL Open Font License 1.1
              </a>
              .
            </p>
          </footer>
        </main>
      </div>
    </Root>
  );
}

// On paper nothing can be clicked open, so everything prints open.
addEventListener("beforeprint", () => {
  for (const details of document.querySelectorAll("details")) {
    if (!details.open) {
      details.open = true;
      details.dataset.printOpened = "true";
    }
  }
});
addEventListener("afterprint", () => {
  for (const details of document.querySelectorAll<HTMLDetailsElement>(
    "details[data-print-opened]",
  )) {
    details.open = false;
    delete details.dataset.printOpened;
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
