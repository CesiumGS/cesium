// A site's facts for the panel (plan 4b Task 18), once its placements are
// in: "every country, done right" (its CRS, height system and units as PROJ
// resolves them, the operation's stated accuracy, the grids' credits) and
// one line of the story (its extent, the rigid error at its edge, and
// whether rigid will do there). Given PROJ, a function of the site alone.
import type { Alignment } from "../../src/engineering/alignment.ts";
import { compoundParts, crsUnits } from "../../src/engineering/crs.ts";
import type { TilesetPlacement } from "../../src/engineering/placement.ts";
import type { ProjApi } from "../../src/engineering/proj.ts";
import { fixed, unitSymbol } from "./measureModel.ts";
import {
  errorText,
  rigidVerdict,
  siteGridText,
  type SiteEntry,
} from "./page.ts";
import type { SiteFrameView, SiteStory } from "./panel/model.ts";

export interface SiteFactsInput {
  readonly entry: SiteEntry;
  readonly rigid?: TilesetPlacement;
  readonly reprojected?: TilesetPlacement;
  readonly api: ProjApi;
  /**
   * For a site measured along an alignment (the corridor): the rigid
   * errors along it, and the alignment, whose length is the extent.
   */
  readonly along?: {
    readonly alignment: Alignment;
    readonly errors: readonly number[];
    /** The error's parts at the far end, metres (`rigidErrorTerms`). */
    readonly terms?: ErrorTerms;
  };
  /**
   * The generator's answer for a ladder site (answers.json `sites`): its
   * extent and the rigid error at its farthest point, exact.
   */
  /**
   * The combined factor k at the rigid anchor (grid distance = ground
   * distance × k): answers.json's for a ladder site, PROJ's for the corridor.
   */
  readonly combinedFactor?: number;
  readonly answer?: {
    readonly extent: number;
    readonly displayError: number;
    /** The error's parts there, metres (answers.ts `AnswerSite.terms`). */
    readonly terms?: {
      readonly curvature: number;
      readonly scale: number;
      readonly geoid: number;
    };
  };
}

/** A rigid error's three parts, metres (answers.ts `AnswerSite.terms`). */
export interface ErrorTerms {
  readonly curvature: number;
  readonly scale: number;
  readonly geoid: number;
}

/** "curvature 17.9 m, the scale factor 1.2 m, the geoid's rise −410 mm". */
export function partsText(t: ErrorTerms): string {
  const signed = (m: number) => `${m < 0 ? "\u2212" : ""}${errorText(m)}`;
  return `curvature ${errorText(t.curvature)}, the scale factor ${errorText(t.scale)}, the geoid's rise ${signed(t.geoid)}`;
}

/**
 * The parts of a rigid placement's error at a design point, metres, as the
 * generator finds them (scripts/designTiles.mjs `rigidErrorTerms`): the
 * curvature d²/2R (R the Gaussian radius √(MN) at the anchor), the scale
 * d·|1 − 1/k| (`k` the combined factor at the anchor) and the geoid's rise
 * from the anchor (the change in ellipsoidal height less the change in
 * design height).
 */
export function rigidErrorTerms(
  frame: {
    readonly units: { readonly metersPerUnit: number };
    readonly metersPerHeightUnit: number;
    readonly body: {
      readonly ellipsoid: { readonly radii: ArrayLike<number> };
    };
    toGeodetic(design: ArrayLike<number>): {
      readonly latitude: number;
      readonly height: number;
    };
  },
  anchor: ArrayLike<number>,
  point: ArrayLike<number>,
  k: number,
): ErrorTerms {
  const d =
    Math.hypot(point[0]! - anchor[0]!, point[1]! - anchor[1]!) *
    frame.units.metersPerUnit;
  const from = frame.toGeodetic(anchor);
  const to = frame.toGeodetic(point);
  const a = frame.body.ellipsoid.radii[0]!;
  const c = frame.body.ellipsoid.radii[2]!;
  const e2 = 1 - (c * c) / (a * a);
  const w = Math.sqrt(1 - e2 * Math.sin(from.latitude) ** 2);
  const radius = Math.sqrt(((a * (1 - e2)) / w ** 3) * (a / w));
  return {
    curvature: (d * d) / (2 * radius),
    scale: d * Math.abs(1 - 1 / k),
    geoid:
      to.height -
      from.height -
      (point[2]! - anchor[2]!) * frame.metersPerHeightUnit,
  };
}

