// Deep links and history (R15): the scenario, its knobs and time, the
// selection and the tab a link names. Back, forward or an edited link
// re-show the scenario only when its scenario, knobs or time moved; a
// selection is checked against the shown scenario's tree only. Hostile or
// stale values fall back to the checked setup (selection.ts, Review Focus 4).
import type { ExampleContext } from "../types.ts";
import type { ScenarioHost } from "./scenarioHost.ts";
import { READY } from "./scenarios/scenes.ts";
import type { ScenarioId } from "./scenarios/spec.ts";
import { SCENARIOS } from "./scenarios/specs.ts";
import {
  parseParams,
  type Known,
  type Tab,
  type ViewParams,
  type ViewStore,
} from "./selection.ts";

/**
 * Writes the link for each asked-for setup (Task 4d). While the clock
 * plays, the scenario host re-evaluates every 0.7 s to follow it, and each
 * write is a navigation that renders the gallery again; so a request that
 * only followed the playing clock (the same scenario and knobs as the link
 * has) leaves the link's time behind, and the link takes it when the clock
 * stops. A knob or a scenario is written at once, playing or not.
 */
export function createLinkWriter(deps: {
  /** The scenario and its knobs, as a key (not the time). */
  setup(): string;
  playing(): boolean;
  /** Writes the link as it is now (`context.setParams`). */
  write(): void;
}): { asked(): void; clockChanged(): void } {
  let linked: string | undefined;
  let behind = false;
  const write = () => {
    linked = deps.setup();
    behind = false;
    deps.write();
  };
  return {
    asked: () => {
      if (deps.playing() && deps.setup() === linked) {
        behind = true;
      } else {
        write();
      }
    },
    clockChanged: () => {
      if (behind && !deps.playing()) {
        write();
      }
    },
  };
}

/** The scenario a link names, or the strip's first when it isn't on the page yet. */
export const readyScenario = (id: ScenarioId | undefined): ScenarioId =>
  id !== undefined && READY.includes(id) ? id : READY[0]!;

/** The tab a link opens: its own, or Verification for a linked result. */
export function initialTab(
  params: Readonly<Record<string, string>>,
  initial: Pick<ViewParams, "selection">,
): Tab | undefined {
  return params.tab === "verify" ||
    params.tab === "report" ||
    params.tab === "explore"
    ? params.tab
    : initial.selection.kind === "result"
      ? "verify"
      : undefined;
}

export interface DeepLinks {
  dispose(): void;
}

/** Follows the params through back, forward and edited links. */
export function createDeepLinks(deps: {
  watchParams: ExampleContext["watchParams"];
  view: ViewStore;
  host: Pick<ScenarioHost, "params" | "show">;
  /** The shown scenario's tree's frames, once it's drawn. */
  treeIds(): Set<string> | undefined;
  /** The frame data is in (a scenario can be shown). */
  ready(): boolean;
}): DeepLinks {
  const { view, host } = deps;
  const unwatch = deps.watchParams((p) => {
    // Back, forward or an edited link: the scenario, knobs and time it
    // names. A selection is checked against this scenario's tree only:
    // another scenario's frames aren't drawn yet (fix 1, item 9).
    const now = host.params();
    const id = readyScenario(parseParams(p).scenario);
    const ids = id === now.scenario ? deps.treeIds() : undefined;
    const known: Known = ids ? { frames: ids } : {};
    const parsed = parseParams(p, known);
    view.apply(parsed);
    const sameKnobs = (
      READY.includes(id) ? SCENARIOS.find((x) => x.id === id)!.knobs : []
    ).every((k) => parsed.knobs?.[k.id] === now.knobs[k.id]);
    // A link without a time leaves the clock where it is (it may be
    // playing); one with a time sets it.
    const timeMoved = p.t !== undefined && parsed.time !== now.time;
    if (deps.ready() && (id !== now.scenario || !sameKnobs || timeMoved)) {
      void host.show(
        id,
        parsed.knobs,
        id !== now.scenario || p.t !== undefined ? parsed.time : now.time,
      );
    }
  });
  return { dispose: unwatch };
}
