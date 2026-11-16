export interface StalePattern {
  name: string;
  regex: string;
  paths: string[];
}
export interface Hit {
  path: string;
  line: number;
  text: string;
  name: string;
}
export const STALE_EXEMPT: string[];
export const STALE_PATTERNS: StalePattern[];
export function staleNames(root: string, patterns?: StalePattern[]): Hit[];
export function bareSectionRefs(root: string, paths?: string[]): Hit[];
