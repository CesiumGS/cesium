// The design globe's exact answers (plan 4b Task 17): the shape of
// `<store>/design-globe/answers.json`, which the generator
// (scripts/designTiles.mjs, Task 14) writes and checks with `parseAnswers`
// before it writes it, so the file and this type are one shape. The page
// reads it with `loadAnswers` and compares what it shows with it
// (checks.ts).
//
// Units: design values (`design`, stations, offsets, design distances) are
// in the corridor CRS's own units, US survey feet (`frame.unitName`),
// except a site's (`sites`), which are in that site's CRS's units;
// body-fixed positions and true distances are Earth-fixed metres; angles
// are radians; geodetic heights are metres above the ellipsoid.
//
// Erasable TypeScript only (no enums, no parameter properties): the Node
// generator imports this file directly.

/** A design point's place on the alignment. */
export interface AnswerStationOffset {
  readonly station: number;
  /** Positive to the right of the direction of travel. */
  readonly offset: number;
}

/** One answer point: a design point on the section's surface. */
export interface AnswerPoint extends AnswerStationOffset {
  /** Why the station is an answer ("every 4,000", "join (arc starts)", …). */
  readonly tags: readonly string[];
  /** 10 or 20: the whole station nearest that many km from the anchor. */
  readonly nearKm?: number;
  /** E, N and the NAVD88 height, design units. */
  readonly design: readonly [number, number, number];
  /** Where the point truly is, through the frame (Earth-fixed metres). */
  readonly bodyFixed: readonly [number, number, number];
  /** Where the rigid placement draws it (Earth-fixed metres). */
  readonly rigidDisplayed: readonly [number, number, number];
  /** |rigidDisplayed − bodyFixed|, metres. */
  readonly displayError: number;
  /** Radians, and metres above the ellipsoid. */
  readonly geodetic: {
    readonly longitude: number;
    readonly latitude: number;
    readonly height: number;
  };
  /** The grid scale factor times the elevation factor. */
  readonly combinedFactor: number;
  /** Grid convergence, radians. */
  readonly convergence: number;
  /** The horizontal design distance from the anchor, metres. */
  readonly distanceFromAnchor: number;
}

/** A pair of answer points and what `measure` gives between them. */
export interface AnswerPair {
  readonly id: string;
  readonly label: string;
  /** Indices into `points`. */
  readonly from: number;
  readonly to: number;
  /** 3D, design units (the height difference converted to them). */
  readonly designDistance: number;
  /** E and N alone, design units. */
  readonly horizontalDistance: number;
  /** The straight line between the true positions, metres. */
  readonly trueDistance: number;
  readonly ends: {
    readonly a: AnswerStationOffset;
    readonly b: AnswerStationOffset;
  };
}

/**
 * The opening self-check (owner, 2026-11-07): station 170,000 on the
 * centreline, where it truly is and where the rigid placement draws it.
 */
export interface AnswerMarker extends AnswerStationOffset {
  /** Index into `points`. */
  readonly point: number;
  readonly design: readonly [number, number, number];
  readonly bodyFixed: readonly [number, number, number];
  readonly rigidDisplayed: readonly [number, number, number];
  /**
   * |rigidDisplayed − bodyFixed|, metres: the headline, about 30.6 m at
   * station 170,000 (31.6 m is station 171,255, nearest 20 km from the anchor).
   */
  readonly separation: number;
}

/**
 * A real NGS survey mark near the corridor (owner, 2026-11-07), from its
 * datasheet, and its relation to the centreline.
 */
