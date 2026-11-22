// One view's look, resolved on its engine's device (`view.effective`). The
// resolve is pure (resolve.ts); this keeps its last result and resolves again
// only when an input it reads changes: the look, the device's facts (a new
// object after device loss), or which rules the context matches (a resize, or
// the camera crossing an altitude). It reads no GPU, so it runs in Node.
import { evaluate } from "./predicate.ts";
import { LOOK_FEATURES, lookValues, type LookSource } from "./look.ts";
import type { SupportNotices } from "./notices.ts";
import { PROFILE_DATA, resolve, type ProfileData } from "./resolve.ts";
import type {
  Context,
  EffectiveSettings,
  Facts,
  Fidelity,
  Look,
  Predicate,
  Step,
  Subject,
} from "./types.ts";

/** A notice's identity across resolves, for reporting only new ones. */
const noticeKey = (n: { kind: string; feature: string; given: string }) =>
  `${n.feature}|${n.kind}|${n.given}`;

export class ViewProfile {
  private last: EffectiveSettings | undefined;
  private lastFacts: Facts | undefined;
  private readonly lastLook: (boolean | Step)[] = [];
  private readonly look: (boolean | Step)[] = [];
  /** The rules whose `when` reads the context. */
  private readonly contextual: readonly Predicate[];
  private readonly lastMatches: boolean[] = [];
  private readonly subject: Subject;
  /** The notices reported at the last check, and what it checked. */
  private reported = new Set<string>();
  private checked: EffectiveSettings | undefined;

  constructor(
    /** The engine's device's facts now. */
    private readonly facts: () => Facts,
    /** Names the view in warn-once keys. */
    readonly scope: string,
    readonly fidelity: Fidelity = "auto",
    private readonly data: ProfileData = PROFILE_DATA,
  ) {
    this.contextual = data.rules.flatMap((r) =>
      r.kind === "requires" ? [] : [r.when],
    );
    this.subject = {
      facts: facts(),
      context: { pixels: 0, altitudeKm: 0 },
    };
  }

  /** The look from `source` made effective at `context`: the last result while nothing it reads changed. */
  effective(source: LookSource, context: Context): EffectiveSettings {
    const facts = this.facts();
    const look = lookValues(source, this.look);
    const subject = this.subject;
    subject.facts = facts;
    subject.context!.pixels = context.pixels;
    subject.context!.altitudeKm = context.altitudeKm;
    let same =
      this.last !== undefined &&
      facts === this.lastFacts &&
      look.every((v, i) => v === this.lastLook[i]);
    for (let i = 0; i < this.contextual.length; i++) {
      const matches = evaluate(this.contextual[i]!, subject);
      same &&= matches === this.lastMatches[i];
      this.lastMatches[i] = matches;
    }
    if (same) {
      return this.last!;
    }
    this.lastFacts = facts;
    this.lastLook.length = 0;
    this.lastLook.push(...look);
    const asLook: Record<string, boolean | Step> = {};
    LOOK_FEATURES.forEach((name, i) => {
      asLook[name] = look[i]!;
    });
    this.last = resolve(
      {
        facts,
        look: asLook as Look,
        fidelity: this.fidelity,
        context: { pixels: context.pixels, altitudeKm: context.altitudeKm },
      },
      this.data,
    );
    return this.last;
  }

  /**
   * Resolves, and reports to `notices` each notice the last check didn't
   * have. Under `strict` that throws for a pinned step that can't run, an
   * unsupported feature that matters, and a hard limit (notices.ts).
   */
  check(
    source: LookSource,
    context: Context,
    notices: SupportNotices,
  ): EffectiveSettings {
    const effective = this.effective(source, context);
    if (effective === this.checked) {
      return effective;
    }
    this.checked = effective;
    const now = new Set(effective.notices.map(noticeKey));
    const before = this.reported;
    this.reported = now;
    // Every new notice is recorded before the first strict error is thrown.
    let failed: unknown;
    for (const notice of effective.notices) {
      if (!before.has(noticeKey(notice))) {
        try {
          notices.report(
            notice,
            effective.features[notice.feature]!,
            this.scope,
          );
        } catch (error) {
          failed ??= error;
        }
      }
    }
    if (failed !== undefined) {
      throw failed;
    }
    return effective;
  }
}
