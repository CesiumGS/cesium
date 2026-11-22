// Reference images for a settings sweep (CS-395;
// docs/superpowers/plans/2026-11-13-dyno-dev-harness.md, section 4, "Pixel
// difference from the reference" and "Sweeps over several axes"). Each
// point's settled capture is compared with its reference point's, over the
// whole image and the scene's named crops: the share of pixels whose linear
// luminance changes by more than 0.1, the mean change, and FLIP. The
// reference points run --reference-reps times, and the largest difference
// between two captures of one reference point is the noise floor: a point
// whose difference is no larger reads "within noise".
//
// The arithmetic here is pure, so Node tests run it on tiny generated
// images. The CLI (commands/suite.mjs) passes `compareSweep` a comparer
// that runs in the FLIP page (flip.ts, `compareFrames`), which decodes the
// PNGs and adds FLIP; that page imports `pixelDifference` from here.

/** A pixel counts as changed above this change in linear luminance (0 to 1). */
export const PIXEL_THRESHOLD = 0.1;

/** The capture compared: the settled view after settling (moment "end"). */
export const REFERENCE_MOMENT = "end";

/** The whole image, as a region name. */
export const WHOLE = "whole";

/** 8-bit sRGB to linear, as a table (256 entries). */
const LINEAR = [...Array(256).keys()].map((i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** Linear luminance (Rec. 709 weights) of an 8-bit sRGB color, 0 to 1. */
export function linearLuminance(r, g, b) {
  return 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b];
}

/**
 * A crop ([x0, y0, x1, y1] as shares of the image's size) in whole pixels
 * of a width × height image: { x0, y0, x1, y1 }, x1 and y1 exclusive,
 * clamped to the image and at least one pixel. The whole image without a
 * crop.
 */
export function cropRect(crop, width, height) {
  if (!crop) {
    return { x0: 0, y0: 0, x1: width, y1: height };
  }
  const clamp = (v, n) => Math.min(n, Math.max(0, Math.round(v * n)));
  const x0 = Math.min(width - 1, clamp(Math.min(crop[0], crop[2]), width));
  const y0 = Math.min(height - 1, clamp(Math.min(crop[1], crop[3]), height));
  const x1 = Math.max(x0 + 1, clamp(Math.max(crop[0], crop[2]), width));
  const y1 = Math.max(y0 + 1, clamp(Math.max(crop[1], crop[3]), height));
  return { x0, y0, x1, y1 };
}

/**
 * The pixel difference of two RGBA images of one size (8 bits a channel,
 * `Uint8ClampedArray` or any array), over a rectangle (`cropRect`; the
 * whole image without one): `share`, the share of pixels whose linear
 * luminance changes by more than PIXEL_THRESHOLD, `mean`, the mean change
 * in linear luminance, and `pixels`, how many were compared.
 */
export function pixelDifference(a, b, width, height, rect) {
  if (a.length !== b.length || a.length < width * height * 4) {
    throw new Error(
      `pixelDifference: images of ${a.length / 4} and ${b.length / 4} pixels, expected ${width}×${height}`,
    );
  }
  const { x0, y0, x1, y1 } = rect ?? cropRect(undefined, width, height);
  let changed = 0;
  let sum = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      const d = Math.abs(
        linearLuminance(a[i], a[i + 1], a[i + 2]) -
          linearLuminance(b[i], b[i + 1], b[i + 2]),
      );
      sum += d;
      if (d > PIXEL_THRESHOLD) {
        changed++;
      }
    }
  }
  const pixels = (x1 - x0) * (y1 - y0);
  return { share: changed / pixels, mean: sum / pixels, pixels };
}

/**
 * The mean and 95th percentile of a per-pixel error map (FLIP's, a
 * width × height array) over a rectangle.
 */
export function errorStats(errors, width, rect) {
  const { x0, y0, x1, y1 } = rect;
  const values = new Float32Array((x1 - x0) * (y1 - y0));
  let k = 0;
  let sum = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = errors[y * width + x];
      values[k++] = v;
      sum += v;
    }
  }
  values.sort();
  return {
    mean: sum / values.length,
    p95: values[Math.min(values.length - 1, Math.floor(values.length * 0.95))],
  };
}

/** A scene's regions: the whole image, then its named crops in order. */
export function regionsOf(scene) {
  return [
    { name: WHOLE },
    ...Object.entries(scene?.crop ?? {}).map(([name, box]) => ({ name, box })),
  ];
}

/**
 * A capture's file stem in a run's assets: scene, scenario, configuration
 * and moment (the filmstrip's JPEGs), and a reference repetition's number
 * after the first (`.r2`).
 */
export function shotName(f) {
  return `${f.scene}__${f.scenario}__${f.config}__${f.moment}${f.repeat ? `.r${f.repeat + 1}` : ""}`.replace(
    /[^\w@.-]/g,
    "_",
  );
}

