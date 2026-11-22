// The instrument catalog (CS-404; CS-687's model, answered A): what each of
// Dyno's instruments measures, in which units, and its noise floor. A study
// draws on a set of instruments; its pre-registered metrics must be ones
// they declare, and runs from different instruments join by commit, device
// and settings.
//
// A noise floor is measured by an A/A run (the baseline against itself) on
// a device. Until one is recorded here (its value, the run and its date),
// a study states its own noise floor (`noise:` and `aa_run:` in its file).
// Recorded values are relative (the standard deviation of one paired log
// ratio), never milliseconds or bytes: those stay in the results store.
import { CONDITION_METRICS, DEV_FAMILIES, METRICS } from "./report.mjs";

/** Metrics where a higher value is better; every other one is lower-better. */
export const HIGHER_IS_BETTER = new Set(["settled", "usdCoverage"]);

const fromRows = (rows) =>
  rows.map(([key, label, unit]) => ({
    key,
    label,
    unit,
    ...(key.endsWith(".") ? { family: true } : {}),
  }));

/** A noise floor nobody has measured yet. */
const UNMEASURED = { value: null, aaRun: null, date: null };

export const INSTRUMENTS = [
  {
    id: "suite",
    title: "benchmark suite runs (dyno suite run, measure start suite)",
    runKind: "bench",
    metrics: fromRows([...METRICS, ...DEV_FAMILIES, ...CONDITION_METRICS]),
    noiseFloor: UNMEASURED,
  },
  {
    id: "coldstart",
    title: "a page's cold start (dyno suite coldstart)",
    runKind: "coldstart",
    metrics: fromRows(METRICS),
    noiseFloor: UNMEASURED,
  },
  {
    id: "images",
    title: "image checks against approved images (dyno suite images)",
    runKind: "images",
    metrics: [
      {
        key: "flipMean",
        label: "FLIP against the approved image, mean",
        unit: "",
      },
      {
        key: "flipP95",
        label: "FLIP against the approved image, p95",
        unit: "",
      },
    ],
    noiseFloor: UNMEASURED,
  },
  {
    id: "lab",
    title: "the Lab's harnesses (dyno lab); recorded as runs by CS-401",
    runKind: "lab",
    metrics: [],
    noiseFloor: UNMEASURED,
  },
  {
    // CS-900: one Lab harness (bench/usdReaders.html, served by
    // spikes/usd-readers/serve.mjs) over three USD readers and six SimReady
    // samples. Its runs are Lab runs until CS-401 records them in the store.
    id: "usdReaders",
    title:
      "USD readers over SimReady samples (dyno lab usdReaders, with spikes/usd-readers/serve.mjs)",
    runKind: "lab",
    metrics: [
      { key: "usdBytesRaw", label: "a reader's shipped files, raw", unit: "B" },
      { key: "usdBytesGzip", label: "the same, gzip level 9", unit: "B" },
      {
        key: "usdBytesBrotli",
        label: "the same, Brotli quality 11",
        unit: "B",
      },
      {
        key: "usdStartMs",
        label: "a new worker to a composed stage, median per sample",
        unit: "ms",
      },
      {
        key: "usdCoverage",
        label: "checks of CS-802 B's features agreeing with OpenUSD",
        unit: "",
      },
    ],
    noiseFloor: UNMEASURED,
  },
];

export const instrumentIds = () => INSTRUMENTS.map((i) => i.id);

export const instrument = (id) => INSTRUMENTS.find((i) => i.id === id);

/** Whether `instrumentId` declares `metric` (a family covers its keys: tiles.terrain). */
export function declares(instrumentId, metric) {
  const found = instrument(instrumentId);
  return Boolean(
    found?.metrics.some((m) =>
      m.family
        ? metric.startsWith(m.key) && metric.length > m.key.length
        : m.key === metric,
    ),
  );
}

/** The instruments, of `among`, that declare `metric`. */
export const instrumentsFor = (metric, among = instrumentIds()) =>
  among.filter((id) => declares(id, metric));

/** "lower" or "higher": which way a metric is better. */
export const metricDirection = (metric) =>
  HIGHER_IS_BETTER.has(metric) ? "higher" : "lower";