export interface AnswerMark {
  readonly pid: string;
  readonly name: string;
  readonly datasheetUrl: string;
  /** The datasheet's retrieval date, ISO 8601 (YYYY-MM-DD). */
  readonly retrieved: string;
  /**
   * NAD83(2011), as NGS publishes it: radians (converted exactly from the
   * published degrees, minutes and seconds) and the ellipsoid height in
   * metres.
   */
  readonly geodetic: {
    readonly longitude: number;
    readonly latitude: number;
    readonly ellipsoidHeight: number;
  };
  /** Zone 3, US survey feet, from the datasheet. */
  readonly publishedSpc: {
    readonly easting: number;
    readonly northing: number;
  };
  /** The datasheet's lines, verbatim, for the page's hover card. */
  readonly published: {
    readonly position: string;
    readonly ellipsoidHeight: string;
    readonly spc: string;
  };
  /**
   * The mark through the frame's own operation from its NAD83(2011)
   * position: PROJ's zone 3 E and N, and the NAVD88 height (GEOID18), in
   * design units.
   */
  readonly design: readonly [number, number, number];
  /**
   * Earth-fixed metres straight from the published position on the Earth's
   * ellipsoid, independent of the design's pipeline (NAD83(2011) taken as
   * the frame's operation takes it, equal to WGS 84).
   */
  readonly bodyFixed: readonly [number, number, number];
  /** The nearest centreline point's station, and the mark's offset from it. */
  readonly nearest: AnswerStationOffset;
  /** That centreline point (on the profile), design units. */
  readonly nearestDesign: readonly [number, number, number];
  /** Mark to that point, 3D, design units. */
  readonly designDistance: number;
  /** Mark to that point, E and N alone, design units (|offset|). */
  readonly horizontalDistance: number;
  /** `bodyFixed` to that point's true position, metres. */
  readonly trueDistance: number;
}

/** What the generator records about the corridor's frame. */
export interface AnswerFrame {
  readonly name: string;
  /** The design CRS's horizontal unit, as PROJ names it ("US survey foot"). */
  readonly unitName: string;
  readonly metersPerUnit: number;
  readonly metersPerHeightUnit: number;
  /** PROJ's name for the frame's operation, when it is one of its candidates. */
  readonly operation: string | null;
  /** That operation's stated accuracy, metres. */
  readonly operationAccuracy: number | null;
  readonly grids: readonly string[];
}

/** A design point of a portfolio site's model, where it is and where rigid draws it. */
export interface AnswerSitePoint {
  /** "Anchor", "Farthest point", or the model's landmark ("Pole 1's top"). */
  readonly label: string;
  /** In the site's CRS's units, easting first. */
  readonly design: readonly [number, number, number];
  /** Where the point truly is, through the site's frame (Earth-fixed metres). */
  readonly bodyFixed: readonly [number, number, number];
  /** Where the rigid placement at the anchor draws it (Earth-fixed metres). */
  readonly rigidDisplayed: readonly [number, number, number];
  /** |rigidDisplayed − bodyFixed|, metres. */
  readonly displayError: number;
  /** The horizontal design distance from the anchor, metres. */
  readonly distanceFromAnchor: number;
}

/**
 * A portfolio site's rung of the scale ladder (Task 17b): its model's size
 * and its rigid placement's error at its edge, with the parts of that error.
 */
export interface AnswerSite {
  readonly name: string;
  /** The model's kind ("airport", "poleLine", …). */
  readonly kind: string;
  /** The largest horizontal distance between two of the model's points, metres. */
  readonly extent: number;
  /** The rigid placement's anchor: the model's middle, design units. */
  readonly anchor: readonly [number, number, number];
  /** The rigid error at the model's point farthest from the anchor (`points[1]`), metres. */
  readonly displayError: number;
  /** That point's horizontal distance from the anchor, d, metres. */
  readonly distanceFromAnchor: number;
  /**
   * The rigid error's parts there, metres: the curvature (d²/2R, R the
   * Gaussian radius at the anchor), the scale (d·|1 − 1/k|, k the combined
   * factor at the anchor, which rigid ignores), and the geoid's rise from
   * the anchor to the point (rigid keeps the anchor's). The error is about
   * √((curvature − geoid)² + scale²).
   */
  readonly terms: {
    readonly curvature: number;
    readonly scale: number;
    readonly geoid: number;
  };
  /**
   * The combined factor k at the anchor (grid distance = ground distance ×
   * k), which rigid ignores: the scale term's cause ("mostly the 0.99991
   * scale factor rigid ignores").
   */
  readonly combinedFactor: number;
  /** The anchor, the farthest point and the model's landmark, in that order. */
  readonly points: readonly AnswerSitePoint[];
  /** Both placements' one tile tree: its tiles, levels, vertices (one placement's) and leaf error (metres). */
  readonly tiles: {
    readonly count: number;
    readonly levels: number;
    readonly vertices: number;
    readonly leafError: number;
  };
}