const sameCoords = (a, b, ids) => ids.every((id) => a[id] === b[id]);

/**
 * Each point's reference in a sweep record (settings.mjs, readSweep): the
 * point with the same other coordinates and the reference value on the
 * reference axis or, for a reference outside the grid, the point with
 * the same coordinates plus the reference setting. Returns, per point
 * index, the reference point's index, or undefined for a reference point
 * itself and for a sweep without a reference.
 */
export function referenceIndex(sweep) {
  const ref = sweep?.reference;
  const points = sweep?.points ?? [];
  if (!ref) {
    return points.map(() => undefined);
  }
  const ids = (sweep.axes ?? []).map((a) => a.id);
  return points.map((p) => {
    if (p.reference) {
      return undefined;
    }
    const at = points.findIndex(
      (q) =>
        q.reference &&
        q.coords[ref.id] === ref.value &&
        sameCoords(
          q.coords,
          p.coords,
          ids.filter((id) => id !== ref.id),
        ),
    );
    return at < 0 ? undefined : at;
  });
}

/**
 * The noise floor of one scene and scenario from its reference points'
 * repeated captures: per region, the largest pixel difference (`share`,
 * `mean`) and FLIP (`flip`, `flipP95`) between two captures of the same
 * reference point, with the number of pairs it rests on. Undefined
 * without a pair (one capture of each reference point).
 */
export function noiseFloor(pairs) {
  if (!pairs.length) {
    return undefined;
  }
  const regions = {};
  for (const pair of pairs) {
    for (const [name, d] of Object.entries(pair.regions)) {
      const r = (regions[name] ??= {
        share: 0,
        mean: 0,
        flip: 0,
        flipP95: 0,
      });
      r.share = Math.max(r.share, d.share);
      r.mean = Math.max(r.mean, d.mean);
      if (Number.isFinite(d.flip)) {
        r.flip = Math.max(r.flip, d.flip);
      }
      if (Number.isFinite(d.flipP95)) {
        r.flipP95 = Math.max(r.flipP95, d.flipP95);
      }
    }
  }
  return { pairs: pairs.length, regions };
}

/**
 * Whether a point's difference from its reference is within the noise
 * floor, by the share of pixels changed: true, false, or undefined when
 * there is no floor or no difference to judge ("can't tell").
 */
export function withinNoise(difference, floor) {
  if (!difference || !floor || !Number.isFinite(difference.share)) {
    return undefined;
  }
  return difference.share <= floor.share;
}

/** A share as a percentage with no more precision than it has. */
export function percent(share) {
  const p = share * 100;
  if (p === 0) {
    return "0%";
  }
  if (p < 0.1) {
    return "under 0.1%";
  }
  return `${p < 10 ? p.toFixed(1) : Math.round(p)}%`;
}

/**
 * A point's pixel difference in words: "reference", "within noise",
 * "4.1% of pixels" (and "no noise floor" beside it when the run has none),
 * or "not compared".
 */
export function differenceWords(difference, floor, { reference } = {}) {
  if (reference) {
    return "reference";
  }
  if (!difference || !Number.isFinite(difference.share)) {
    return "not compared";
  }
  const within = withinNoise(difference, floor);
  if (within) {
    return "within noise";
  }
  const words = `${percent(difference.share)} of pixels`;
  return floor ? words : `${words} (no noise floor)`;
}

/** The metric keys a region's difference is recorded under. */
export function referenceKeys(region) {
  const at = region === WHOLE ? "" : `.${region}`;
  return {
    share: `pixelDiffShare${at}`,
    mean: `pixelDiffMean${at}`,
    flip: `flipRef${at}`,
    flipP95: `flipRefP95${at}`,
  };
}

/**
 * A region's difference as metrics ({ pixelDiffShare, pixelDiffMean,
 * flipRef, flipRefP95 }, with ".<crop>" after each key for a crop).
 */
export function differenceMetrics(regions) {
  const out = {};
  for (const [name, d] of Object.entries(regions ?? {})) {
    const keys = referenceKeys(name);
    for (const [field, key] of Object.entries(keys)) {
      if (Number.isFinite(d[field])) {
        out[key] = d[field];
      }
    }
  }
  return out;
}

const key = (f) => `${f.scene}|${f.scenario}`;

