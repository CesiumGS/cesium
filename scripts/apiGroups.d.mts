export interface ApiEntry {
  id: string;
  title: string;
  import: string;
  blurb: string;
}
export interface ApiGroupDefinition {
  id: string;
  entry: string;
  title: string;
  blurb: string;
}
export interface ApiGroupRule {
  entry: string;
  /** A path prefix ending in `/`, or a whole file. */
  from: string;
  group: string;
}

export const ENTRIES: ApiEntry[];
export const GROUPS: ApiGroupDefinition[];
export const UNMAPPED: ApiGroupDefinition;
export const RULES: ApiGroupRule[];
export const OVERRIDES: Record<string, string>;
