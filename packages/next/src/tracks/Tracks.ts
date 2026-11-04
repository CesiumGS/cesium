import commonWgsl from "../shaders/common.wgsl?raw";
import tracksWgsl from "../shaders/tracks.wgsl?raw";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import * as m4 from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Engine } from "../scene/Engine.ts";
import type { World, DrawHandle } from "../scene/World.ts";
import type { CustomShader } from "../scene/CustomShader.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { ModelInstance } from "../scene/gltfModel.ts";
import { createBillboard } from "../scene/meshes.ts";

export interface TracksOptions {
  /** Tracks the collection holds (its instance rows are made up front). */
  capacity: number;
  /**
   * Earth-fixed origin of the collection's frame (east, north, up): track
   * positions are meters in it, so float32 keeps centimeters within a few
   * hundred kilometers.
   */
  origin: Vec3;
  /** Up close: an instanced model (e.g. a truck), oriented by heading. */
  model?: {
    asset: GltfAsset;
    /** Model scale (default 1). */
    scale?: number;
  };
  /** From afar: a billboard per track (`DrawOptions.billboard`). */
  billboard?: {
    /** Pixels per unit of the quad (default 32). */
    size?: number;
    /** Stands on the track ("bottom", default) or centered on it. */
    anchor?: "center" | "bottom";
    /** Meters above the track (default 0). */
    lift?: number;
    /** Drawn in front of everything within this distance (default 0). */
    depthTestDistance?: number;
    /** Its symbology: reads the per-track `streams` as `instance` values. */
    shader?: CustomShader;
    /** Per-track data for the shader (`setSymbols`), `stride` words each. */
    streams?: {
      stride: number;
      layout: Record<string, { offset: number; components: number }>;
    };
    /** Its material's base color (linear RGBA; default white). */
    color?: readonly [number, number, number, number];
  };
  /**
   * With both: the model within this distance of each view's camera, the
   * billboard beyond (m; default 2,000).
   */
  switchDistance?: number;
  /**
   * Seconds tracks are shown behind the clock, so they move between their
   * last two samples (default 0.1, a 10 Hz feed's interval).
   */
  delay?: number;
  /** The clock (seconds; default the engine's, `Engine.time`). */
  clock?: () => number;
}

/** Words per track in the state buffer (tracks.wgsl `Track`). */
const TRACK_WORDS = 12;
/** Words per part (tracks.wgsl `Part`). */
const PART_WORDS = 36;

const pipelines = new WeakMap<GPUDevice, GPUComputePipeline>();

/**
 * Real-time tracks (plan §13.11): many moving entities as instance data,
 * not objects. A feed update (`update`) writes many tracks' positions and
 * headings as one typed array into a state buffer; each frame a kernel
 * interpolates every track between its last two samples on the GPU and
 * writes its instance rows, so moving tracks costs no CPU per track.
 * Each track draws as a model within `switchDistance` of a view's camera
 * and as a billboard beyond it, chosen per instance and view in the cull
 * pass.
 */
export class Tracks {
  /** Tracks shown (the first `count`; the rest are hidden). */
  count = 0;
  readonly capacity: number;
  /** The model representation, if any. */
  readonly model: ModelInstance | undefined;
  /** The billboard draw, if any. */
  readonly billboard: DrawHandle | undefined;
  private readonly state: Float32Array;
  private readonly stateBuffer: GPUBuffer;
  private readonly partBuffer: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly paramsData = new ArrayBuffer(32);
  private readonly bindGroup: GPUBindGroup;
  private readonly parts: number;
  private readonly clock: () => number;
  private readonly delay: number;
  private readonly scale: number;
  private readonly lift: number;
  private readonly removeHook: () => void;

