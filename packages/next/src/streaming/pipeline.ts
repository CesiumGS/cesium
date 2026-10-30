/**
 * Content pipeline diagnostics: where a content load spends its time
 * (queued, network, worker wait, decode, upload wait, upload) and what the
 * loaded content holds. One glTF model is a load of one item; a tileset
 * aggregates its tiles (stage percentiles over recent loads, totals over
 * resident content).
 */
import type { GltfAsset } from "../io/gltfTypes.ts";

/** What one decoded content holds. */
export interface ContentSummary {
  /** Container format: "glb", "gltf" or "b3dm" (later pnts, i3dm, ...). */
  format: string;
  triangles: number;
  lines: number;
  points: number;
  /** Decoded vertex and index bytes, and texture bytes (with mip chains). */
  geometryBytes: number;
  textureBytes: number;
  /** Texture images by source type (image/jpeg, image/png, image/ktx2...). */
  images: Record<string, number>;
  features: number;
}

export function summarizeContent(asset: GltfAsset): ContentSummary {
  let triangles = 0;
  let lines = 0;
  let geometryBytes = 0;
  let features = 0;
  for (const mesh of asset.meshes) {
    if (mesh.topology === "line-list") {
      lines += mesh.indices.length / 2;
    } else {
      triangles += mesh.indices.length / 3;
    }
    for (const array of [
      mesh.positions,
      mesh.normals,
      mesh.uvs,
      mesh.colors,
      mesh.tangents,
      mesh.indices,
      mesh.featureIds,
    ]) {
      geometryBytes += array?.byteLength ?? 0;
    }
    features += mesh.featureCount ?? 0;
  }
  let textureBytes = 0;
  for (const image of asset.images) {
    textureBytes +=
      image instanceof ImageBitmap
        ? (image.width * image.height * 4 * 4) / 3
        : image.levels.reduce((sum, level) => sum + level.byteLength, 0);
  }
  return {
    format: asset.timing?.format ?? "glb",
    triangles,
    lines,
    points: 0,
    geometryBytes,
    textureBytes,
    images: { ...(asset.timing?.images ?? {}) },
    features,
  };
}

/** Sums of `ContentSummary` over resident content, with format counts. */
export interface ContentTotals extends Omit<ContentSummary, "format"> {
  formats: Record<string, number>;
}

export function emptyTotals(): ContentTotals {
  return {
    formats: {},
    triangles: 0,
    lines: 0,
    points: 0,
    geometryBytes: 0,
    textureBytes: 0,
    images: {},
    features: 0,
  };
}

/** Adds (sign 1) or removes (sign -1) one content's summary. */
export function accumulate(
  totals: ContentTotals,
  s: ContentSummary,
  sign: 1 | -1,
): void {
  totals.formats[s.format] = (totals.formats[s.format] ?? 0) + sign;
  totals.triangles += sign * s.triangles;
  totals.lines += sign * s.lines;
  totals.points += sign * s.points;
  totals.geometryBytes += sign * s.geometryBytes;
  totals.textureBytes += sign * s.textureBytes;
  totals.features += sign * s.features;
  for (const [type, n] of Object.entries(s.images)) {
    totals.images[type] = (totals.images[type] ?? 0) + sign * n;
  }
}

export const STAGES = [
  "queued",
  "network",
  "worker",
  "decode",
  "uploadWait",
  "upload",
] as const;
export type Stage = (typeof STAGES)[number];

/** Milliseconds per stage for one content load. */
export type StageTimes = Record<Stage, number>;

export interface StageStats {
  p50: number;
  p95: number;
}

/** Percentiles per stage over a window of recent loads. */
export function stageStats(
  records: readonly StageTimes[],
): Record<Stage, StageStats> {
  const out = {} as Record<Stage, StageStats>;
  for (const stage of STAGES) {
    const values = records.map((r) => r[stage]).sort((a, b) => a - b);
    const at = (q: number) =>
      values.length === 0
        ? 0
        : values[Math.min(values.length - 1, Math.floor(q * values.length))]!;
    out[stage] = { p50: at(0.5), p95: at(0.95) };
  }
  return out;
}
