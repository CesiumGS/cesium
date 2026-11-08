import type { PortfolioSite } from "../../examples/design-globe/sites.ts";

/** How far a pole is set into the ground, metres. */
export const POLE_EMBED: number;
/**
 * The pole line's route and poles ([e, n], design units, absolute), and the
 * indices of the route's corners' poles.
 */
export function poleLinePoles(site: PortfolioSite): {
  route: [number, number][];
  poles: [number, number][];
  corners: number[];
};
