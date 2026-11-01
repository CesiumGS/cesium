import "./results.css";
import {
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { bindChartsIn } from "../charts.mjs";
import { renderReport } from "../report.mjs";
import { catalog, full, short } from "../data.ts";
import type { ExplorerSearch } from "../routes.tsx";
import { Choice, Empty, Page, useDark, useRuns } from "./common.tsx";
import { dateOf, runOption } from "./runParts.tsx";

/**
 * One run's report (DESIGN.md) at /runs/$run: the same HTML the CLI
 * writes (report.mjs), drawn in a shadow root so its styles stay its
 * own, under Dyno's page header (back to Runs, a run picker, compare
 * with the previous run). Clicks on explorer links and path charts open
 * the Explorer in the app.
 */

const route = getRouteApi("/runs/$run");

export function Report() {
  const { summaries } = useRuns();
  const { run } = route.useParams();
  const navigate = useNavigate();
  const dark = useDark();
  const host = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();

  const index = summaries.findIndex((s) => s.name === run);
  const s = summaries[index];
  // The previous run of the same kind (sweeps compare with sweeps).
  const previous =
    s &&
    summaries
      .slice(0, index)
      .reverse()
      .find((x) => !!x.sweep === !!s.sweep);

  useEffect(() => {
    if (!s) {
      return;
    }
    let cancelled = false;
    setHtml(undefined);
    setError(undefined);
    full(s.name)
      .then((results) => {
        // Runs before r33 carry no budgets: the catalog's apply.
        const report = renderReport(results, { budgets: catalog.budgets });
        if (!cancelled) {
          setHtml(report);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [s]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el || !html) {
      return;
    }
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script:not([type])").forEach((x) => x.remove());
    shadow.innerHTML = [...doc.head.querySelectorAll("style")]
      .map((x) => x.outerHTML)
      .concat(doc.body.innerHTML)
      .join("");
    shadow.querySelector(".viz")?.classList.toggle("dark", dark);
    shadow.querySelector(".viz")?.classList.toggle("light", !dark);
    bindChartsIn(shadow);
    // Path charts and explorer links: in-app navigation, not page loads.
    const openExplorer = (href: string, t?: number) => {
      const query = new URLSearchParams(
        href.replace(/&amp;/g, "&").split("?")[1] ?? "",
      );
      const search: ExplorerSearch = {};
      for (const key of ["scene", "left", "right", "cesium"] as const) {
        const v = query.get(key);
        if (v !== null) {
          search[key] = v;
        }
      }
      const at = t ?? Number(query.get("t") ?? NaN);
      if (Number.isFinite(at)) {
        search.t = Number(at.toFixed(3));
      }
      void navigate({ to: "/explorer", search });
    };
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
    shadow.addEventListener("chart-click", onChart);
    shadow.addEventListener("click", onClick);
    return () => {
      shadow.removeEventListener("chart-click", onChart);
      shadow.removeEventListener("click", onClick);
    };
  }, [html, dark, navigate]);

  const back = <Link render={<RouterLink to="/runs" />}>Runs</Link>;
  if (!s) {
    return (
      <Page title="Run not found" back={back}>
        <Empty
          title={`No run named ${run}.`}
          action={
            <Button
              variant="outlined"
              nativeButton={false}
              render={<RouterLink to="/runs" />}
            >
              Open runs
            </Button>
          }
        >
          It may have been moved or deleted from the results directory. Pick a
          run from the list.
        </Empty>
      </Page>
    );
  }

  return (
    <Page
      title={`Run of ${dateOf(s)}`}
      description={
        <>
          {s.note || s.subject || "No note"} ·{" "}
          <span className="res-mono" title={s.commit}>
            {short(s)}
          </span>
          {s.branch ? ` on ${s.branch}` : ""}
        </>
      }
      back={back}
      actions={
        previous && (
          <Button
            variant="outlined"
            nativeButton={false}
            render={
              <RouterLink
                to="/compare"
                search={{ a: previous.name, b: s.name }}
              />
            }
          >
            Compare with previous run
          </Button>
        )
      }
      toolbar={
        <>
          <Choice
            label="Run"
            value={s.name}
            minWidth={320}
            options={[...summaries].reverse().map(runOption)}
            onChange={(v) =>
              void navigate({ to: "/runs/$run", params: { run: v } })
            }
          />
        </>
      }
    >
      {error ? (
        <Alert severity="error">
          <AlertTitle>This run's results could not be read.</AlertTitle>
          {error}. Its summary may outlive a moved or partial results file;
          check that {s.name} is still in the results directory.
        </Alert>
      ) : !html ? (
        <div className="res-loading" role="status">
          <CircularProgress size={20} />
          <Typography variant="body-md" color="textSecondary">
            Rendering the report…
          </Typography>
        </div>
      ) : null}
      <div ref={host} className="report-host" hidden={!html || !!error} />
    </Page>
  );
}
