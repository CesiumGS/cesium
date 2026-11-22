// Types for manifest.mjs (the parts TypeScript callers use).
import type { Dataset, ExampleScene, Scene } from "./schema.ts";

export interface Catalog {
  datasets: Dataset[];
  scenes: Scene[];
  /** Group D (dev.json and a private manifest's). */
  exampleScenes: ExampleScene[];
  scenarios: unknown[];
  setups: unknown[];
  budgets: unknown[];
  areas: unknown[];
  tiers: unknown[];
  engines: { default: string[]; baseline?: string; candidate?: string };
  /** 1: the public catalog; 2 with a private manifest. */
  sources: number;
}
export function loadCatalog(manifest?: string): Catalog;
export function isExampleScene(scene: unknown): scene is ExampleScene;
export function allScenes(catalog: Catalog): Array<Scene | ExampleScene>;
export function sceneDatasets(
  catalog: Catalog,
  scene: Scene | ExampleScene,
): Array<Dataset | undefined>;
export const ENGINE_FORMATS: Record<string, string[]>;
export function unsupportedReason(
  catalog: Catalog,
  scene: Scene | ExampleScene,
  engine: string,
): string | undefined;
