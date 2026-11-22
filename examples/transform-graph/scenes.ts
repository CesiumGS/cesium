import type { Scene } from "./scene.ts";
import { exaggeration } from "./scenes/exaggeration.ts";
import { bimSite } from "./scenes/bimSite.ts";
import { assembly } from "./scenes/assembly.ts";
import { lens } from "./scenes/lens.ts";
import { planProfile } from "./scenes/planProfile.ts";
import { seismic } from "./scenes/seismic.ts";
import { splitView } from "./scenes/split.ts";
import { subsidence } from "./scenes/subsidence.ts";

/** The scenes, in the order the picker lists them. */
export const SCENES: readonly Scene[] = [
  exaggeration,
  splitView,
  bimSite,
  planProfile,
  seismic,
  assembly,
  lens,
  subsidence,
];
