// The one pure resolver: the look, the device's facts and the context in,
// effective settings out, each value traced to the rules that decided it.
// It reads no GPU and keeps no state, so it runs in Node tests and on either
// thread.
import { CATALOG } from "./catalog.ts";
import { evaluate } from "./predicate.ts";
import { RULES } from "./rules.ts";
import type {
  Catalog,
  Facts,
  Context,
  CostRule,
  EffectiveFeature,
  EffectiveSettings,
  Fidelity,
  Importance,
  LimitRule,
  Look,
  Notice,
  RankRule,
  Reason,
  Rule,
  Step,
  Subject,
  SupportRule,
} from "./types.ts";

/** The data a resolve reads. The defaults are the engine's own. */
export interface ProfileData {
  catalog: Catalog;
  rules: readonly Rule[];
}

export const PROFILE_DATA: ProfileData = { catalog: CATALOG, rules: RULES };

export interface ResolveInput {
  facts: Facts;
  look: Look;
  fidelity: Fidelity;
  context: Context;
}

const IMPORTANCE: readonly Importance[] = ["essential", "preferred", "extra"];

/** Throws, naming the feature, for a key the catalog doesn't know or a value outside its type. */
export function validateLook(look: Look, catalog: Catalog): void {
  for (const [key, value] of Object.entries(look)) {
    if (key === "importance") {
      for (const [feature, level] of Object.entries(
        (value ?? {}) as Record<string, unknown>,
      )) {
        if (!(feature in catalog)) {
          throw new TypeError(`importance of an unknown feature: ${feature}`);
        }
        if (!IMPORTANCE.includes(level as Importance)) {
          throw new TypeError(
            `importance of ${feature} must be one of ${IMPORTANCE.join(", ")}`,
          );
        }
      }
      continue;
    }
    const entry = catalog[key];
    if (!entry) {
      throw new TypeError(`unknown feature: ${key}`);
    }
    if (typeof value !== "boolean" && !entry.steps.includes(value as Step)) {
      throw new TypeError(
        `${key} must be true, false or one of ${entry.steps.join(", ")}`,
      );
    }
  }
}

function rulesOf<K extends Rule["kind"]>(
  rules: readonly Rule[],
  feature: string,
  kind: K,
): Extract<Rule, { kind: K }>[] {
  return rules.filter(
    (r): r is Extract<Rule, { kind: K }> =>
      r.feature === feature && r.kind === kind,
  );
}

/**
 * The steps a feature offers at `subject`, best first: the one `rank` rule
 * that matches, else the catalog's order.
 */
export function orderAt(
  feature: string,
  subject: Subject,
  data: ProfileData = PROFILE_DATA,
): readonly Step[] {
  const entry = data.catalog[feature];
  if (!entry) {
    throw new TypeError(`unknown feature: ${feature}`);
  }
  return rankRuleAt(feature, subject, data)?.order ?? entry.steps;
}

/** The `rank` rule in force for a feature at `subject`, if it has any. */
export function rankRuleAt(
  feature: string,
  subject: Subject,
  data: ProfileData = PROFILE_DATA,
): RankRule | undefined {
  return rulesOf(data.rules, feature, "rank").find((r) =>
    evaluate(r.when, subject),
  );
}

/** The support rules a step fails at `facts`. */
export function unmetSupport(
  feature: string,
  step: Step,
  facts: Facts,
  data: ProfileData = PROFILE_DATA,
): SupportRule[] {
  return rulesOf(data.rules, feature, "requires").filter(
    (r) => r.step === step && !evaluate(r.needs, { facts }),
  );
}

const label = (step: Step | "off" | boolean): string => String(step);

/**
 * The look made effective. `fixed` gives every feature left at `true` its best
 * supported step, with no cost rule. `auto` lets cost rules lower appearance
 * features left at `true`. Limit rules apply under both. A pinned step is
 * lowered only when unsupported (or not offered at this altitude).
 */
