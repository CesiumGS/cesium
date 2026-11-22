// Types for studiesEndpoint.mjs (vite.config.ts and the tests).
import type { Plugin } from "vite";
export const MAX_STUDY_BODY: number;
export const MAX_TEXT: number;
export const MAX_LIST: number;
export const STUDY_HEADER: string;
export function fromDyno(
  headers: Record<string, string | string[] | undefined>,
): boolean;
export function handleStudies(request: {
  method: string | undefined;
  path: string;
  query?: URLSearchParams;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
  root: string;
  results: string;
  /** Told of an exception, whose text never goes in the response. */
  onError?: (error: unknown) => void;
}): { status: number; json: Record<string, unknown> };
export function studiesEndpoint(options: {
  prefix?: string;
  root: string;
  results: string | (() => string);
}): Plugin;
