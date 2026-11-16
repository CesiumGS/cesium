// Rules are data: typed literals with no functions. The first ones describe
// today's behavior and name where it lives, so each can be checked against it.
import type { Rule } from "./types.ts";

const GLARE_PROVENANCE = "measured on M2; Intel and the rest estimated";

export const RULES = [
  // Glare (`glareTier()` in src/render/post/glare.ts).
  {
    id: "glare.fallbackAdapter",
    kind: "cost",
    feature: "glare",
    when: { equals: ["adapter.isFallbackAdapter", true] },
    cap: "off",
    reason: "this GPU is a software fallback",
    provenance: GLARE_PROVENANCE,
  },
  {
    id: "glare.intel.pixels",
    kind: "cost",
    feature: "glare",
    when: {
      all: [
        { includes: ["adapter.vendor", "intel"] },
        { above: ["context.pixels", 3_700_000] },
      ],
    },
    cap: "sources",
    reason: "an Intel GPU above 3.7 million pixels",
    provenance: GLARE_PROVENANCE,
  },
  {
    id: "glare.intel.start",
    kind: "cost",
    feature: "glare",
    when: { includes: ["adapter.vendor", "intel"] },
    cap: "reduced",
    reason: "an Intel GPU, which starts reduced until it is measured",
    provenance: GLARE_PROVENANCE,
  },
  {
    id: "glare.default.pixels",
    kind: "cost",
    feature: "glare",
    when: { above: ["context.pixels", 8_300_000] },
    cap: "reduced",
    reason: "more than 8.3 million pixels",
    provenance: GLARE_PROVENANCE,
  },

  // Translucency (`caps.float32Blendable` in src/scene/RenderContext.ts).
  {
    id: "translucency.moments32.blendable",
    kind: "requires",
    feature: "translucency",
    step: "moments32",
    needs: { has: "float32-blendable" },
    reason:
      "32-bit moments need float32-blendable; without it the moments are 16-bit (bias 6 × 10⁻⁴ instead of 5 × 10⁻⁶)",
  },

  // Ambient occlusion (`AO_MAX_PIXELS` in src/scene/RenderContext.ts).
  {
    id: "ambientOcclusion.maxPixels",
    kind: "limit",
    feature: "ambientOcclusion",
    when: { above: ["context.pixels", 4096 * 4096] },
    cap: "off",
    reason:
      "ambient occlusion is skipped above 4096 by 4096 pixels (to be checked as a resource limit or a cost)",
  },

  // Aerial perspective's method by altitude (`src/atmosphere/Sky.ts`:
  // MARCH_FROM 2 to MARCH_TO 5 km, SCREEN_HAZE_FROM 500 to SCREEN_HAZE_TO
  // 1000 km). The blend bands stay: a step changes which methods blend.
  {
    id: "aerialPerspective.rank.low",
    kind: "rank",
    feature: "aerialPerspective",
    when: { below: ["context.altitudeKm", 2] },
    order: ["volume"],
    reason:
      "below 2 km the precomputed volume is exact enough, and nothing is cheaper",
  },
  {
    id: "aerialPerspective.rank.march",
    kind: "rank",
    feature: "aerialPerspective",
    when: {
      all: [
        { not: { below: ["context.altitudeKm", 2] } },
        { below: ["context.altitudeKm", 500] },
      ],
    },
    order: ["march", "volume"],
    reason:
      "from 2 to 500 km the per-vertex march is exact; the volume is cheaper and bands at its row spacing",
  },
  {
    id: "aerialPerspective.rank.transition",
    kind: "rank",
    feature: "aerialPerspective",
    when: {
      all: [
        { not: { below: ["context.altitudeKm", 500] } },
        { below: ["context.altitudeKm", 1000] },
      ],
    },
    order: ["screen", "march", "volume"],
    reason:
      "from 500 to 1000 km the march blends into the screen grid; the volume bands",
  },
  {
    id: "aerialPerspective.rank.high",
    kind: "rank",
    feature: "aerialPerspective",
    when: { not: { below: ["context.altitudeKm", 1000] } },
    order: ["screen", "volume"],
    reason:
      "above 1000 km the screen grid is exact; the march is not offered, because it streaks at the day/night line, and the volume bands",
  },
] as const satisfies readonly Rule[];
