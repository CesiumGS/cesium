export interface SurfaceEntry {
  entry: string;
  total: number;
  kinds: Record<string, number>;
  names: { name: string; kind: string; tier: string }[];
}
export function readSurface(root?: string): {
  total: number;
  tiers: Record<string, number>;
  entries: SurfaceEntry[];
};
export function readLayers(root?: string): {
  layers: { id: string; files: number; lines: number }[];
  allowed: Record<string, string[]>;
  framesCoreValues: string[];
  edges: {
    from: string;
    to: string;
    value: number;
    typeOnly: number;
    dynamic: number;
  }[];
  dynamicImports: {
    from: string;
    to: string;
    fromLayer: string;
    toLayer: string;
  }[];
};
export function parseCheckBundle(stdout: string): {
  main: { kb: number; gzipKb: number };
  eager: { name: string; kb: number }[];
  lazy: { name: string; kb: number }[];
  clean: boolean;
};
export function readBenchResults(root?: string): {
  runs: number;
  adapters: { adapter: string; runs: number; [key: string]: unknown }[];
  baselines: { name: string; date: string | null; note: string | null }[];
};
export function readFrameGraph(root?: string): {
  passes: {
    name: string;
    reads: string[];
    writes: string[];
    sideEffect: boolean;
  }[];
  textures: {
    name: string;
    imported: boolean;
    format?: string;
    multisampled: boolean;
  }[];
};
export function readPipelineFigures(root?: string): Record<string, unknown>;
export function pipelineDrift(
  graph: { passes: { name: string }[] },
  notes: {
    PASSES: Record<string, unknown>;
    SEAMS: readonly {
      id: string;
      guards: readonly { file: string; title: string }[];
      code: readonly { name: string; file: string }[];
      passes: readonly string[];
    }[];
    DECISIONS: readonly { id: string; passes: readonly string[] }[];
  },
  root?: string,
): string[];
export function findSecrets(
  html: string,
  options?: { files?: string[]; home?: string },
): string[];
export function generate(options?: {
  root?: string;
  bundles?: boolean;
}): Promise<unknown>;
export function readOneX(root?: string): {
  version: string;
  total: number;
  names: string[];
  files: Record<string, string>;
};
export function readHistory(root?: string): {
  commits: number;
  withAgent: number;
  firstDate: string;
  lastDate: string;
};
