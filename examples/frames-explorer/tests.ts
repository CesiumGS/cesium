// The frames explorer's stress-test catalog (plan R2): pure cases that take the
// frame tree, PROJ and (optionally) Orion's trajectory and return plain
// results. The page runs them in a worker (R13); test/data/framesExplorer.test.ts
// runs the same catalog in Node against the frames data store and asserts that
// every case passes, so the page can never show a pass the data test doesn't.
//
// This file is the catalog's public entry: the runner and its types, the
// groups and the cases are in stress/, and everything a caller needs is
// re-exported here.
//
// Library names are imported from their modules, not the entry points, because
// those can't load under vitest (the core reaches the basis transcoder). Every
// name the catalog imports from src/ is also exported by an entry point
// (`@cesium/next`, `/time`, `/frames`, `/proj`, `/measure`; ruling F7, checked
// by test/framesExplorerRunner.test.ts), so the example stays a user of the
// public API.
//
// Results are structured-clone plain data: no class instances and no
// functions. Accuracy statements are plain objects; instants are TDB seconds
// past J2000.
import { axesAndTheAntimeridianCases } from "./stress/groups/axes-and-the-antimeridian.ts";
import { belowTheEllipsoidCases } from "./stress/groups/below-the-ellipsoid.ts";
import { boundCrssCases } from "./stress/groups/bound-crss.ts";
import { coordinateEpochCases } from "./stress/groups/coordinate-epoch.ts";
import { distortionCases } from "./stress/groups/distortion.ts";
import { frameTreeCases } from "./stress/groups/frame-tree.ts";
import { globalGeoidsCases } from "./stress/groups/global-geoids.ts";
import { heightsAndWgs84Cases } from "./stress/groups/heights-and-wgs84.ts";
import { ifcMapConversionCases } from "./stress/groups/ifc-map-conversion.ts";
import { lunarTimeCases } from "./stress/groups/lunar-time.ts";
import { measurementCases } from "./stress/groups/measurement.ts";
import { operationCandidatesCases } from "./stress/groups/operation-candidates.ts";
import { plateMotionCases } from "./stress/groups/plate-motion.ts";
import { projectionsCases } from "./stress/groups/projections.ts";
import { recordedOperationsCases } from "./stress/groups/recorded-operations.ts";
import { referenceValuesCases } from "./stress/groups/reference-values.ts";
import { rigidPlacementBudgetCases } from "./stress/groups/rigid-placement-budget.ts";
import { siteGridsCases } from "./stress/groups/site-grids.ts";
import { spaceCases } from "./stress/groups/space.ts";
import { tilesetPlacementCases } from "./stress/groups/tileset-placement.ts";
import { timeCases } from "./stress/groups/time.ts";
import { timeScalesCases } from "./stress/groups/time-scales.ts";
import { trajectoryCases } from "./stress/groups/trajectory.ts";
import { unitsCases } from "./stress/groups/units.ts";
import { verticalProfileCases } from "./stress/groups/vertical-profile.ts";
import {
  runCases,
  type DataContext,
  type RunOptions,
  type StressCase,
  type StressResult,
} from "./stress/runner.ts";

export {
  LENSES,
  compareFingerprint,
  defaultTrace,
  expectThrow,
  formatEffect,
  isNeedMissing,
  NeedMissingError,
  withDefaults,
  type CatalogGridSet,
  type Citation,
  type Comparison,
  type DataContext,
  type Fingerprint,
  type Lens,
  type Need,
  type RunOptions,
  type StoreManifest,
  type StressCase,
  type StressContext,
  type StressGroup,
  type StressResult,
  type TraceStep,
} from "./stress/runner.ts";
export { GROUP_INFO, groupInfo, type GroupInfo } from "./stress/groupInfo.ts";
export { citation, cited, collectCitations } from "./stress/references.ts";
export { STRESS_GROUPS, groupResults } from "./stress/stressGroups.ts";
export { ORION_OEM, STATIONS_SPK, orionFromOem } from "./stress/shared.ts";
export {
  boundCrsChecks,
  type BoundCheckOptions,
} from "./stress/groups/bound-crss.ts";
export {
  siteFromIfcMapConversion,
  type IfcMapConversion,
} from "./stress/groups/ifc-map-conversion.ts";
export {
  geocentricToGeodetic,
  geodeticToGeocentric,
  helmert,
  inverseHelmert,
  reversedHelmert,
  type HelmertOptions,
  type HelmertParameters,
  type RotationConvention,
} from "./stress/geodesy.ts";

/**
 * Every case, in the order the Verify tab lists them, group by group. The
 * catalog grids the global geoids load stay in the run's PROJ, so a second
 * run sees them whatever the order; the results don't depend on it, because
 * no other case's operation depends on those grids (bound-crss's registry
 * check pins the gridless one), and a data test runs the catalog reversed
 * and compares. The global geoids come last only as a second guard.
 */
export const STRESS_CASES: readonly StressCase[] = [
  ...projectionsCases,
  ...unitsCases,
  ...siteGridsCases,
  ...recordedOperationsCases,
  ...frameTreeCases,
  ...timeCases,
  ...trajectoryCases,
  ...measurementCases,
  ...referenceValuesCases,
  ...verticalProfileCases,
  ...distortionCases,
  ...rigidPlacementBudgetCases,
  ...coordinateEpochCases,
  ...axesAndTheAntimeridianCases,
  ...spaceCases,
  ...operationCandidatesCases,
  ...ifcMapConversionCases,
  ...plateMotionCases,
  ...belowTheEllipsoidCases,
  ...heightsAndWgs84Cases,
  ...boundCrssCases,
  ...timeScalesCases,
  ...lunarTimeCases,
  ...tilesetPlacementCases,
  // Last, as a second guard: its grids stay loaded in the run's PROJ.
  ...globalGeoidsCases,
];

/**
 * Runs the catalog's cases (or `options.cases`) in order and judges each
 * result: the case's own verdict, its value against its tolerance, its
 * expected error (R7) and its fingerprint (R12). A case whose needs can't be
 * met gives one skipped result (pass false, `missing`, and a `detail` saying
 * what to do); a case that throws gives a failed result with the error. It
 * never rejects for a case.
 */
export function runStress(
  ctx: DataContext,
  options: RunOptions = {},
): Promise<StressResult[]> {
  return runCases(ctx, options.cases ?? STRESS_CASES, options);
}
