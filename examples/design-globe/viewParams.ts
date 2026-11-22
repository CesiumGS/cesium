// The design globe's viewer toggles in the link (plan 4b Task 20; DESIGN.md
// "Visuals in the viewer"): the convergence compass at the cursor, the
// error ribbon and "See underground", all off by default and left out of
// the link while off.

export interface ViewParams {
  /** Grid north against true north at the cursor. */
  readonly compass: boolean;
  /** The ground under the corridor tinted by rigid's error. */
  readonly ribbon: boolean;
  /** The ground around the corridor translucent: its tunnels in view. */
  readonly underground: boolean;
}

export const DEFAULT_VIEW: ViewParams = {
  compass: false,
  ribbon: false,
  underground: false,
};

const on = (
  params: Readonly<Record<string, string | undefined>>,
  key: string,
): boolean => Object.hasOwn(params, key) && params[key] === "on";

export function parseView(
  params: Readonly<Record<string, string | undefined>>,
): ViewParams {
  return {
    compass: on(params, "compass"),
    ribbon: on(params, "ribbon"),
    underground: on(params, "underground"),
  };
}

export function formatView(v: ViewParams): {
  readonly compass: "on" | undefined;
  readonly ribbon: "on" | undefined;
  readonly underground: "on" | undefined;
} {
  return {
    compass: v.compass ? "on" : undefined,
    ribbon: v.ribbon ? "on" : undefined,
    underground: v.underground ? "on" : undefined,
  };
}
