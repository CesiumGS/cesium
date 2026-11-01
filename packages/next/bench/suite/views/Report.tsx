import { Callout } from "@radix-ui/themes";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { bindChartsIn } from "../charts.mjs";
import { renderReport } from "../report.mjs";
import { catalog, full, runLabel } from "../data.ts";
import { Choice, Field, Toolbar, useDark, useRuns } from "./common.tsx";
import { FirstRun } from "./FirstRun.tsx";

/**
 * One run's report (plan §16.9): the same HTML the CLI writes
 * (report.mjs), drawn in a shadow root so its styles stay its own. A
 * click on a path chart opens the explorer at that point of the path.
 */

const route = getRouteApi("/report");

export function Report() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const setSearch = route.useNavigate();
  const navigate = useNavigate();
  const dark = useDark();
  const host = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();

  const newest = summaries.at(-1)?.name;
  const run =
    search.run && summaries.some((s) => s.name === search.run)
      ? search.run
      : newest;

  useEffect(() => {
    if (!run) {
      return;
    }
    let cancelled = false;
    setHtml(undefined);
    setError(undefined);
    full(run)
      .then((results) => {
        // Runs before r33 carry no budgets: the catalog's apply.
        const report = renderReport(results, { budgets: catalog.budgets });
        if (!cancelled) {
          setHtml(report);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [run]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el || !html) {
      return;
    }
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script:not([type])").forEach((s) => s.remove());
    shadow.innerHTML = [...doc.head.querySelectorAll("style")]
      .map((s) => s.outerHTML)
      .concat(doc.body.innerHTML)
      .join("");
    shadow.querySelector(".viz")?.classList.toggle("dark", dark);
    shadow.querySelector(".viz")?.classList.toggle("light", !dark);
    bindChartsIn(shadow);
    // Path charts and explorer links: in-app navigation, not page loads.
    const onChart = (e: Event) => {
      const target = (e.target as Element).closest<HTMLElement>(
        "[data-explore]",
      );
      const x = (e as CustomEvent).detail.x as number;
      if (target && x >= 0 && x <= 100) {
        openExplorer(target.dataset.explore!, x / 100);
      }
    };
    const onClick = (e: Event) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>(
        'a[href*="#/explorer"]',
      );
      if (a) {
        e.preventDefault();
        openExplorer(a.getAttribute("href")!);
      }
    };
    const openExplorer = (href: string, t?: number) => {
      const query = new URLSearchParams(
        href.replace(/&amp;/g, "&").split("?")[1] ?? "",
      );
      const s: Record<string, string | number> = Object.fromEntries(query);
      if (t !== undefined) {
        s.t = Number(t.toFixed(3));
      } else if (s.t !== undefined) {
        s.t = Number(s.t);
      }
      void navigate({ to: "/explorer", search: s });
    };
    shadow.addEventListener("chart-click", onChart);
    shadow.addEventListener("click", onClick);
    return () => {
      shadow.removeEventListener("chart-click", onChart);
      shadow.removeEventListener("click", onClick);
    };
  }, [html, dark, navigate]);

  if (!summaries.length) {
    return <FirstRun />;
  }
  return (
    <>
      <Toolbar>
        <Field label="Run">
          <Choice
            value={run}
            options={[...summaries]
              .reverse()
              .map((s) => [s.name, runLabel(s)] as const)}
            onChange={(v) => void setSearch({ search: { run: v } })}
          />
        </Field>
      </Toolbar>
      {error ? (
        <Callout.Root color="red">
          <Callout.Text>
            This run's results could not be read ({error}). The summary may
            outlive a moved or partial results file.
          </Callout.Text>
        </Callout.Root>
      ) : !html ? (
        <div className="loading" role="status">
          <span className="spinner" />
          Rendering the report…
        </div>
      ) : null}
      <div ref={host} className="report-host" hidden={!html || !!error} />
    </>
  );
}
