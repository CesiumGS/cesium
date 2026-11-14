// Types for lib.mjs, the work tracker's shared code.

export type ItemData = Record<string, string | string[]>;
export interface LoadedItem {
  path: string;
  file: string;
  folder: string;
  data: ItemData | null;
  body: string;
  errors: string[];
}
export interface Graph {
  byId: Map<string, LoadedItem>;
  duplicates: [LoadedItem, LoadedItem][];
  all: LoadedItem[];
  items: LoadedItem[];
  projects: LoadedItem[];
  initiatives: LoadedItem[];
  get(id: string): LoadedItem | undefined;
  needs(it: LoadedItem): string[];
  openNeeds(it: LoadedItem): string[];
  isItem(it: LoadedItem): boolean;
  isOpen(it: LoadedItem): boolean;
  isReady(it: LoadedItem): boolean;
  isBlocked(it: LoadedItem): boolean;
  itemsOf(projectId: string): LoadedItem[];
  projectsOf(initiativeId: string): LoadedItem[];
  dependents(id: string): LoadedItem[];
}
export interface Progress {
  total: number;
  done: number;
  dropped: number;
  ready: number;
  blocked: number;
  inProgress: number;
  proposed: number;
}
export interface Hit {
  path: string;
  line: number;
  text: string;
  name: string;
}
export interface StalePattern {
  name: string;
  regex: string;
  paths: string[];
}
export interface Place {
  where: string;
  path?: string;
  ref?: string;
}
export interface Placed {
  where: string;
  items: LoadedItem[];
}

export const WORK_DIR: string;
export const KINDS: string[];
export const STATUSES: string[];
export const PRIORITIES: string[];
export const FOLDER: Record<string, string>;
export const KEYS: Record<string, string[]>;
export const CODE_KEYS: string[];
export const ID_PATTERN: RegExp;
export const STALE_EXEMPT: string[];
export const STALE_PATTERNS: StalePattern[];
export const LIST_BEGIN: string;
export const LIST_END: string;

export function parseItem(text: string): {
  data: ItemData | null;
  body: string;
  errors: string[];
};
export function renderItem(data: ItemData, body?: string): string;
export function slugify(title: string): string;
export function idNumber(id: string): number;
export function loadWorkTree(root: string): LoadedItem[];
export function itemFileNames(paths: string[]): string[];
export function buildGraph(items: LoadedItem[]): Graph;
export function progress(g: Graph, items: LoadedItem[]): Progress;
export function describeProgress(c: Progress): string;
export function checkItems(
  items: LoadedItem[],
  options?: { root?: string },
): string[];
export function staleNames(root: string, patterns?: StalePattern[]): Hit[];
export function bareSectionRefs(root: string, paths?: string[]): Hit[];
export function listPlaces(
  root: string,
  options?: { remotes?: boolean },
): Place[];
export function fileNamesIn(root: string, place: Place): string[];
export function loadPlaces(root: string, places: Place[]): Placed[];
export function findClaims(
  mine: LoadedItem[],
  placed: Placed[],
): { id: string; title: string; who: string[] }[];
export function findCollisions(
  placed: Placed[],
): { id: string; files: { file: string; where: string[] }[] }[];
export function renderLists(g: Graph, options?: { linkBase?: string }): string;
export function replaceBetweenMarkers(text: string, generated: string): string;
export function itemRow(g: Graph, it: LoadedItem): string;
export function projectDeps(
  g: Graph,
): { from: string; to: string; count: number }[];
export function mermaidItems(g: Graph, projectId?: string): string;
export function mermaidProjects(g: Graph): string;
export function takenNumbers(root: string, places?: Place[]): Set<number>;
export function allocate(
  root: string,
  write: (n: number) => string,
  remove: (path: string) => void,
  tries?: number,
): { id: string; path: string };
