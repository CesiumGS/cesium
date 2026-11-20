// The profile layer's shared types: plain data, nothing here runs on a GPU.
// Everything a resolver returns survives `structuredClone` (worker mode).
import type { DeviceFacts } from "../gpu/GpuDevice.ts";

/** How much a feature matters to the look. */
export type Importance = "essential" | "preferred" | "extra";

/** A step's name: a word, or a number (`resolution`'s scales). */
export type Step = string | number;

/** What one resolve is for, besides the device: the view's size and the camera's height. */
export interface Context {
  /** Pixels in the view's backing store. */
  pixels: number;
  /** The camera's altitude above the ellipsoid, in kilometers. */
  altitudeKm: number;
}

/** The fact paths a predicate may read. */
export type FactPath =
  | "renderer"
  | "limitsTier"
  | "canvasFormat"
  | "adapter.vendor"
  | "adapter.architecture"
  | "adapter.isFallbackAdapter"
  | "probes.storageWritesRunPerSample"
  | "context.pixels"
  | "context.altitudeKm";

export type Scalar = string | number | boolean;

/**
 * A tiny typed language over facts and context, so rules can be listed,
 * checked for reachability, shown in the inspector and serialized.
 * `above` and `below` are strict.
 */
export type Predicate =
  | { readonly equals: readonly [FactPath, Scalar] }
  | { readonly in: readonly [FactPath, readonly Scalar[]] }
  | { readonly includes: readonly [FactPath, string] }
  | { readonly above: readonly [FactPath, number] }
  | { readonly below: readonly [FactPath, number] }
  | { readonly has: GPUFeatureName }
  | { readonly all: readonly Predicate[] }
  | { readonly any: readonly Predicate[] }
  | { readonly not: Predicate };

/** What a predicate is evaluated over. Support rules have no context. */
export interface Subject {
  facts: DeviceFacts;
  context?: Context;
}

export type StepKind = "runtime" | "compile";

/** One feature: all of it data (docs/superpowers/plans/2026-11-13-engine-profiles.md, section 2). */
export interface FeatureEntry {
  readonly scope: "engine" | "view";
  /** Best first. `off` is implicit and last. A `rank` rule may reorder them by context. */
  readonly steps: readonly Step[];
  /** The engine's one default look for this feature. */
  readonly defaultLook: boolean | Step;
  readonly importance: Importance;
  /** Accuracy features never step for cost. */
  readonly class: "appearance" | "accuracy";
  /** Compile steps count against the variant budget. Keyed by `String(step)`. */
  readonly stepKind: Readonly<Record<string, StepKind>>;
  /** What is given when no step is supported. */
  readonly fallback: Step | "off";
  /** What the feature promises, in one sentence. */
  readonly doc: string;
}

export type Catalog = Readonly<Record<string, FeatureEntry>>;

interface RuleBase {
  /** `<feature>.<name>`. */
  readonly id: string;
  readonly feature: string;
  /** Why, in a sentence, shown in explain trails and the inspector. */
  readonly reason: string;
}

/** A step needs facts: it is unsupported where `needs` doesn't hold. Facts only, no context. */
export interface SupportRule extends RuleBase {
  readonly kind: "requires";
  readonly step: Step;
  readonly needs: Predicate;
}

/** Where `when` holds, `auto` gives no step better than `cap`. Never touches accuracy features. */
export interface CostRule extends RuleBase {
  readonly kind: "cost";
  readonly when: Predicate;
  readonly cap: Step | "off";
  /** Measured on which devices, or estimated. */
  readonly provenance: string;
}

/** Where `when` holds, a resource forces no step better than `cap`, under any fidelity. */
export interface LimitRule extends RuleBase {
  readonly kind: "limit";
  readonly when: Predicate;
  readonly cap: Step | "off";
  /** The effect on accuracy, for an accuracy-class feature. */
  readonly accuracy?: string;
}

/** Where `when` holds, these steps are offered, in this order, best first. */
export interface RankRule extends RuleBase {
  readonly kind: "rank";
  readonly when: Predicate;
  readonly order: readonly Step[];
}

export type Rule = SupportRule | CostRule | LimitRule | RankRule;

export type Fidelity = "auto" | "fixed";

/** The app's look: each feature `false`, `true` (the engine picks) or a named step (pinned). */
export interface Look {
  /** Per-feature importance overrides. */
  readonly importance?: Readonly<Record<string, Importance>>;
  readonly [feature: string]:
    boolean | Step | Readonly<Record<string, Importance>> | undefined;
}

export interface Reason {
  rule: string;
  layer: "catalog" | "support" | "cost" | "limit" | "engine" | "view";
  text: string;
  provenance?: string;
  /** Whether the rule decided the outcome (false: it matched but another won). */
  applied: boolean;
}

export interface EffectiveFeature {
  asked: Step | boolean;
  given: Step | "off";
  importance: Importance;
  scope: "engine" | "view";
  because: readonly Reason[];
}

export interface Notice {
  kind: "stepped" | "dropped" | "unmet" | "unsupported" | "limited";
  feature: string;
  asked: string;
  given: string;
  rule: string;
  reason: string;
  accuracy?: string;
}

export interface EffectiveSettings {
  fidelity: Fidelity;
  features: Record<string, EffectiveFeature>;
  notices: Notice[];
}

/** What this view can do, in scene terms. */
export interface SupportReport {
  renderer: DeviceFacts["renderer"];
  content: {
    /** Every renderer draws these. */
    required: readonly string[];
    /** Declared, and not always there. */
    optional: Readonly<Record<string, boolean>>;
  };
  /** The steps each feature offers on this device, best first, before any context. */
  features: Readonly<Record<string, readonly Step[]>>;
  outputs: readonly string[];
  queries: readonly { kind: string; backend: string }[];
  updates: "each-tick" | "progressive";
  /** The paths chosen and why (src/profile/paths.ts): diagnostic strings, unstable. */
  paths: readonly string[];
}