export function resolve(
  input: ResolveInput,
  data: ProfileData = PROFILE_DATA,
): EffectiveSettings {
  const { facts, look, fidelity, context } = input;
  const { catalog, rules } = data;
  validateLook(look, catalog);
  const subject: Subject = { facts, context };
  const features: Record<string, EffectiveFeature> = {};
  const notices: Notice[] = [];

  for (const [name, entry] of Object.entries(catalog)) {
    const importance = look.importance?.[name] ?? entry.importance;
    const asked =
      name in look ? (look[name] as boolean | Step) : entry.defaultLook;
    const because: Reason[] = [
      {
        rule: `${name}.catalog`,
        layer: name in look ? "view" : "catalog",
        text:
          name in look
            ? `asked for ${label(asked)} in the look`
            : `the engine's default look is ${label(asked)}`,
        applied: true,
      },
    ];
    const done = (given: Step | "off") => {
      features[name] = {
        asked,
        given,
        importance,
        scope: entry.scope,
        because,
      };
    };
    if (asked === false) {
      done("off");
      continue;
    }

    const order = orderAt(name, subject, data);
    const supported = (step: Step) =>
      unmetSupport(name, step, facts, data).length === 0;
    const pinned = asked !== true;
    const pinnedIndex = pinned ? order.indexOf(asked) : 0;
    const want = pinnedIndex < 0 ? 0 : pinnedIndex;
    const askedStep = order[want];

    /** The first supported step at or after `from`, or undefined. */
    const firstFrom = (from: number): Step | undefined =>
      order.slice(from).find(supported);

    const ranked = rankRuleAt(name, subject, data);
    if (ranked) {
      because.push({
        rule: ranked.id,
        layer: "support",
        text: ranked.reason,
        applied: true,
      });
    }
    // Support.
    for (const step of order.slice(0, want + 1)) {
      for (const r of unmetSupport(name, step, facts, data)) {
        because.push({
          rule: r.id,
          layer: "support",
          text: r.reason,
          applied: true,
        });
      }
    }
    let given: Step | "off";
    const found = firstFrom(want);
    if (found !== undefined) {
      given = found;
    } else {
      given = entry.fallback;
    }
    if (pinned && pinnedIndex < 0) {
      because.push({
        rule: `${name}.offered`,
        layer: "support",
        text: `${label(asked)} isn't offered here; the steps are ${order.join(", ")}`,
        applied: true,
      });
    }
    const stageStart = label(askedStep ?? "off");
    if (pinned && (pinnedIndex < 0 || given !== asked)) {
      const rule =
        because.find((b) => b.layer === "support" && !b.rule.includes(".rank."))
          ?.rule ?? `${name}.offered`;
      notices.push({
        kind: "unmet",
        feature: name,
        asked: label(asked),
        given: label(given),
        rule,
        reason: because.find((b) => b.rule === rule)!.text,
      });
    } else if (!pinned && given !== askedStep) {
      const rule = because.find(
        (b) => b.layer === "support" && !b.rule.includes(".rank."),
      )?.rule;
      notices.push({
        kind: "unsupported",
        feature: name,
        asked: stageStart,
        given: label(given),
        rule: rule ?? `${name}.fallback`,
        reason: because.find((b) => b.rule === rule)?.text ?? entry.doc,
      });
    }

    /** `given` no better than `cap`, as the supported step at or after it, or `off`. */
    const capped = (
      cap: Step | "off",
      mayDrop: boolean,
    ): Step | "off" | undefined => {
      const at = (s: Step | "off") =>
        s === "off" ? order.length : order.indexOf(s);
      const current = at(given);
      const limit = Math.max(at(cap), current);
      if (limit === current) {
        return undefined;
      }
      if (limit >= order.length) {
        if (mayDrop) {
          return "off";
        }
        // Never dropped for cost: the lowest supported step.
        const lowest = [...order].reverse().find(supported);
        return lowest !== undefined && at(lowest) > current
          ? lowest
          : undefined;
      }
      return firstFrom(limit) ?? (mayDrop ? "off" : undefined);
    };

    /** Applies the most restrictive of `matched`, trails them all, and returns the new step. */
    const apply = (
      matched: (CostRule | LimitRule)[],
      layer: "cost" | "limit",
      mayDrop: boolean,
    ) => {
      if (matched.length === 0) {
        return;
      }
      const at = (s: Step | "off") =>
        s === "off" ? order.length : order.indexOf(s);
      const winner = matched.reduce((a, b) => (at(b.cap) > at(a.cap) ? b : a));
      const next = capped(winner.cap, mayDrop);
      for (const r of matched) {
        because.push({
          rule: r.id,
          layer,
          text: r.reason,
          provenance: "provenance" in r ? r.provenance : undefined,
          applied: r === winner && next !== undefined,
        });
      }
      if (next === undefined || next === given) {
        return;
      }
      const before = given;
      given = next;
      notices.push({
        kind:
          layer === "limit"
            ? "limited"
            : next === "off"
              ? "dropped"
              : "stepped",
        feature: name,
        asked: label(before),
        given: label(next),
        rule: winner.id,
        reason: winner.reason,
        ...("accuracy" in winner && winner.accuracy
          ? { accuracy: winner.accuracy }
          : {}),
      });
    };

    // Cost: `auto` only, appearance only, features left at `true`.
    if (fidelity === "auto" && !pinned && entry.class === "appearance") {
      apply(
        rulesOf(rules, name, "cost").filter((r) => evaluate(r.when, subject)),
        "cost",
        importance === "extra",
      );
    }
    // Limits: always, on whatever is on.
    if (given !== "off") {
      apply(
        rulesOf(rules, name, "limit").filter((r) => evaluate(r.when, subject)),
        "limit",
        true,
      );
    }
    done(given);
  }
  return { fidelity, features, notices };
}

/** `view.explain(feature)`: what was asked, what was given, and the rules behind it. */
export function explain(
  effective: EffectiveSettings,
  feature: string,
): { asked: Step | boolean; given: Step | "off"; trail: readonly Reason[] } {
  const f = effective.features[feature];
  if (!f) {
    throw new TypeError(`unknown feature: ${feature}`);
  }
  return { asked: f.asked, given: f.given, trail: f.because };
}

/**
 * The rule that decided a feature's step, when one did: the support, cost or
 * limit rule that lowered it. Undefined when the step is what was asked.
 */
export function decidingReason(feature: EffectiveFeature): Reason | undefined {
  let deciding: Reason | undefined;
  for (const reason of feature.because) {
    if (
      reason.applied &&
      (reason.layer === "support" ||
        reason.layer === "cost" ||
        reason.layer === "limit") &&
      !reason.rule.includes(".rank.")
    ) {
      deciding = reason;
    }
  }
  return deciding;
}
