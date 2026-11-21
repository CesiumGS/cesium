// What happens to a notice: the fallback rules of
// docs/superpowers/plans/2026-11-13-engine-profiles.md, section 4, in one place.
// Every notice is recorded on the engine's errors as kind "support"; some warn
// once in the console; under `strict` those throw instead.
import type { EffectiveFeature, Notice } from "./types.ts";

/** What a notice does beyond its record. */
export interface NoticeAction {
  /** Warns once in the console (unless the host turned warnings off). */
  readonly warns: boolean;
  /** Throws under `strict`. */
  readonly throws: boolean;
}

const QUIET: NoticeAction = { warns: false, throws: false };
const LOUD: NoticeAction = { warns: true, throws: true };

/**
 * The rule for `notice` about `feature`: a step taken or an `extra` feature
 * dropped for cost is only recorded; a pinned step that can't run and a hard
 * limit warn (and throw under `strict`); an unsupported feature does for
 * `essential` ones, and for `preferred` ones the look asked for.
 */
export function noticeAction(
  notice: Notice,
  feature: Pick<EffectiveFeature, "importance" | "because">,
): NoticeAction {
  switch (notice.kind) {
    case "stepped":
    case "dropped":
      return QUIET;
    case "unmet":
    case "limited":
      return LOUD;
    case "unsupported": {
      const asked = feature.because[0]?.layer === "view";
      return feature.importance === "essential" ||
        (feature.importance === "preferred" && asked)
        ? LOUD
        : QUIET;
    }
  }
}

/** A notice in one sentence, for the errors list and the console. */
export function noticeMessage(notice: Notice): string {
  const accuracy = notice.accuracy ? ` Accuracy: ${notice.accuracy}.` : "";
  return `${notice.feature} ${notice.kind}: asked ${notice.asked}, given ${notice.given}, because ${notice.reason} (${notice.rule}).${accuracy}`;
}

/** Where notices are recorded: the engine's errors (`EngineErrors.report`). */
export interface NoticeSink {
  report(
    kind: "support",
    message: string,
    detail: { readonly notice: Notice; readonly quiet: boolean },
  ): unknown;
}

/** The engine's notices: its errors, `strict`, `warnings`, and what already warned. */
export class SupportNotices {
  private readonly warned = new Set<string>();

  constructor(
    private readonly sink: NoticeSink,
    /** Each notice that warns throws instead (`EngineOptions.strict`). */
    readonly strict: boolean,
    /** Notices that warn do so in the console (`EngineOptions.warnings`). */
    readonly warnings: boolean,
  ) {}

  /**
   * Records `notice` about `feature`, raised by `scope` (a view, or the
   * engine). It warns once per scope, feature, kind and step given, and
   * under `strict` throws where it would warn.
   */
  report(
    notice: Notice,
    feature: Pick<EffectiveFeature, "importance" | "because">,
    scope: string,
  ): void {
    const action = noticeAction(notice, feature);
    const message = noticeMessage(notice);
    this.sink.report("support", message, { notice, quiet: true });
    if (!action.warns) {
      return;
    }
    if (this.strict) {
      throw new Error(`strict: ${message}`);
    }
    const key = `${scope}|${notice.feature}|${notice.kind}|${notice.given}`;
    if (this.warnings && !this.warned.has(key)) {
      console.warn(`[cesium/next] support: ${message}`);
    }
    this.warned.add(key);
  }
}
