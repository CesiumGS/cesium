// The design globe's figures for the tour and the site details (plan 4b
// Task 20), read from the answers and the placements, kept out of main.ts:
//  - `tourFactsOf`: what the tour's sentences say (tour.ts `TourFacts`);
//  - `combinedFactorOf`: the combined factor at a site's rigid anchor.
import type { Alignment } from "../../src/engineering/alignment.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import type { Answers } from "./answers.ts";
import { ANCHOR_STATION } from "./corridor.ts";
import { unitSymbol } from "./measureModel.ts";
import type { SiteRuntime } from "./siteLoader.ts";
import { TOUR_LADDER, type TourFacts } from "./tour.ts";

/** What the tour's sentences read: the answers and the corridor's placements. */
export function tourFactsOf(
  answers: Answers | undefined,
  corridor: SiteRuntime,
): TourFacts {
  const rigid = corridor.rigidPlacement;
  const pair = answers?.pairs[0];
  const ends =
    pair && answers
      ? [answers.points[pair.from], answers.points[pair.to]]
      : undefined;
  const drawn =
    rigid && ends?.[0] && ends[1]
      ? (() => {
          const a = rigid.displayed(ends[0].design);
          const b = rigid.displayed(ends[1].design);
          return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
        })()
      : undefined;
  return {
    codes: corridor.entry.codes,
    ladder: new Map(
      TOUR_LADDER.flatMap((s) => {
        const a = answers?.sites[s.site];
        return a ? [[s.site, { error: a.displayError, extent: a.extent }]] : [];
      }),
    ),
    ...(answers && {
      markerSeparation: answers.marker.separation,
      mark: {
        pid: answers.mark.pid,
        name: answers.mark.name,
        ...(rigid && {
          rigidOffset: rigid.displayError(answers.mark.nearestDesign),
        }),
      },
    }),
    ...(pair &&
      answers && {
        pair: {
          horizontal: pair.horizontalDistance,
          symbol: unitSymbol(answers.frame.unitName),
          ...(drawn !== undefined && {
            rigidShort: pair.trueDistance - drawn,
          }),
        },
      }),
  };
}

/**
 * The combined factor at a site's rigid anchor: the answers' for a ladder
 * site; else PROJ's, at the corridor's anchor station or the model's middle
 * (none for a site grid, whose own scale `gridFactors` leaves out).
 */
export function combinedFactorOf(
  site: SiteRuntime,
  context: {
    readonly answers: Answers | undefined;
    readonly corridor: SiteRuntime;
    readonly alignment: Alignment;
  },
): { combinedFactor?: number } {
  const { answers, corridor, alignment } = context;
  const k = answers?.sites[site.entry.id]?.combinedFactor;
  if (k !== undefined) {
    return { combinedFactor: k };
  }
  const frame = (site.rigidPlacement ?? site.reprojectedPlacement)?.frame;
  const station = answers?.anchorStation ?? ANCHOR_STATION;
  const at = alignment.pointAt(station, 0);
  const anchor =
    site === corridor
      ? [at[0]!, at[1]!, alignment.elevationAt(station)]
      : site.entry.anchor;
  // A site grid's own scale isn't in the grid's factor: none is stated.
  if (
    frame === undefined ||
    anchor === undefined ||
    site.entry.frame.site !== undefined
  ) {
    return {};
  }
  try {
    return { combinedFactor: gridFactors(frame, anchor).combinedFactor };
  } catch {
    return {};
  }
}
