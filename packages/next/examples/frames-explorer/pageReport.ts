// The report's environment (R15, report.ts builds the report): the last
// run, the package, PROJ and every file the page loaded with its SHA-256,
// and the lines the Report tab shows of it. The token is a secret the
// report never carries (R18).
import {
  buildReport,
  fileSha,
  type EnvironmentFile,
  type ReportEnvironment,
} from "./report.ts";
import type { Manifest } from "./frameData.ts";
import type { LoadingModel } from "./loading.ts";
import type { EnvironmentLine } from "./panel/model.ts";
import type { RunSummary } from "./protocol.ts";
import type { StressResult } from "./tests.ts";
import { PACKAGE } from "./version.ts";

export interface PageReport {
  environment(): ReportEnvironment;
  /** The Report tab's environment lines. */
  lines(): EnvironmentLine[];
  /** The report over every result the page holds. */
  report(): ReturnType<typeof buildReport>;
  dispose(): void;
}

export function createPageReport(deps: {
  loading: LoadingModel;
  manifest(): Manifest | undefined;
  lastRun(): { startedAt: string; summary: RunSummary } | undefined;
  /** Every result: the catalog's, then "Try your own"'s. */
  results(): StressResult[];
  token: string | undefined;
}): PageReport {
  const { loading } = deps;

  function environment(): ReportEnvironment {
    const manifest = deps.manifest();
    const lastRun = deps.lastRun();
    const file = (name: string) => manifest?.files.find((f) => f.file === name);
    const projLoaded = loading.get("proj").state === "ready";
    const geoidLoaded = loading.get("geoid").state === "ready";
    const projSource = file("proj/proj_capi.wasm")?.sourceUrl ?? "";
    const version = /\/v(\d+\.\d+\.\d+)\//.exec(projSource)?.[1];
    /** `verified`: the browser checked the bytes (frame data, the OEM), not PROJ's loader. */
    const entry = (
      label: string,
      name: string,
      loaded: boolean,
      verified = false,
    ): EnvironmentFile => {
      const f = file(name);
      return {
        label,
        file: name,
        ...(loaded && f && { sha256: f.sha256, verified }),
        ...(!loaded && {
          note:
            loading.get(
              label === "GEOID18"
                ? "geoid"
                : label === "Artemis II OEM"
                  ? "orion"
                  : label.startsWith("proj")
                    ? "proj"
                    : "frames",
            ).state === "error"
              ? "not loaded: the fetch failed"
              : "not loaded",
        }),
      };
    };
    const framesReady = loading.get("frames").state === "ready";
    return {
      startedAt: lastRun?.startedAt ?? new Date(0).toISOString(),
      durationMs: lastRun?.summary.ms ?? 0,
      packageVersion: PACKAGE,
      userAgent: navigator.userAgent,
      ...(projLoaded && {
        proj: `proj.js ${version ? `v${version}` : ""} (PROJ as WebAssembly, from the frames store)`.replace(
          "  ",
          " ",
        ),
      }),
      files: [
        entry("proj.db", "proj/proj.db", projLoaded),
        entry("proj_capi.wasm", "proj/proj_capi.wasm", projLoaded),
        entry("GEOID18", "proj/us_noaa_g2018u0.tif", geoidLoaded),
        ...(manifest?.files ?? [])
          .filter(
            (f) =>
              f.role === "planets" ||
              f.role === "moon" ||
              f.role === "eop" ||
              f.role === "leapSeconds",
          )
          .map((f) => entry("Frame data", f.file, framesReady, true)),
        entry(
          "Artemis II OEM",
          "EM2_FODNAVBET_revF_PUBLIC.oem",
          loading.get("orion").state === "ready",
          true,
        ),
      ],
      ...(manifest?.span && {
        frameDataSpan: `${manifest.span[0]}–${manifest.span[1]}`,
      }),
      ...(lastRun && { summary: lastRun.summary }),
    };
  }

  function lines(): EnvironmentLine[] {
    const env = environment();
    return [
      [
        "Run",
        deps.lastRun()
          ? `${env.startedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC")}, ${(env.durationMs / 1000).toFixed(1)} s`
          : "not run yet",
      ],
      ["Package", env.packageVersion],
      ["PROJ", env.proj ?? "not loaded"],
      ...env.files.map((f): EnvironmentLine => [
        f.label,
        `${f.file}${f.sha256 ? `, ${fileSha(f, 12)}` : f.note ? ` (${f.note})` : ""}`,
      ]),
      ...(env.frameDataSpan
        ? [["Frame data span", env.frameDataSpan] as EnvironmentLine]
        : []),
      ["Browser", env.userAgent],
    ];
  }

  return {
    environment,
    lines,
    report: () =>
      buildReport(deps.results(), environment(), { secrets: [deps.token] }),
    dispose: () => {},
  };
}
