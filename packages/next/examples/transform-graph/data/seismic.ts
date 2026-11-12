/**
 * Seismic sections for the time-to-depth scene: the F3 Netherlands block's
 * inline through a Range request, or a synthetic one with known horizons.
 */

/** One section: traces of samples in two-way time. */
export interface Section {
  /** Traces along the section. */
  readonly traces: number;
  /** Samples a trace. */
  readonly samples: number;
  /** Metres between traces. */
  readonly spacing: number;
  /** Two-way time of the first sample, s, and the step, s. */
  readonly t0: number;
  readonly dt: number;
  /** Amplitudes, trace-major. */
  readonly data: Float32Array;
  /** The section's azimuth, degrees clockwise from north. */
  readonly azimuth: number;
  /** Where its middle is, degrees. */
  readonly longitude: number;
  readonly latitude: number;
  /** "real" for F3, "synthetic" otherwise. */
  readonly kind: "real" | "synthetic";
  /** The horizons the page draws: one time a trace, s. */
  readonly horizons: ReadonlyArray<Float32Array>;
}

export const F3_URL =
  "https://raw.githubusercontent.com/equinor/segyio-notebooks/master/data/basic/F3_Dip_steered_median_subvolume_IL230-430_XL475-675_T1600-1800.sgy";
const TEXT_HEADER = 3200;
const BINARY_HEADER = 400;
const TRACE_HEADER = 240;
const F3_TRACES_PER_INLINE = 201;
const F3_SAMPLES = 51;
const F3_FIRST_INLINE = 230;

/** Reads one inline of the F3 subvolume (IEEE float SEG-Y) with one Range request. */
export async function loadF3(
  signal: AbortSignal,
  inline = 330,
): Promise<Section> {
  const traceBytes = TRACE_HEADER + F3_SAMPLES * 4;
  const start =
    TEXT_HEADER +
    BINARY_HEADER +
    (inline - F3_FIRST_INLINE) * F3_TRACES_PER_INLINE * traceBytes;
  const length = F3_TRACES_PER_INLINE * traceBytes;
  const response = await fetch(F3_URL, {
    signal,
    headers: { Range: `bytes=${start}-${start + length - 1}` },
  });
  if (response.status !== 206) {
    throw new Error(
      `the server answered ${response.status}, not a partial response, to a Range request`,
    );
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== length) {
    throw new Error(`expected ${length} bytes, got ${buffer.byteLength}`);
  }
  const view = new DataView(buffer);
  const data = new Float32Array(F3_TRACES_PER_INLINE * F3_SAMPLES);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < F3_TRACES_PER_INLINE; i++) {
    const o = i * traceBytes;
    const scalar = view.getInt16(o + 70, false);
    const factor = scalar < 0 ? 1 / -scalar : scalar === 0 ? 1 : scalar;
    xs.push(view.getInt32(o + 180, false) * factor);
    ys.push(view.getInt32(o + 184, false) * factor);
    for (let j = 0; j < F3_SAMPLES; j++) {
      data[i * F3_SAMPLES + j] = view.getFloat32(
        o + TRACE_HEADER + j * 4,
        false,
      );
    }
  }
  const dx = xs[xs.length - 1]! - xs[0]!;
  const dy = ys[ys.length - 1]! - ys[0]!;
  const spacing = Math.hypot(dx, dy) / (F3_TRACES_PER_INLINE - 1);
  // UTM 31N (central meridian 3°E) to degrees, near enough for a placement: about 4.71°E, 54.83°N.
  const section: Section = {
    traces: F3_TRACES_PER_INLINE,
    samples: F3_SAMPLES,
    spacing,
    t0: 1.6,
    dt: 0.004,
    data,
    azimuth: (Math.atan2(dx, dy) * 180) / Math.PI,
    longitude: 4.71,
    latitude: 54.83,
    kind: "real",
    horizons: [],
  };
  return { ...section, horizons: trackHorizons(section) };
}

/** Follows the three strongest peaks of the middle trace across the section, within two samples of the last. */
function trackHorizons(section: Section): Float32Array[] {
  const { traces, samples, data } = section;
  const mid = (traces / 2) | 0;
  const peaks: number[] = [];
  for (let j = 2; j < samples - 2; j++) {
    const a = data[mid * samples + j]!;
    if (
      a > data[mid * samples + j - 1]! &&
      a >= data[mid * samples + j + 1]! &&
      a > 0
    ) {
      peaks.push(j);
    }
  }
  peaks.sort((p, q) => data[mid * samples + q]! - data[mid * samples + p]!);
  const out: Float32Array[] = [];
  for (const start of peaks.slice(0, 3)) {
    const times = new Float32Array(traces);
    const follow = (from: number, to: number, step: number) => {
      let j = start;
      for (let i = from; i !== to; i += step) {
        let best = j;
        for (
          let k = Math.max(0, j - 2);
          k <= Math.min(samples - 1, j + 2);
          k++
        ) {
          if (data[i * samples + k]! > data[i * samples + best]!) {
            best = k;
          }
        }
        j = best;
        times[i] = section.t0 + j * section.dt;
      }
    };
    follow(mid, traces, 1);
    follow(mid - 1, -1, -1);
    out.push(times);
  }
  return out;
}

/** A synthetic section: layered reflectors with one normal fault, a 30 Hz Ricker wavelet, 0.2 s to 2.0 s. */
export function synthetic(): Section {
  const traces = 201;
  const dt = 0.004;
  const t0 = 0.2;
  const samples = Math.round((2.0 - t0) / dt) + 1;
  const spacing = 25;
  const baseTimes = [0.45, 0.8, 1.15, 1.45, 1.75];
  const horizons = baseTimes.map((base, h) => {
    const t = new Float32Array(traces);
    for (let i = 0; i < traces; i++) {
      const x = i / (traces - 1);
      // Gentle dip, a little rollover, and a throw of 40 ms across the fault at the middle.
      t[i] =
        base +
        0.05 * (x - 0.5) +
        0.03 * Math.sin(x * 5 + h) +
        (i >= 100 ? 0.04 : 0);
    }
    return t;
  });
  const data = new Float32Array(traces * samples);
  const signs = [1, -1, 1, 1, -1];
  const ricker = (t: number) => {
    const a = Math.PI * 30 * t;
    return (1 - 2 * a * a) * Math.exp(-a * a);
  };
  for (let i = 0; i < traces; i++) {
    for (let j = 0; j < samples; j++) {
      const t = t0 + j * dt;
      let sum = 0;
      for (let h = 0; h < horizons.length; h++) {
        sum += signs[h]! * (0.8 - 0.1 * h) * ricker(t - horizons[h]![i]!);
      }
      data[i * samples + j] = sum + 0.05 * Math.sin(i * 12.9898 + j * 78.233);
    }
  }
  return {
    traces,
    samples,
    spacing,
    t0,
    dt,
    data,
    azimuth: 90,
    longitude: 4.71,
    latitude: 54.83,
    kind: "synthetic",
    horizons,
  };
}
