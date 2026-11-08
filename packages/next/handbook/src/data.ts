import generated from "../generated/data.json";

/** handbook/generated/data.json, written by scripts/handbookData.mjs. */
export interface SurfaceName {
  name: string;
  kind: string;
  tier: string;
}
export interface SurfaceEntry {
  entry: string;
  total: number;
  kinds: Record<string, number>;
  names: SurfaceName[];
}
export interface LayerEdge {
  from: string;
  to: string;
  value: number;
  typeOnly: number;
  dynamic: number;
}
export interface Chunk {
  name: string;
  kb: number;
}
export interface LibraryEntry {
  entry: string;
  ownKb: number;
  loadKb: number;
  loadGzipKb: number;
  sharedChunks: number;
  lazyKb: number;
  lazy: Chunk[];
}
export interface SuiteSummary {
  runs: number;
  lastDate: string;
  rows: number;
  pass: number;
  fail: number;
}
export type BenchRow = Record<string, string | number>;
export interface AdapterResults {
  adapter: string;
  runs: number;
  firstDate: string;
  lastDate: string;
  suites: Record<string, SuiteSummary>;
  baseline: BenchRow[];
  alloc: BenchRow[];
  instances: BenchRow[];
  hitch: BenchRow[];
  /** The latest selection parity run against 1.x, when there is one. */
  selection?: {
    lastDate: string;
    comparisons: number;
    tilesets: number;
    exact: number;
    worst: number;
  };
}
export interface HandbookData {
  meta: {
    generatedAt: string;
    commit: string;
    commitDate: string;
    dirty: boolean;
    version: string;
  };
  surface: {
    total: number;
    tiers: Record<string, number>;
    entries: SurfaceEntry[];
  };
  layers: {
    layers: { id: string; files: number; lines: number }[];
    allowed: Record<string, string[]>;
    framesCoreValues: string[];
    edges: LayerEdge[];
    dynamicImports: { from: string; to: string }[];
  };
  bundles: {
    globeOnly: {
      main: { kb: number; gzipKb: number };
      eager: Chunk[];
      lazy: Chunk[];
      clean: boolean;
    };
    library: { entries: LibraryEntry[]; assets: Chunk[] };
  };
  runtime: { what: string; files: { name: string; kb: number | null }[] }[];
  bench: {
    runs: number;
    adapters: AdapterResults[];
    baselines: { name: string; date: string | null; note: string | null }[];
  };
  counts: { testFiles: number; slangFiles: number; examples: number };
}

export const data = generated as unknown as HandbookData;

/** Formats KB as KB or MB, with one decimal. */
export const size = (kb: number | null | undefined): string => {
  if (kb === null || kb === undefined) {
    return "not on this machine";
  }
  return kb >= 1024
    ? `${(kb / 1024).toFixed(1)} MB`
    : `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
};

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
/** "8 Nov 2026". */
export const day = (iso: string): string => longDate.format(new Date(iso));

export const count = (n: number): string => n.toLocaleString("en-US");

/** The library entry of a layer ("core", "frames", ...). */
export const libraryEntry = (id: string): LibraryEntry | undefined =>
  data.bundles.library.entries.find((e) => e.entry === id);

/** The reference machine's results: the RTX adapter, when there are any. */
export const referenceAdapter = (): AdapterResults | undefined =>
  data.bench.adapters.find((a) => /rtx/i.test(a.adapter));
