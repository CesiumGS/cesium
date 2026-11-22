// What a view can do on this device, in scene terms: a pure function of the
// facts, so it can be replayed in tests. Its first shape: `paths` names the
// paths chosen (src/profile/paths.ts), and wiring (CS-23) refines outputs and
// queries.
import { describePaths, describeWebgl2Paths } from "./paths.ts";
import { unmetSupport, PROFILE_DATA, type ProfileData } from "./resolve.ts";
import type { Facts, Step, SupportReport } from "./types.ts";

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
  facts: Facts,
  data: ProfileData = PROFILE_DATA,
): SupportReport {
  const features: Record<string, readonly Step[]> = {};
  for (const [name, entry] of Object.entries(data.catalog)) {
    features[name] = entry.steps.filter(
      (step) => unmetSupport(name, step, facts, data).length === 0,
    );
  }
  if (facts.renderer === "webgl2") {
    // The renderer as built (CS-35): it clears, so no content kind, output
    // or query is offered yet. Each milestone that lands one adds it here.
    return {
      renderer: "webgl2",
      content: {
        required: REQUIRED_CONTENT,
        optional: Object.fromEntries(
          OPTIONAL_CONTENT.map((kind) => [kind, false]),
        ),
      },
      features,
      outputs: ["color"],
      queries: [],
      updates: "each-tick",
      paths: describeWebgl2Paths(facts),
    };
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
    paths: describePaths(facts),
  };
}