/** `<store>/design-globe/answers.json`. */
export interface Answers {
  readonly version: number;
  /** The instant `measure` ran at (UTC, ISO 8601). */
  readonly instant: string;
  /** The rigid placement's anchor, on the centreline. */
  readonly anchorStation: number;
  /** The alignment the stations are on. */
  readonly alignment: string;
  readonly frame: AnswerFrame;
  readonly notes: readonly string[];
  readonly points: readonly AnswerPoint[];
  readonly pairs: readonly AnswerPair[];
  readonly marker: AnswerMarker;
  readonly mark: AnswerMark;
  /** The scale ladder's seven sites by id (Task 17b). */
  readonly sites: Readonly<Record<string, AnswerSite>>;
}

/** The version this file reads: 2 since the scale ladder's `sites` (Task 17b). */
export const ANSWERS_VERSION = 2;

type Json = Record<string, unknown>;

/** Checks a JSON value as one shape; each throw names the path. */
class Reader {
  constructor(private readonly source: string) {}

  fail(path: string, what: string): never {
    throw new Error(`${this.source}: ${path} ${what}`);
  }

  object(value: unknown, path: string): Json {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      this.fail(path, "is not an object");
    }
    return value as Json;
  }

  number(value: unknown, path: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.fail(path, "is not a finite number");
    }
    return value;
  }

  string(value: unknown, path: string): string {
    if (typeof value !== "string") {
      this.fail(path, "is not a string");
    }
    return value;
  }

  array(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) {
      this.fail(path, "is not an array");
    }
    return value;
  }

  vec3(value: unknown, path: string): [number, number, number] {
    const a = this.array(value, path);
    if (a.length !== 3) {
      this.fail(path, "is not 3 numbers");
    }
    return [
      this.number(a[0], `${path}[0]`),
      this.number(a[1], `${path}[1]`),
      this.number(a[2], `${path}[2]`),
    ];
  }

  index(value: unknown, path: string, length: number): number {
    const i = this.number(value, path);
    if (!(Number.isInteger(i) && i >= 0 && i < length)) {
      this.fail(path, `is not an index into points (0 to ${length - 1})`);
    }
    return i;
  }

  stationOffset(value: unknown, path: string): AnswerStationOffset {
    const o = this.object(value, path);
    return {
      station: this.number(o.station, `${path}.station`),
      offset: this.number(o.offset, `${path}.offset`),
    };
  }
}

/**
 * Checks `json` as `Answers`: every field present with its type, every
 * number finite, every index in range and the version this file reads.
 * Throws an Error naming `source` and the path of the first field that
 * isn't. Returns the checked value, copied (unknown fields dropped).
 */
