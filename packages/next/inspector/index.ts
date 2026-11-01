/**
 * The inspector (plan §16.9): an overlay for any engine view, kept out of
 * the engine core. `attachInspector(element, inspectEngine(engine, …))`
 * for 2.0; other engines implement `Inspectable`.
 */
export {
  attachCredits,
  type CreditSource,
  type CreditsHandle,
} from "./credits.ts";
export {
  attachInspector,
  type InspectorHandle,
  type InspectorOptions,
} from "./inspector.ts";
export {
  engineSnapshot,
  inspectEngine,
  type EngineInspectOptions,
  type EngineSnapshotOptions,
  type ModelLoad,
} from "./engine.ts";
export type {
  ContentMix,
  Inspectable,
  InspectorSnapshot,
  MemoryRow,
  PickInfo,
  StagePercentiles,
} from "./inspectable.ts";
