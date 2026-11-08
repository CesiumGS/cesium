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
} from "react";
import { createRoot } from "react-dom/client";
import { data, day } from "./data.ts";
import { Api } from "./tabs/api.tsx";
import { Architecture } from "./tabs/architecture.tsx";
import { Benchmarks } from "./tabs/benchmarks.tsx";
import { Cameras } from "./tabs/cameras.tsx";
import { Compatibility } from "./tabs/compatibility.tsx";
import { Differences } from "./tabs/differences.tsx";
import { Frames } from "./tabs/frames.tsx";
import { Ion } from "./tabs/ion.tsx";
import { Overview } from "./tabs/overview.tsx";
import { Precision } from "./tabs/precision.tsx";
import { Rendering } from "./tabs/rendering.tsx";
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
    ],
  },
  {
    title: "Evidence and proposals",
    tabs: [
      { id: "benchmarks", label: "Benchmarks", view: Benchmarks },
      { id: "browsers", label: "Browser compatibility", view: Compatibility },
      { id: "specs", label: "Spec extensions", view: Specs },
    ],
  },
  {
    title: "Deep dives",
    tabs: [
      { id: "frames", label: "Frame tree", view: Frames },
      { id: "cameras", label: "Cameras", view: Cameras },
      { id: "rendering", label: "Rendering", view: Rendering },
      { id: "precision", label: "Precision", view: Precision },
      { id: "shading", label: "Shading and linker", view: Shading },
      { id: "vector", label: "Vector rendering", view: Vector },
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

function useScheme(): [Scheme, () => void] {
  const query = matchMedia("(prefers-color-scheme: dark)");
  const [stored, setStored] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(query.matches);
  useEffect(() => {
    const on = () => setSystemDark(query.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, [query]);
  const scheme = stored ?? (systemDark ? "dark" : "light");
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = scheme;
  }, [scheme]);
  return [
    scheme,
    () => {
      const next = scheme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // Not remembered this time; it still changes.
      }
      setStored(next);
    },
  ];
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
          <View />
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
