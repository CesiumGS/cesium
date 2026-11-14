import { afterAll, describe, expect, it } from "vitest";
import {
  enableGpuWork,
  gpuWorkEnabled,
  takeGpuWork,
  texelBytes,
} from "../src/gpu/GpuWork.ts";
import { gpuRow, RECORD_COLUMNS, tickRow } from "../widgets/recorderRows.ts";

describe("GPU work counters", () => {
  it("counts nothing, and wraps nothing, where WebGPU is missing", () => {
    expect(enableGpuWork()).toBe(false);
    expect(gpuWorkEnabled()).toBe(false);
  });

  it("counts queue writes, copies, submits and created resources by label", () => {
    const g = globalThis as Record<string, unknown>;
    const saved = ["GPUQueue", "GPUCommandEncoder", "GPUDevice", "GPUBuffer"];
    class Queue {
      writeBuffer() {}
      writeTexture() {}
      copyExternalImageToTexture() {}
      submit() {}
    }
    class Encoder {
      copyBufferToBuffer() {}
      copyBufferToTexture() {}
      copyTextureToBuffer() {}
      copyTextureToTexture() {}
    }
    class Device {
      createBuffer() {
        return {};
      }
      createTexture() {
        return {};
      }
    }
    class Buffer {
      mapAsync() {
        return Promise.resolve();
      }
    }
    Object.assign(g, {
      GPUQueue: Queue,
      GPUCommandEncoder: Encoder,
      GPUDevice: Device,
      GPUBuffer: Buffer,
    });
    afterAll(() => saved.forEach((k) => delete g[k]));
    expect(enableGpuWork()).toBe(true);
    takeGpuWork();
    const queue = new Queue() as unknown as GPUQueue;
    const labelled = { label: "world.records" } as GPUBuffer;
    queue.writeBuffer(labelled, 0, new Float32Array(100), 0, 50);
    queue.writeBuffer(labelled, 0, new Uint8Array(10));
    queue.writeBuffer({ label: "" } as GPUBuffer, 0, new ArrayBuffer(8));
    queue.writeTexture(
      {} as GPUTexelCopyTextureInfo,
      new Uint8Array(64),
      {},
      [4, 4],
    );
    queue.submit([]);
    queue.submit([]);
    const encoder = new Encoder() as unknown as GPUCommandEncoder;
    encoder.copyBufferToBuffer({} as GPUBuffer, 0, {} as GPUBuffer, 0, 1000);
    const device = new Device() as unknown as GPUDevice;
    device.createBuffer({ size: 4096, usage: 0, label: "slab" });
    device.createTexture({
      size: [4, 4],
      format: "rgba8unorm",
      usage: 0,
      label: "tex",
    });
    void (new Buffer() as unknown as GPUBuffer).mapAsync(1);
    const work = takeGpuWork();
    expect(work.uploadCalls).toBe(3);
    expect(work.uploadBytes).toBe(50 * 4 + 10 + 8);
    expect(work.uploadBy[0]).toEqual(["world.records", 210, 2]);
    expect(work.uploadBy.at(-1)![0]).toBe("(unlabeled)");
    expect(work.textureBytes).toBe(64);
    expect(work.submits).toBe(2);
    expect(work.copyBytes).toBe(1000);
    expect(work.createdCount).toBe(2);
    expect(work.createdBytes).toBe(4096 + 4 * 4 * 4);
    expect(work.createdBy[0]).toEqual(["slab", 4096, 1]);
    expect(work.mapCalls).toBe(1);
    // A window starts again after each take.
    expect(takeGpuWork().uploadCalls).toBe(0);
    expect(texelBytes("rgba16float")).toBe(8);
    expect(texelBytes("r32float")).toBe(4);
    expect(texelBytes("r8unorm")).toBe(1);
  });
});

describe("recorder rows for GPU work", () => {
  it("writes the counters as integers, the labels safely, and stays full width", () => {
    const row = tickRow({
      t: 1,
      tick: 3,
      rendering: true,
      why: [],
      work: {
        uploadBytes: 2048,
        uploadCalls: 4,
        textureBytes: 0,
        submits: 2,
        copyBytes: 100,
        copyCalls: 1,
        createdBytes: 4096,
        createdCount: 1,
        mapCalls: 0,
        uploadBy: [["world records/x", 2048, 4]],
        createdBy: [],
      },
    }).split(",");
    const at = (c: (typeof RECORD_COLUMNS)[number]) =>
      row[RECORD_COLUMNS.indexOf(c)];
    expect(row).toHaveLength(RECORD_COLUMNS.length);
    expect(at("upload_bytes")).toBe("2048");
    expect(at("submits")).toBe("2");
    expect(at("upload_by")).toBe("world_records_x=2048");
    const gpu = gpuRow(1, 3, 4, {}, 5, 6, 7, 1.5, 2.5, 3.5).split(",");
    expect(gpu[RECORD_COLUMNS.indexOf("gpu_in_frame_untimed_ms")]).toBe("1.5");
    expect(gpu[RECORD_COLUMNS.indexOf("gpu_between_frames_ms")]).toBe("2.5");
    expect(gpu[RECORD_COLUMNS.indexOf("gpu_marker_span_ms")]).toBe("3.5");
  });
});
