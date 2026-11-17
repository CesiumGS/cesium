// The body a tileset's content is on: what `3DTILES_ellipsoid` declares, and
// how that, the `body` option and the anchor settle one body (plan 5c's calls
// 1 and 2). Core: it knows no CRS and imports nothing from the entry points
// above it.
import { EARTH, MOON, type Body } from "../scene/Body.ts";

const EXTENSION = "3DTILES_ellipsoid";
const PATH = `extensions.${EXTENSION}`;
/** How far a declared radius may differ from a known body's, m per axis. */
const RADII_TOLERANCE = 0.01;
/** The longest `body` name read. */
const MAX_NAME = 256;

/**
 * A tileset's declared body is unreadable, names no known body, or disagrees
 * with where its content is placed. `path` names the JSON path or the
 * option, `reason` the problem.
 */
export class TilesetBodyError extends Error {
  readonly path: string;
  readonly reason: string;
  constructor(path: string, reason: string) {
    super(`${path}: ${reason}`);
    this.name = "TilesetBodyError";
    this.path = path;
    this.reason = reason;
  }
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** What was found, without echoing untrusted text at length. */
function shown(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.length > 32
      ? `a string of ${value.length} characters`
      : JSON.stringify(value);
  }
  if (value === null) {
    return "null";
  }
  return Array.isArray(value) ? "an array" : typeof value;
}

/**
 * The body `3DTILES_ellipsoid` in a tileset's `extensions` declares: the
 * one of `bodies` (default the Earth and the Moon) whose radii it has,
 * within 0.01 m per axis, and which its `body`, if given, names (case
 * aside). Null for `body: "none"` (no body). Undefined without the
 * extension. Other radii, or a `body` naming another body, throw a
 * `TilesetBodyError` naming the field.
 */
export function tilesetBody(
  extensions: unknown,
  bodies: readonly Body[] = [EARTH, MOON],
): Body | null | undefined {
  if (!isObject(extensions) || extensions[EXTENSION] === undefined) {
    return undefined;
  }
  const value = extensions[EXTENSION];
  if (!isObject(value)) {
    throw new TilesetBodyError(PATH, `must be an object (got ${shown(value)})`);
  }
  let named: string | undefined;
  if (value.body !== undefined) {
    const text = value.body;
    if (typeof text !== "string" || text.length === 0) {
      throw new TilesetBodyError(
        `${PATH}.body`,
        `must be a non-empty string (got ${shown(text)})`,
      );
    }
    if (text.length > MAX_NAME) {
      throw new TilesetBodyError(
        `${PATH}.body`,
        `is ${text.length} characters; at most ${MAX_NAME} are read`,
      );
    }
    named = text;
  }
  if (named?.toLowerCase() === "none") {
    return null;
  }
  const radii = value.radii;
  if (!Array.isArray(radii)) {
    throw new TilesetBodyError(
      `${PATH}.radii`,
      `must be an array (got ${shown(radii)})`,
    );
  }
  if (radii.length !== 3) {
    throw new TilesetBodyError(
      `${PATH}.radii`,
      `must hold 3 numbers (got ${radii.length})`,
    );
  }
  const numbers = radii.map((x, i) => {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      throw new TilesetBodyError(
        `${PATH}.radii[${i}]`,
        `must be a finite number (got ${shown(x)})`,
      );
    }
    return x;
  });
  const body = bodies.find((b) =>
    numbers.every(
      (r, i) => Math.abs(r - b.ellipsoid.radii[i]!) <= RADII_TOLERANCE,
    ),
  );
  if (body === undefined) {
    throw new TilesetBodyError(
      `${PATH}.radii`,
      `[${numbers.join(", ")}] m are neither the Earth's (WGS 84) nor the Moon's radii within ${RADII_TOLERANCE} m; only those bodies are placed`,
    );
  }
  if (named !== undefined && named.toLowerCase() !== body.name.toLowerCase()) {
    throw new TilesetBodyError(
      `${PATH}.body`,
      `names ${shown(named)}, but its radii are the ${body.name}'s`,
    );
  }
  return body;
}

/** One place a tileset's body can come from, for `resolveTilesetBody`. */
interface BodySource {
  readonly name: string;
  readonly body: Body | null;
}

const label = (body: Body | null) => (body === null ? "no body" : body.name);

/**
 * The body of a tileset (plan 5c's call 1): `TilesetOptions.body` (null: no
 * body), else its `3DTILES_ellipsoid`, else its anchor's body, else the
 * Earth. Any two of these that are given and differ throw a
 * `TilesetBodyError` naming both. Null: the tileset has no body.
 */
export function resolveTilesetBody(sources: {
  /** `TilesetOptions.body`; undefined when not given. */
  readonly option?: Body | null | undefined;
  /** `tilesetBody`'s result for the tileset's own extensions. */
  readonly declared?: Body | null | undefined;
  /** The explicit `TilesetOptions.anchor`'s body, when it has one. */
  readonly anchor?: Body | undefined;
}): Body | null {
  const given: BodySource[] = [];
  if (sources.option !== undefined) {
    given.push({ name: "TilesetOptions.body", body: sources.option });
  }
  if (sources.declared !== undefined) {
    given.push({ name: EXTENSION, body: sources.declared });
  }
  if (sources.anchor !== undefined) {
    given.push({ name: "TilesetOptions.anchor", body: sources.anchor });
  }
  const first = given[0];
  if (first === undefined) {
    return EARTH;
  }
  for (const other of given.slice(1)) {
    if (other.body !== first.body) {
      throw new TilesetBodyError(
        other.name,
        `is on ${label(other.body)}, but ${first.name} says ${label(first.body)}`,
      );
    }
  }
  return first.body;
}
