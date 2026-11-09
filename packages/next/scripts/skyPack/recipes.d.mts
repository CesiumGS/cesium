export interface RecipeSource {
  id: string;
  file: string;
  name: string;
  url: string;
  sha256: string;
  bytes: number;
  credit: string;
  terms: string;
}
export interface Recipe {
  id: string;
  name: string;
  distributable: boolean;
  sources: RecipeSource[];
  credits: string[];
  modelled: string[];
}
export const RECIPES: Record<string, Recipe>;
export const DEFAULT_RECIPE: string;
