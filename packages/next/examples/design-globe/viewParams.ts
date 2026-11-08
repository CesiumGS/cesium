// The design globe's viewer toggles in the link (plan 4b Task 20; DESIGN.md
// "Visuals in the viewer"): the convergence compass at the cursor and the
// error ribbon, both off by default and left out of the link while off.

export interface ViewParams {
  /** Grid north against true north at the cursor. */
  readonly compass: boolean;
  /** The ground under the corridor tinted by rigid's error. */
  readonly ribbon: boolean;
}

export const DEFAULT_VIEW: ViewParams = { compass: false, ribbon: false };

const on = (
  params: Readonly<Record<string, string | undefined>>,
  key: string,
): boolean => Object.hasOwn(params, key) && params[key] === "on";

export function parseView(
  params: Readonly<Record<string, string | undefined>>,
): ViewParams {
  return { compass: on(params, "compass"), ribbon: on(params, "ribbon") };
}

export function formatView(v: ViewParams): {
  readonly compass: "on" | undefined;
  readonly ribbon: "on" | undefined;
} {
  return {
    compass: v.compass ? "on" : undefined,
    ribbon: v.ribbon ? "on" : undefined,
  };
}