/**
 * Compares a sweep's captures with their references and computes the
 * noise floor. Arguments:
 *
 *   shots    [{ scene, scenario, config, repeat?, png }]: the captures at
 *            REFERENCE_MOMENT, the first repetition of each point and every
 *            repeat of the reference points
 *   sweep    the run's sweep record (axes, reference, points with configs)
 *   scenes   the scenes by id (their `crop`)
 *   compare  async (test, ref, regions) → { regions: { <name>: { share,
 *            mean, flip?, flipP95? } }, heatmap? }: `heatmap` a PNG
 *            (base64) of the whole image's FLIP, or nothing
 *   save     async (name, base64, type) → the file's name in the run's
 *            assets: a reference repeat's JPEG, a heatmap's PNG
 *   image    (shot) → the file name of a first capture's JPEG (the
 *            filmstrip's)
 *   encode   async (shot) → a JPEG (base64) of a repeat's capture
 *
 * Returns the record the run keeps as `results.reference`:
 * { moment, threshold, reference, floors: [{ scene, scenario, pairs, reps,
 * regionNames, regions? }], points: [{ scene, scenario, config, image,
 * reference?, against?, regions?, within?, heatmap? }], repeats: [{ scene,
 * scenario, config, repeat, image }] },
 * or undefined for a sweep without a reference.
 */
export async function compareSweep({
  shots,
  sweep,
  scenes,
  compare,
  save,
  image,
  encode,
}) {
  if (!sweep?.reference) {
    return undefined;
  }
  const refOf = referenceIndex(sweep);
  const shotsOf = new Map();
  for (const s of shots) {
    const k = `${key(s)}|${s.config}`;
    (shotsOf.get(k) ?? shotsOf.set(k, []).get(k)).push(s);
  }
  for (const list of shotsOf.values()) {
    list.sort((a, b) => (a.repeat ?? 0) - (b.repeat ?? 0));
  }
  const groups = [...new Set(shots.map(key))];
  const floors = [];
  const points = [];
  const repeats = [];
  for (const group of groups) {
    const [scene, scenario] = group.split("|");
    const regions = regionsOf(scenes[scene]);
    // The noise floor: every pair of one reference point's captures.
    const pairs = [];
    for (const point of sweep.points.filter((p) => p.reference)) {
      for (const config of point.configs) {
        const list = shotsOf.get(`${group}|${config}`) ?? [];
        for (const s of list.slice(1)) {
          const jpeg = await encode(s);
          repeats.push({
            scene,
            scenario,
            config,
            repeat: s.repeat,
            image: await save(`${shotName(s)}.jpg`, jpeg, "jpeg"),
          });
        }
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const r = await compare(list[j].png, list[i].png, regions);
            pairs.push({
              config,
              repeats: [list[i].repeat ?? 0, list[j].repeat ?? 0],
              regions: r.regions,
            });
          }
        }
      }
    }
    const floor = noiseFloor(pairs);
    floors.push({
      scene,
      scenario,
      pairs: floor?.pairs ?? 0,
      reps: sweep.reference.reps ?? 1,
      regionNames: regions.map((r) => r.name),
      ...(floor ? { regions: floor.regions } : {}),
    });
    // Each point against its reference, engine by engine.
    for (const [index, point] of sweep.points.entries()) {
      for (const [e, config] of point.configs.entries()) {
        const first = shotsOf.get(`${group}|${config}`)?.[0];
        if (!first) {
          continue;
        }
        const entry = { scene, scenario, config, image: image(first) };
        points.push(entry);
        if (point.reference) {
          entry.reference = true;
          continue;
        }
        const against = sweep.points[refOf[index]]?.configs[e];
        const ref = against && shotsOf.get(`${group}|${against}`)?.[0];
        if (!ref) {
          continue;
        }
        entry.against = against;
        const r = await compare(first.png, ref.png, regions);
        entry.regions = r.regions;
        entry.within = Object.fromEntries(
          Object.entries(r.regions).map(([name, d]) => [
            name,
            withinNoise(d, floor?.regions[name]) ?? null,
          ]),
        );
        if (r.heatmap) {
          entry.heatmap = await save(
            `${shotName(first)}.ref.flip.png`,
            r.heatmap,
            "png",
          );
        }
      }
    }
  }
  return {
    moment: REFERENCE_MOMENT,
    threshold: PIXEL_THRESHOLD,
    reference: sweep.reference,
    floors,
    points,
    repeats,
  };
}

/**
 * The reference record's differences as summary values, by cell key
 * ("<scene>|<scenario>|<config>"): { pixelDiffShare, …, "pixelDiffShare.
 * cliff", … }. A reference point is 0 on each, by definition.
 */
export function referenceCellValues(record) {
  const out = {};
  for (const p of record?.points ?? []) {
    const k = `${p.scene}|${p.scenario}|${p.config}`;
    if (p.reference) {
      const floor = record.floors?.find(
        (f) => f.scene === p.scene && f.scenario === p.scenario,
      );
      const names = floor?.regionNames ?? [WHOLE];
      out[k] = differenceMetrics(
        Object.fromEntries(
          names.map((n) => [
            n,
            { share: 0, mean: 0, flip: 0, flipP95: 0 },
          ]),
        ),
      );
    } else if (p.regions) {
      out[k] = differenceMetrics(p.regions);
    }
  }
  return out;
}