  constructor(
    private readonly engine: Engine,
    private readonly world: World,
    options: TracksOptions,
  ) {
    const { device } = engine.gpu;
    const capacity = (this.capacity = options.capacity);
    this.clock = options.clock ?? (() => engine.time);
    this.delay = options.delay ?? 0.1;
    this.scale = options.model?.scale ?? 1;
    this.lift = options.billboard?.lift ?? 0;
    const both = options.model && options.billboard;
    const distance = options.switchDistance ?? 2000;
    const frame = eastNorthUpToFixedFrame(
      options.origin,
      Ellipsoid.WGS84,
      m4.mat4(),
    );
    const identities = new Float32Array(capacity * 16);
    for (let i = 0; i < capacity; i++) {
      identities.set(m4.mat4(), i * 16);
    }
    // Representation parts: each model primitive's draw, the billboard.
    const parts: Array<{
      local: ArrayLike<number>;
      inverse: ArrayLike<number>;
      first: number;
      kind: number;
    }> = [];
    if (options.model) {
      this.model = engine.addModel(world, options.model.asset, {
        modelMatrix: frame,
        instances: {
          matrices: identities,
          ...(both ? { visibleWithin: distance } : {}),
        },
      });
      const frames = this.model.instanceFrames!;
      this.model.draws.forEach((draw, d) => {
        const f = frames[d]!;
        if (f.gltf) {
          throw new Error(
            "Tracks: models with EXT_mesh_gpu_instancing aren't supported",
          );
        }
        parts.push({
          local: f.local,
          inverse: f.inverse,
          first: world.instanceFirst(draw),
          kind: 0,
        });
      });
    }
    if (options.billboard) {
      const b = options.billboard;
      const streams = b.streams;
      this.billboard = world.addDraw({
        mesh: world.addMesh(createBillboard(b.anchor ?? "bottom")),
        origin: options.origin,
        model: (() => {
          const m = m4.copy(m4.mat4(), frame);
          m[12] = m[13] = m[14] = 0;
          return m;
        })(),
        radius: 10,
        material: world.addMaterial({
          baseColor: [...(b.color ?? [1, 1, 1, 1])],
        }),
        billboard: {
          size: b.size ?? 32,
          depthTestDistance: b.depthTestDistance ?? 0,
        },
        instances: {
          matrices: identities,
          ...(both ? { visibleBeyond: distance } : {}),
          ...(streams
            ? {
                streams: {
                  data: new Float32Array(capacity * streams.stride),
                  stride: streams.stride,
                  layout: streams.layout,
                },
              }
            : {}),
        },
        ...(b.shader ? { shader: b.shader } : {}),
      });
      const identity = m4.mat4();
      parts.push({
        local: identity,
        inverse: identity,
        first: world.instanceFirst(this.billboard),
        kind: 1,
      });
    }
    this.parts = parts.length;
    const partData = new ArrayBuffer(
      Math.max(1, parts.length) * PART_WORDS * 4,
    );
    const pf = new Float32Array(partData);
    const pu = new Uint32Array(partData);
    parts.forEach((p, k) => {
      pf.set(Array.from(p.local, Number), k * PART_WORDS);
      pf.set(Array.from(p.inverse, Number), k * PART_WORDS + 16);
      pu[k * PART_WORDS + 32] = p.first;
      pu[k * PART_WORDS + 33] = p.kind;
    });
    this.partBuffer = device.createBuffer({
      label: "tracks.parts",
      size: partData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.partBuffer, 0, partData);
    this.state = new Float32Array(capacity * TRACK_WORDS);
    this.stateBuffer = device.createBuffer({
      label: "tracks.state",
      size: Math.max(16, this.state.byteLength),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.params = device.createBuffer({
      label: "tracks.params",
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    let pipeline = pipelines.get(device);
    if (!pipeline) {
      pipeline = device.createComputePipeline({
        label: "tracks.update",
        layout: "auto",
        compute: {
          module: device.createShaderModule({
            label: "tracks",
            code: `${commonWgsl}\n${tracksWgsl}`,
          }),
          entryPoint: "updateTracks",
        },
      });
      pipelines.set(device, pipeline);
    }
    this.bindGroup = device.createBindGroup({
      label: "tracks",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.params } },
        { binding: 1, resource: { buffer: this.stateBuffer } },
        { binding: 2, resource: { buffer: this.partBuffer } },
        { binding: 3, resource: { buffer: world.instanceBuffer } },
      ],
    });
    const kernel = pipeline;
    this.removeHook = world.addFrameCompute((pass) => {
      const u32 = new Uint32Array(this.paramsData);
      const f32 = new Float32Array(this.paramsData);
      f32[0] = this.clock();
      f32[1] = this.delay;
      u32[2] = this.count;
      u32[3] = capacity;
      u32[4] = this.parts;
      f32[5] = this.scale;
      f32[6] = this.lift;
      device.queue.writeBuffer(this.params, 0, this.paramsData);
      pass.setPipeline(kernel);
      pass.setBindGroup(0, this.bindGroup);
      pass.dispatchWorkgroups(Math.ceil(capacity / 64), this.parts);
    });
  }

  /**
   * A feed update: tracks `first` on take new samples, 4 floats each (x,
   * y, z in the collection's frame, m; heading, radians clockwise seen
   * from above), stamped with the clock. Each moves from where it is shown
   * now to the new sample over the next `delay`. One copy to the GPU.
   */
  update(first: number, samples: Float32Array): void {
    const n = samples.length / 4;
    if (first < 0 || first + n > this.capacity || !Number.isInteger(n)) {
      throw new RangeError(`Tracks.update: ${n} tracks from ${first}`);
    }
    const now = this.clock();
    const s = this.state;
    for (let k = 0; k < n; k++) {
      const o = (first + k) * TRACK_WORDS;
      const fresh = s[o + 10] === 0; // no sample yet: start there
      s[o + 10] = 1;
      // The previous sample becomes the start (p0, t0, h0).
      s[o] = fresh ? samples[k * 4]! : s[o + 4]!;
      s[o + 1] = fresh ? samples[k * 4 + 1]! : s[o + 5]!;
      s[o + 2] = fresh ? samples[k * 4 + 2]! : s[o + 6]!;
      s[o + 3] = fresh ? now - this.delay : s[o + 7]!;
      s[o + 8] = fresh ? samples[k * 4 + 3]! : s[o + 9]!;
      s[o + 4] = samples[k * 4]!;
      s[o + 5] = samples[k * 4 + 1]!;
      s[o + 6] = samples[k * 4 + 2]!;
      s[o + 7] = now;
      s[o + 9] = samples[k * 4 + 3]!;
    }
    this.engine.gpu.device.queue.writeBuffer(
      this.stateBuffer,
      first * TRACK_WORDS * 4,
      s,
      first * TRACK_WORDS,
      n * TRACK_WORDS,
    );
    this.engine.requestRender();
  }

  /**
   * The billboards' per-track data (`billboard.streams`) from track
   * `first` on, `stride` words each: symbol, color.
   */
  setSymbols(first: number, data: Float32Array | Uint32Array): void {
    if (!this.billboard) {
      throw new Error("Tracks.setSymbols: no billboard");
    }
    this.world.setInstanceStreams(this.billboard, first, data);
  }

  /** Removes the representations and frees the buffers. */
  destroy(): void {
    this.removeHook();
    if (this.billboard) {
      this.world.removeDraw(this.billboard);
    }
    if (this.model) {
      this.engine.removeModel(this.world, this.model);
    }
    this.stateBuffer.destroy();
    this.partBuffer.destroy();
    this.params.destroy();
  }
}
