import "./analysis.css";
import { Button, Link } from "@mui/material";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import { useMemo } from "react";
import { type Summary, when } from "../data.ts";
import { Choice, Empty, Page, Toolbar, useRuns } from "./common.tsx";
import { SweepView } from "./SweepView.tsx";
import { ALL, sweepModelOf, type SweepModel } from "./sweepModel.ts";

/**
 * Dyno's Analysis (DESIGN.md, Experiment): sweeps. A run that varied
 * settings (`--sweep`, any number of axes) or ran several CesiumJS
 * releases (`--releases`), in the sweep view (SweepView.tsx). Studies
 * replace this page (CS-405); Machines moved into the Overview.
 */

const route = getRouteApi("/_runs/analysis");
export function Analysis() {
  return (
    <Page
      title="Analysis"
      description="What a grid of settings or a CesiumJS release does to every metric and image."
      help={
        <p>
          A sweep runs each configuration once per point of a grid of settings (
          <code>--sweep view.lodExponent=0,0.5,1</code>, repeated for more
          axes); a run of several 1.x releases (
          <code>--releases 1.120.0..1.146.0</code>) sweeps the release. Place
          each axis along x, as lines or as panels. With{" "}
          <code>--reference</code>, each point's image is compared with its
          reference point's, and <code>--reference-reps 3</code> gives the noise
          floor. How each machine compares is on the{" "}
          <Link render={<RouterLink to="/overview" hash="machines" />}>
            Overview
          </Link>
          .
        </p>
      }
    >
      <Sweeps />
    </Page>
  );
}

// ------------------------------------------------------------ sweeps

function Sweeps() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/analysis" });
  // Newest first.
  const sweeps = useMemo(
    () =>
      summaries
        .map((s) => ({ s, model: sweepModelOf(s) }))
        .filter((x): x is { s: Summary; model: SweepModel } => !!x.model)
        .reverse(),
    [summaries],
  );
  const picked = sweeps.find((x) => x.s.name === search.sweep) ?? sweeps[0];

  if (!picked) {
    return (
      <Empty title="No sweeps yet">
        A sweep runs each configuration once per point of a grid of settings.
        From the repository root, run{" "}
        <code>
          npx @cesium/dyno suite run --scenes vex-zermatt --sweep param.x=1,10
          --sweep view.lodExponent=0.5,1 --reference view.lodExponent=1
          --reference-reps 3
        </code>
        , or compare 1.x releases with <code>--releases 1.120.0..1.146.0</code>.
      </Empty>
    );
  }
  const { s } = picked;
  const axesOf = (m: SweepModel) => m.dims.map((d) => d.id).join(" × ");

  return (
    <>
      <Toolbar>
        <Choice
          label="Sweep"
          minWidth={320}
          value={s.name}
          options={sweeps.map(
            (x) =>
              [
                x.s.name,
                `${when(x.s)} · ${axesOf(x.model)}${x.s.note ? ` · ${x.s.note}` : ""}`,
              ] as const,
          )}
          onChange={(sweep) =>
            void navigate({
              search: (prev) => ({ ...prev, sweep, scene: undefined }),
              replace: true,
            })
          }
        />
        <Button
          variant="outlined"
          size="small"
          className="analysis-toolbar-end"
          render={<RouterLink to="/runs/$run" params={{ run: s.name }} />}
          nativeButton={false}
        >
          Open the run's report
        </Button>
      </Toolbar>
      <SweepView
        summary={s}
        scene={search.scene ?? ALL}
        onScene={(k) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              scene: k === ALL ? undefined : k,
            }),
            replace: true,
          })
        }
      />
    </>
  );
}