/**
 * What the rigid error at the edge mostly is, from its parts: ", mostly the
 * scale factor rigid ignores". Empty without parts.
 */
export function cause(
  terms: { curvature: number; scale: number; geoid: number } | undefined,
): string {
  if (terms === undefined) {
    return "";
  }
  const parts: [number, string][] = [
    [Math.abs(terms.curvature), "the Earth's curvature"],
    [Math.abs(terms.scale), "the scale factor rigid ignores"],
    [Math.abs(terms.geoid), "the geoid's rise from the anchor"],
  ];
  const [size, name] = parts.reduce((a, b) => (b[0] > a[0] ? b : a));
  return size > 0 ? `, mostly ${name}` : "";
}

/**
 * "0.99989106 at the anchor (−108.9 ppm): ground distances are 108.9 ppm
 * longer than the grid's; rigid ignores it, taking grid distances as ground ones."
 */
export function scaleText(k: number): string {
  const ppm = (k - 1) * 1e6;
  const size = fixed(Math.abs(ppm), 1);
  const relation =
    fixed(ppm, 1) === fixed(0, 1)
      ? "ground and grid distances agree to 0.1 ppm"
      : `ground distances are ${size} ppm ${ppm < 0 ? "longer" : "shorter"} than the grid's`;
  return `${k.toFixed(8)} at the anchor (${fixed(ppm, 1)} ppm): ${relation}; rigid ignores it, taking grid distances as ground ones.`;
}

/** The site's frame and story; no story where its rigid error can't be found. */
export function siteFacts(input: SiteFactsInput): {
  readonly frame: SiteFrameView;
  readonly story?: SiteStory;
} {
  const { entry, api } = input;
  const placement = input.rigid ?? input.reprojected;
  if (placement === undefined) {
    throw new Error(`siteFacts: ${entry.id} has no placement`);
  }
  const frame = placement.frame;
  const units = crsUnits(api, entry.crs);
  const parts = compoundParts(api, entry.crs);
  const symbol = unitSymbol(units.horizontalUnitName);
  const accuracy =
    frame.operation.accuracy !== undefined
      ? `±${fixed(frame.operation.accuracy, 3)} m, as PROJ states the operation`
      : "PROJ states no accuracy for this operation";
  const fallback =
    frame.fallback !== undefined
      ? `${frame.fallback.model} fallback: design heights are read as ${frame.fallback.model} heights; ${frame.fallback.sigma !== undefined ? `±${frame.fallback.sigma} m` : "its offset from the real height system is not stated"}`
      : undefined;

  let edge: number | undefined;
  let extent = entry.extent;
  const rigid = input.rigid;
  if (input.answer !== undefined) {
    edge = input.answer.displayError;
    extent = input.answer.extent;
  } else if (input.along !== undefined) {
    edge = Math.max(...input.along.errors);
    // Along the alignment, not across: a highway's extent is its length.
    extent = input.along.alignment.length * frame.units.metersPerUnit;
  } else if (rigid !== undefined && entry.corners) {
    edge = Math.max(...entry.corners.map((c) => rigid.displayError(c)));
    const shown = entry.corners.map((c) => rigid.displayed(c));
    extent = Math.max(
      ...shown.flatMap((a) =>
        shown.map((b) =>
          Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!),
        ),
      ),
    );
  }
  const terms = input.answer?.terms ?? input.along?.terms;
  const view: SiteFrameView = {
    horizontal: parts?.horizontal.name ?? entry.codes,
    ...(parts?.vertical && { vertical: parts.vertical.name }),
    units: `${units.horizontalUnitName} (${symbol})`,
    accuracy,
    credits: frame.gridCredits,
    ...(fallback && { fallback }),
    ...(input.combinedFactor !== undefined &&
      Number.isFinite(input.combinedFactor) && {
        scale: scaleText(input.combinedFactor),
      }),
    ...(entry.frame.site !== undefined && {
      siteGrid: siteGridText(entry.frame.site, symbol),
    }),
    ...(terms !== undefined && { parts: partsText(terms) }),
  };
  if (edge === undefined) {
    return { frame: view };
  }
  const verdict = rigidVerdict(edge);
  return {
    frame: view,
    story: {
      extent: `${
        extent >= 1000
          ? `${fixed(extent / 1000, 1)} km`
          : `${fixed(extent, 0)} m`
      } ${input.along !== undefined ? "long" : "across"}`,
      edgeError: errorText(edge),
      cause: cause(terms),
      acceptable: verdict.acceptable,
      verdict: verdict.text,
    },
  };
}
