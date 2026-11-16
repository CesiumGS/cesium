// What a view can do on this device, in scene terms: a pure function of the
// facts, so it can be replayed in tests. Its first shape; the paths milestone
// (CS-22) fills `paths`, and wiring (CS-23) refines outputs and queries.
import type { DeviceFacts } from "../gpu/GpuDevice.ts";
import { unmetSupport, PROFILE_DATA, type ProfileData } from "./resolve.ts";
import type { Step, SupportReport } from "./types.ts";

/** Every renderer draws these. */
export const REQUIRED_CONTENT = [
  "globe",
  "terrain",
  "imagery",
  "meshes",
] as const;

/** Declared per renderer, optional content. */
const OPTIONAL_CONTENT = [
  "vectors",
  "labels",
  "points",
  "splats",
  "brep",
  "advancedTranslucency",
] as const;

export function support(
  facts: DeviceFacts,
  data: ProfileData = PROFILE_DATA,
): SupportReport {
  if (facts.renderer !== "webgpu") {
    throw new Error(`no support rules for renderer ${String(facts.renderer)}`);
  }
  const features: Record<string, readonly Step[]> = {};
  for (const [name, entry] of Object.entries(data.catalog)) {
    features[name] = entry.steps.filter(
      (step) => unmetSupport(name, step, facts, data).length === 0,
    );
  }
  return {
    renderer: facts.renderer,
    content: {
      required: REQUIRED_CONTENT,
      optional: Object.fromEntries(
        OPTIONAL_CONTENT.map((kind) => [
          kind,
          // Advanced translucency is the exact lists.
          kind === "advancedTranslucency"
            ? (features["translucency"]?.includes("exact") ?? false)
            : true,
        ]),
      ),
    },
    features,
    outputs: ["color", "depth", "featureId"],
    queries: [{ kind: "pick", backend: "id-targets" }],
    updates: "each-tick",
    paths: [],
  };
}
