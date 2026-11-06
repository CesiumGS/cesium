// Site grids: rotations and scales on California zone 3.
import {
  EngineeringFrame,
  type SiteTransform,
} from "../../../../src/engineering/EngineeringFrame.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import {
  CALIFORNIA,
  type StressCase,
  type StressResult,
  fmt,
} from "../runner.ts";
import {
  DESIGN_ROUND_TRIP,
  SITE_ORIGIN,
  proj,
  stressCase,
  worstRoundTrip,
} from "../shared.ts";

const SITE_DESIGNS: readonly (readonly number[])[] = [
  [0, 0, 0],
  [1000, 800, 35],
  [-5000, 12_000, 100],
  [30_000, -20_000, 0],
];

const siteGridsCase = stressCase(
  "site-grids.round-trip",
  "site-grids",
  "Site grids on California zone 3, rotated 0°, 12.5°, 90° and −135° and scaled 1, 1.0000375 and 0.99996: each lands at the site formula's grid point and round-trips within 1e-4 m",
  ["proj", "geoid"],
  async (ctx, base) => {
    const results: StressResult[] = [];
    for (const degrees of [0, 12.5, 90, -135]) {
      for (const scale of [1, 1.0000375, 0.99996]) {
        const rotation = (degrees * Math.PI) / 180;
        const site: SiteTransform = { origin: SITE_ORIGIN, rotation, scale };
        const frame = EngineeringFrame.create(
          { name: "Site", body: EARTH, crs: CALIFORNIA, site },
          proj(ctx),
        );
        // The documented site formula, written out: [E, N] = [E0, N0] +
        // s R(θ) [e, n] with θ counterclockwise from grid east; U = U0 + u.
        let formula = 0;
        for (const [e, n, u] of SITE_DESIGNS) {
          const E =
            SITE_ORIGIN[0] +
            scale * (Math.cos(rotation) * e! - Math.sin(rotation) * n!);
          const N =
            SITE_ORIGIN[1] +
            scale * (Math.sin(rotation) * e! + Math.cos(rotation) * n!);
          const p = frame.projected([e!, n!, u!]);
          formula = Math.max(
            formula,
            Math.hypot(p[0]! - E, p[1]! - N, p[2]! - (SITE_ORIGIN[2] + u!)),
          );
        }
        const worst = worstRoundTrip(frame, SITE_DESIGNS);
        const formulaRight = formula * frame.units.metersPerUnit < 1e-9;
        results.push({
          ...base,
          id: `${base.id}.rotation-${degrees}.scale-${scale}`,
          title: `Site grid rotated ${degrees}° and scaled ${scale}: lands at the site formula's grid point (within 1e-9 m) and round-trips within 1e-4 m`,
          pass: formulaRight,
          value: worst,
          tolerance: DESIGN_ROUND_TRIP,
          unit: "m",
          detail: `site formula off by ${fmt(formula * frame.units.metersPerUnit)} m`,
        });
      }
    }
    return results;
  },
);

export const siteGridsCases: readonly StressCase[] = [siteGridsCase];