export function parseAnswers(json: unknown, source = "answers.json"): Answers {
  const r = new Reader(source);
  const root = r.object(json, "the file");
  const version = r.number(root.version, "version");
  if (version !== ANSWERS_VERSION) {
    r.fail("version", `is ${version}; this page reads ${ANSWERS_VERSION}`);
  }
  const f = r.object(root.frame, "frame");
  const nullable = <T>(value: unknown, read: () => T): T | null =>
    value === null ? null : read();
  const frame: AnswerFrame = {
    name: r.string(f.name, "frame.name"),
    unitName: r.string(f.unitName, "frame.unitName"),
    metersPerUnit: r.number(f.metersPerUnit, "frame.metersPerUnit"),
    metersPerHeightUnit: r.number(
      f.metersPerHeightUnit,
      "frame.metersPerHeightUnit",
    ),
    operation: nullable(f.operation, () =>
      r.string(f.operation, "frame.operation"),
    ),
    operationAccuracy: nullable(f.operationAccuracy, () =>
      r.number(f.operationAccuracy, "frame.operationAccuracy"),
    ),
    grids: r
      .array(f.grids, "frame.grids")
      .map((g, i) => r.string(g, `frame.grids[${i}]`)),
  };

  const points: AnswerPoint[] = r
    .array(root.points, "points")
    .map((value, i) => {
      const path = `points[${i}]`;
      const p = r.object(value, path);
      const g = r.object(p.geodetic, `${path}.geodetic`);
      return {
        station: r.number(p.station, `${path}.station`),
        offset: r.number(p.offset, `${path}.offset`),
        tags: r
          .array(p.tags, `${path}.tags`)
          .map((t, k) => r.string(t, `${path}.tags[${k}]`)),
        ...(p.nearKm !== undefined && {
          nearKm: r.number(p.nearKm, `${path}.nearKm`),
        }),
        design: r.vec3(p.design, `${path}.design`),
        bodyFixed: r.vec3(p.bodyFixed, `${path}.bodyFixed`),
        rigidDisplayed: r.vec3(p.rigidDisplayed, `${path}.rigidDisplayed`),
        displayError: r.number(p.displayError, `${path}.displayError`),
        geodetic: {
          longitude: r.number(g.longitude, `${path}.geodetic.longitude`),
          latitude: r.number(g.latitude, `${path}.geodetic.latitude`),
          height: r.number(g.height, `${path}.geodetic.height`),
        },
        combinedFactor: r.number(p.combinedFactor, `${path}.combinedFactor`),
        convergence: r.number(p.convergence, `${path}.convergence`),
        distanceFromAnchor: r.number(
          p.distanceFromAnchor,
          `${path}.distanceFromAnchor`,
        ),
      };
    });

  const pairs: AnswerPair[] = r.array(root.pairs, "pairs").map((value, i) => {
    const path = `pairs[${i}]`;
    const p = r.object(value, path);
    const ends = r.object(p.ends, `${path}.ends`);
    return {
      id: r.string(p.id, `${path}.id`),
      label: r.string(p.label, `${path}.label`),
      from: r.index(p.from, `${path}.from`, points.length),
      to: r.index(p.to, `${path}.to`, points.length),
      designDistance: r.number(p.designDistance, `${path}.designDistance`),
      horizontalDistance: r.number(
        p.horizontalDistance,
        `${path}.horizontalDistance`,
      ),
      trueDistance: r.number(p.trueDistance, `${path}.trueDistance`),
      ends: {
        a: r.stationOffset(ends.a, `${path}.ends.a`),
        b: r.stationOffset(ends.b, `${path}.ends.b`),
      },
    };
  });

  const k = r.object(root.marker, "marker");
  const marker: AnswerMarker = {
    station: r.number(k.station, "marker.station"),
    offset: r.number(k.offset, "marker.offset"),
    point: r.index(k.point, "marker.point", points.length),
    design: r.vec3(k.design, "marker.design"),
    bodyFixed: r.vec3(k.bodyFixed, "marker.bodyFixed"),
    rigidDisplayed: r.vec3(k.rigidDisplayed, "marker.rigidDisplayed"),
    separation: r.number(k.separation, "marker.separation"),
  };

  const m = r.object(root.mark, "mark");
  const mg = r.object(m.geodetic, "mark.geodetic");
  const spc = r.object(m.publishedSpc, "mark.publishedSpc");
  const published = r.object(m.published, "mark.published");
  const mark: AnswerMark = {
    pid: r.string(m.pid, "mark.pid"),
    name: r.string(m.name, "mark.name"),
    datasheetUrl: r.string(m.datasheetUrl, "mark.datasheetUrl"),
    retrieved: r.string(m.retrieved, "mark.retrieved"),
    geodetic: {
      longitude: r.number(mg.longitude, "mark.geodetic.longitude"),
      latitude: r.number(mg.latitude, "mark.geodetic.latitude"),
      ellipsoidHeight: r.number(
        mg.ellipsoidHeight,
        "mark.geodetic.ellipsoidHeight",
      ),
    },
    publishedSpc: {
      easting: r.number(spc.easting, "mark.publishedSpc.easting"),
      northing: r.number(spc.northing, "mark.publishedSpc.northing"),
    },
    published: {
      position: r.string(published.position, "mark.published.position"),
      ellipsoidHeight: r.string(
        published.ellipsoidHeight,
        "mark.published.ellipsoidHeight",
      ),
      spc: r.string(published.spc, "mark.published.spc"),
    },
    design: r.vec3(m.design, "mark.design"),
    bodyFixed: r.vec3(m.bodyFixed, "mark.bodyFixed"),
    nearest: r.stationOffset(m.nearest, "mark.nearest"),
    nearestDesign: r.vec3(m.nearestDesign, "mark.nearestDesign"),
    designDistance: r.number(m.designDistance, "mark.designDistance"),
    horizontalDistance: r.number(
      m.horizontalDistance,
      "mark.horizontalDistance",
    ),
    trueDistance: r.number(m.trueDistance, "mark.trueDistance"),
  };

  const siteEntries = Object.entries(r.object(root.sites, "sites"));
  if (siteEntries.length === 0) {
    r.fail("sites", "is empty");
  }
  const sites: Record<string, AnswerSite> = {};
  for (const [id, value] of siteEntries) {
    const path = `sites.${id}`;
    const o = r.object(value, path);
    const terms = r.object(o.terms, `${path}.terms`);
    const tiles = r.object(o.tiles, `${path}.tiles`);
    const sitePoints = r.array(o.points, `${path}.points`);
    if (sitePoints.length !== 3) {
      r.fail(
        `${path}.points`,
        "is not 3 points (the anchor, the farthest, the landmark)",
      );
    }
    sites[id] = {
      name: r.string(o.name, `${path}.name`),
      kind: r.string(o.kind, `${path}.kind`),
      extent: r.number(o.extent, `${path}.extent`),
      anchor: r.vec3(o.anchor, `${path}.anchor`),
      displayError: r.number(o.displayError, `${path}.displayError`),
      distanceFromAnchor: r.number(
        o.distanceFromAnchor,
        `${path}.distanceFromAnchor`,
      ),
      terms: {
        curvature: r.number(terms.curvature, `${path}.terms.curvature`),
        scale: r.number(terms.scale, `${path}.terms.scale`),
        geoid: r.number(terms.geoid, `${path}.terms.geoid`),
      },
      combinedFactor: r.number(o.combinedFactor, `${path}.combinedFactor`),
      points: sitePoints.map((pv, i) => {
        const pp = `${path}.points[${i}]`;
        const p = r.object(pv, pp);
        return {
          label: r.string(p.label, `${pp}.label`),
          design: r.vec3(p.design, `${pp}.design`),
          bodyFixed: r.vec3(p.bodyFixed, `${pp}.bodyFixed`),
          rigidDisplayed: r.vec3(p.rigidDisplayed, `${pp}.rigidDisplayed`),
          displayError: r.number(p.displayError, `${pp}.displayError`),
          distanceFromAnchor: r.number(
            p.distanceFromAnchor,
            `${pp}.distanceFromAnchor`,
          ),
        };
      }),
      tiles: {
        count: r.number(tiles.count, `${path}.tiles.count`),
        levels: r.number(tiles.levels, `${path}.tiles.levels`),
        vertices: r.number(tiles.vertices, `${path}.tiles.vertices`),
        leafError: r.number(tiles.leafError, `${path}.tiles.leafError`),
      },
    };
  }

  return {
    version,
    instant: r.string(root.instant, "instant"),
    anchorStation: r.number(root.anchorStation, "anchorStation"),
    alignment: r.string(root.alignment, "alignment"),
    frame,
    notes: r
      .array(root.notes, "notes")
      .map((n, i) => r.string(n, `notes[${i}]`)),
    points,
    pairs,
    marker,
    mark,
    sites,
  };
}

/**
 * Fetches and checks answers.json (`parseAnswers`). Throws, naming the URL,
 * when the request fails, the response isn't OK or JSON, or a field isn't
 * what `Answers` says; an abort rejects with the signal's reason.
 */
export async function loadAnswers(
  url: string,
  signal: AbortSignal,
): Promise<Answers> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    signal.throwIfAborted();
    throw new Error(`${url}: request failed`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(
      `${url}: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
    );
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    signal.throwIfAborted();
    throw new Error(`${url}: not JSON`, { cause: error });
  }
  return parseAnswers(json, url);
}
