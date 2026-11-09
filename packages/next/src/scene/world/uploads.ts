// A world's upload queue: writes into its slabs, gathered and flushed in chunks.
import type { World } from "../World.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";

/** Rasterizer side: the upload queue. */
export interface UploadWorld extends Pick<World, "ctx"> {
  readonly raster: Pick<WorldRaster, "pendingUploads" | "uploadChunks">;
}

/** Smallest staging buffer for queued uploads. */
const UPLOAD_CHUNK_BYTES = 1 << 20;

/** @internal Queues a write of `data` at `offset` in `target` (`flushUploads`). */
export function queueUpload(
  world: UploadWorld,
  target: GPUBuffer,
  offset: number,
  data: Float32Array | Uint32Array,
): void {
  const size = data.byteLength;
  let chunk = world.raster.uploadChunks.at(-1);
  if (!chunk || chunk.used + size > chunk.bytes.length) {
    const buffer = world.ctx.device.createBuffer({
      label: "world.uploads",
      size: Math.max(UPLOAD_CHUNK_BYTES, Math.ceil(size / 4) * 4),
      usage: GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    chunk = {
      buffer,
      bytes: new Uint8Array(buffer.getMappedRange()),
      used: 0,
    };
    world.raster.uploadChunks.push(chunk);
  }
  chunk.bytes.set(
    new Uint8Array(data.buffer, data.byteOffset, size),
    chunk.used,
  );
  world.raster.pendingUploads.push({
    target,
    offset,
    source: chunk.buffer,
    at: chunk.used,
    size,
  });
  chunk.used += size;
}

export function flushUploads(world: UploadWorld): void {
  if (world.raster.pendingUploads.length === 0) {
    return;
  }
  for (const chunk of world.raster.uploadChunks) {
    chunk.buffer.unmap();
  }
  const encoder = world.ctx.device.createCommandEncoder({
    label: "world.uploads",
  });
  for (const { target, offset, source, at, size } of world.raster
    .pendingUploads) {
    encoder.copyBufferToBuffer(source, at, target, offset, size);
  }
  world.ctx.device.queue.submit([encoder.finish()]);
  for (const chunk of world.raster.uploadChunks) {
    chunk.buffer.destroy(); // released once the copies have run
  }
  world.raster.uploadChunks.length = 0;
  world.raster.pendingUploads.length = 0;
}
