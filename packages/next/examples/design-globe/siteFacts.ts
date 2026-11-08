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
import { errorText, rigidVerdict, type SiteEntry } from "./page.ts";
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
  };
  /**
   * The generator's answer for a ladder site (answers.json `sites`): its
   * extent and the rigid error at its farthest point, exact.
   */
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
  const view: SiteFrameView = {
    horizontal: parts?.horizontal.name ?? entry.codes,
    ...(parts?.vertical && { vertical: parts.vertical.name }),
    units: `${units.horizontalUnitName} (${symbol})`,
    accuracy,
    credits: frame.gridCredits,
    ...(fallback && { fallback }),
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
      cause: cause(input.answer?.terms),
      acceptable: verdict.acceptable,
      verdict: verdict.text,
    },
  };
}
