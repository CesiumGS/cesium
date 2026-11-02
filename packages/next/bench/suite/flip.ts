// Filmstrip processing for the benchmark CLI (plan §16.9, Diagnose): turns
// a captured PNG into a JPEG frame and, given the baseline's frame of the
// same moment, the image parity (FLIP, §4) and its heatmap. The CLI calls
// `processFrame` through Playwright once the runs are done.
import { createGpuFlip, type GpuFlip } from "../../parity/flipGpu.ts";
import { flip } from "../../parity/flip.js";

/** On the GPU (40 to 60 times faster); the JS reference without WebGPU. */
let gpu: Promise<GpuFlip | undefined> | undefined;

/** FLIP runs on frames this wide at most (seconds per frame otherwise). */
const FLIP_WIDTH = 640;

// Magma, as FLIP's reference heatmaps (stops at 0, 0.25, 0.5, 0.75, 1).
const MAGMA = [
  [0, 0, 4],
  [81, 18, 124],
  [183, 55, 121],
  [252, 137, 97],
  [252, 253, 191],
];

function magma(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t)) * (MAGMA.length - 1);
  const i = Math.min(MAGMA.length - 2, Math.floor(x));
  const f = x - i;
  const a = MAGMA[i]!;
  const b = MAGMA[i + 1]!;
  return [0, 1, 2].map((k) => a[k]! + (b[k]! - a[k]!) * f) as [
    number,
    number,
    number,
  ];
}

async function decode(base64: string): Promise<ImageBitmap> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return createImageBitmap(new Blob([bytes], { type: "image/png" }));
}

function pixels(image: ImageBitmap, width: number, height: number) {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

async function encode(canvas: OffscreenCanvas, type: string, quality?: number) {
  const blob = await canvas.convertToBlob({ type, quality });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

async function processFrame(test: string, reference: string | null) {
  const image = await decode(test);
  const full = new OffscreenCanvas(image.width, image.height);
  full.getContext("2d")!.drawImage(image, 0, 0);
  const jpeg = await encode(full, "image/jpeg", 0.85);
  if (!reference) {
    return { jpeg };
  }
  const other = await decode(reference);
  const width = Math.min(FLIP_WIDTH, image.width);
  const height = Math.round((image.height * width) / image.width);
  // Pixels per degree scaled with the frame, as if the full frame were
  // seen at the parity harness's default distance.
  const ppd =
    ((0.7 * image.width) / 0.7) * (Math.PI / 180) * (width / image.width);
  gpu ??= createGpuFlip().catch(() => undefined);
  const evaluator = await gpu;
  const ref = pixels(other, width, height);
  const tst = pixels(image, width, height);
  const result = evaluator
    ? await evaluator.flip(ref, tst, width, height, ppd, { errors: true })
    : flip(ref, tst, width, height, ppd);
  const errors = result.errors!;
  const heat = new OffscreenCanvas(width, height);
  const context = heat.getContext("2d")!;
  const data = context.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const [r, g, b] = magma(errors[i]!);
    data.data.set([r, g, b, 255], i * 4);
  }
  context.putImageData(data, 0, 0);
  return {
    jpeg,
    flip: {
      mean: result.mean,
      p95: result.p95,
      heatmap: await encode(heat, "image/png"),
    },
  };
}

(globalThis as { processFrame?: typeof processFrame }).processFrame =
  processFrame;
