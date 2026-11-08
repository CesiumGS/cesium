// The design globe's figures for the tour and the site details (plan 4b
// Task 20), read from the answers and the placements, kept out of main.ts:
//  - `tourFactsOf`: what the tour's sentences say (tour.ts `TourFacts`);
//  - `combinedFactorOf`: the combined factor at a site's rigid anchor.
import type { Alignment } from "../../src/engineering/alignment.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import type { Answers } from "./answers.ts";
import type { SagSample } from "./overlays.ts";
import { rigidErrorTerms, type ErrorTerms } from "./siteFacts.ts";
import { ANCHOR_STATION, CORRIDOR_ALIGNMENT, STRUCTURES } from "./corridor.ts";
import { unitSymbol } from "./measureModel.ts";
import { rulerEnd } from "./measureOpeners.ts";
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
  const length = CORRIDOR_ALIGNMENT.horizontal.reduce(
    (sum, e) => sum + e.length,
    0,
  );
  return {
    codes: corridor.entry.codes,
    structures: {
      tunnels: STRUCTURES.filter((s) => s.kind === "tunnel").length,
      viaducts: STRUCTURES.filter((s) => s.kind === "viaduct").length,
      share:
        STRUCTURES.reduce((sum, s) => sum + s.toStation - s.fromStation, 0) /
        length,
    },
    ladder: new Map(
      TOUR_LADDER.flatMap((s) => {
        const a = answers?.sites[s.site];
        return a
          ? [
              [
                s.site,
                {
                  error: a.displayError,
                  extent: a.extent,
                  terms: a.terms,
                  combinedFactor: a.combinedFactor,
                },
              ],
            ]
          : [];
      }),
    ),
    ...(answers && {
      markerSeparation: answers.marker.separation,
      markerStation: answers.marker.station,
      ...(answers.points[answers.marker.point] !== undefined && {
        markerKm:
          answers.points[answers.marker.point]!.distanceFromAnchor / 1000,
      }),
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
          ruler: rulerEnd(
            {
              design: pair.designDistance,
              horizontal: pair.horizontalDistance,
              trueDistance: pair.trueDistance,
            },
            answers.frame.metersPerUnit,
            unitSymbol(answers.frame.unitName),
          ),
          ...(drawn !== undefined && {
            rigidShort: pair.trueDistance - drawn,
          }),
          ...(rigid &&
            ends?.[0] &&
            ends[1] && {
              rigidOffset:
                (rigid.displayError(ends[0].design) +
                  rigid.displayError(ends[1].design)) /
                2,
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

/**
 * The corridor's rigid error in its parts at its worst sample (the far
 * end), as the generator gives the ladder sites' (siteFacts.ts
 * `rigidErrorTerms`), for its story's cause and its details (Task 20 fix 1,
 * I11).
 */
export function corridorTerms(
  site: SiteRuntime,
  samples: readonly SagSample[],
  context: {
    readonly answers: Answers | undefined;
    readonly corridor: SiteRuntime;
    readonly alignment: Alignment;
  },
): { terms?: ErrorTerms } {
  const { answers, alignment } = context;
  const frame = site.reprojectedPlacement?.frame;
  const k = combinedFactorOf(site, context).combinedFactor;
  if (frame === undefined || k === undefined || samples.length === 0) {
    return {};
  }
  const far = samples.reduce((a, b) => (b.error > a.error ? b : a));
  const station = answers?.anchorStation ?? ANCHOR_STATION;
  const at = alignment.pointAt(station, 0);
  const anchor = [at[0]!, at[1]!, alignment.elevationAt(station)];
  // The far sample's point at the profile, as the anchor's.
  const point = [
    far.design[0]!,
    far.design[1]!,
    alignment.elevationAt(far.station),
  ];
  try {
    return { terms: rigidErrorTerms(frame, anchor, point, k) };
  } catch {
    return {};
  }
}
