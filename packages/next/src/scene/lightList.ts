// What a view's glare takes its light from (CESIUM2_WEBGPU_PLAN.md §13.32, point 3). A
// first version: the sun, where the view draws it, and the star field's bright end. 5e
// adds the Moon and the planets.

/** What a view has in its list of light sources. */
export interface LightList {
  sun: boolean;
  stars: number;
}

/**
 * The list for `view`: the sun where it draws it (`sunDisk`, with an atmosphere), and
 * the `brightStars` the sky holds, where it draws its sky.
 */
export function lightListFor(
  view: {
    readonly background: "atmosphere" | "color";
    readonly sunDisk: boolean;
    readonly body: { readonly atmosphere?: unknown };
  },
  brightStars: number,
  out: LightList = { sun: false, stars: 0 },
): LightList {
  const sky = view.background === "atmosphere" && !!view.body.atmosphere;
  out.sun = sky && view.sunDisk;
  out.stars = sky ? brightStars : 0;
  return out;
}
