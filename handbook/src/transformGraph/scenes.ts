import { EXAGGERATION, CAMERA_PLACE, NESTED_UTM } from "./scenesEarth.ts";
import { PLAN_PROFILE, SEISMIC } from "./scenesCivil.ts";
import { EXPLODED, LENS } from "./scenesOther.ts";
import type { SceneDef } from "./model.ts";

export const SCENES: SceneDef[] = [
  EXAGGERATION,
  CAMERA_PLACE,
  NESTED_UTM,
  PLAN_PROFILE,
  SEISMIC,
  EXPLODED,
  LENS,
];
