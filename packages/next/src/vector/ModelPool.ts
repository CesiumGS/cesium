import poolWgsl from "../shaders/generated/modelPool.wgsl?raw";
import {
  POOL_STYLE_BOUNDARY,
  linkChecked,
  wgslUnit,
} from "../shaders/link/index.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Engine } from "../scene/Engine.ts";
import type { World } from "../scene/World.ts";
import type { ModelPlacement, ModelResource } from "../scene/gltfModel.ts";
import {
  uniformLayout,
  writeUniform,
  type UniformDeclaration,
} from "../scene/uniforms.ts";
import { dispatchSize, type PointSource } from "./PointSource.ts";

/** Words per part (modelPool.slang `Part`). */
const PART_WORDS = 36;
const PARAMS_BYTES = 48 + 64;

/**
 * A styled model layer's models (vector/VectorStyle.ts `model()` layers):
 * `slots` instances of one model, given each frame on the GPU to the
 * nearest points of a source its compiled style passes, oriented and
 * scaled by it (modelPool.slang). Memory follows the slots, not the points:
 * a million points may show a few thousand trucks up close.
 */
export class ModelPool {
  readonly placement: ModelPlacement;
  readonly slots: number;
  private readonly parts: number;
  private readonly partBuffer: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly paramsData = new ArrayBuffer(PARAMS_BYTES);
  private readonly counters: GPUBuffer;
  private readonly bins: GPUBuffer;
  private readonly styleBuffer: GPUBuffer;
  private readonly styleData: DataView;
  private readonly styleLayout: ReturnType<typeof uniformLayout>;
  private readonly kernels: Record<
    "reset" | "bin" | "cut" | "claim" | "hide",
    GPUComputePipeline
  >;
  private readonly groupLayout: GPUBindGroupLayout;
  private group: GPUBindGroup;
  private instanceGeneration: number;
  private readonly removeHook: () => void;
  private readonly inverseFrame = m4.mat4();
  private readonly scratch = v3.vec3();

  constructor(
    private readonly engine: Engine,
    private readonly world: World,
    private readonly source: PointSource,
    model: ModelResource,
    options: {
      slots: number;
      /** The style's WGSL: `styleShow`, `styleHeading`, `styleScale`. */
      code: string;
      /** The style's parameters, as the shaders' uniforms. */
      uniforms: Record<string, UniformDeclaration>;
      label?: string;
    },
  ) {
    const { device } = engine.gpu;
    const slots = (this.slots = Math.max(1, Math.floor(options.slots)));
    const identities = new Float32Array(slots * 16);
    for (let i = 0; i < slots; i++) {
      identities.set(m4.mat4(), i * 16);
    }
    // Hidden until claimed: no models at the origin on the first frame.
    this.placement = model.place({
      modelMatrix: source.frame,
      ground: false,
      instances: { matrices: identities },
    });
    const frames = this.placement.instanceFrames!;
    const partData = new ArrayBuffer(
      Math.max(1, this.placement.draws.length) * PART_WORDS * 4,
    );
    const pf = new Float32Array(partData);
    const pu = new Uint32Array(partData);
    this.placement.draws.forEach((draw, k) => {
      const f = frames[k]!;
      if (f.gltf) {
        throw new Error(
          "ModelPool: models with EXT_mesh_gpu_instancing aren't supported",
        );
      }
      pf.set(Array.from(f.local, Number), k * PART_WORDS);
      pf.set(Array.from(f.inverse, Number), k * PART_WORDS + 16);
      pu[k * PART_WORDS + 32] = world.instanceFirst(draw);
    });
    this.parts = this.placement.draws.length;
    this.partBuffer = device.createBuffer({
      label: "modelPool.parts",
      size: partData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.partBuffer, 0, partData);
    this.params = device.createBuffer({
      label: "modelPool.params",
      size: PARAMS_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.counters = device.createBuffer({
      label: "modelPool.counters",
      size: 132 * 4,
      usage: GPUBufferUsage.STORAGE,
    });
    this.bins = device.createBuffer({
      label: "modelPool.bins",
      size: Math.max(16, source.capacity * 4),
      usage: GPUBufferUsage.STORAGE,
    });
    // The style's parameters at binding 6, as the shaders see them.
    this.styleLayout = uniformLayout(options.uniforms);
    const styleBytes = Math.max(16, this.styleLayout.bytes);
    this.styleBuffer = device.createBuffer({
      label: "modelPool.style",
      size: styleBytes,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.styleData = new DataView(new ArrayBuffer(styleBytes));
    for (const field of this.styleLayout.fields) {
      const declaration = options.uniforms[field.name] as {
        value?: number | ArrayLike<number>;
      };
      writeUniform(this.styleData, field, declaration.value, false);
    }
    device.queue.writeBuffer(this.styleBuffer, 0, this.styleData.buffer);
    const uniformStruct = this.styleLayout.fields.length
      ? `struct Uniforms { ${this.styleLayout.fields.map((f) => `${f.name}: ${f.type}`).join(", ")} };`
      : "struct Uniforms { _unused: f32 };";
    // The style after the pool's kernels, across their boundary
    // (modelPool.slang: the functions it calls and exports by name).
    const linked = linkChecked({
      label: options.label ?? "modelPool",
      units: [
        wgslUnit("modelPool.slang", poolWgsl),
        wgslUnit(
          "style uniforms",
          `${uniformStruct}\n@group(0) @binding(6) var<uniform> uniforms: Uniforms;`,
        ),
        wgslUnit("style", options.code),
      ],
      boundaries: [POOL_STYLE_BOUNDARY],
    });
    const module = device.createShaderModule({
      label: linked.label,
      code: linked.code,
    });
    // One layout for every kernel, so one bind group serves them all.
    const entry = (
      binding: number,
      type: GPUBufferBindingType,
    ): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type },
    });
    this.groupLayout = device.createBindGroupLayout({
      label: "modelPool",
      entries: [
        entry(0, "uniform"),
        entry(1, "read-only-storage"),
        entry(2, "read-only-storage"),
        entry(3, "storage"),
        entry(4, "storage"),
        entry(5, "storage"),
        entry(6, "uniform"),
      ],
    });
    const layout = device.createPipelineLayout({
      bindGroupLayouts: [this.groupLayout],
    });
    const pipeline = (entryPoint: string) =>
      device.createComputePipeline({
        label: `modelPool.${entryPoint}`,
        layout,
        compute: { module, entryPoint },
      });
    this.kernels = {
      reset: pipeline("resetPool"),
      bin: pipeline("binPoints"),
      cut: pipeline("cutPool"),
      claim: pipeline("claimSlots"),
      hide: pipeline("hideRest"),
    };
    this.instanceGeneration = world.instanceGeneration;
    this.group = this.createGroup();
    m4.invertAffine(this.inverseFrame, source.frame);
    this.removeHook = world.addFrameCompute((pass) => this.encode(pass));
  }

  /** One layout for every kernel (all bind the same resources). */
  private createGroup(): GPUBindGroup {
    const { device } = this.engine.gpu;
    return device.createBindGroup({
      label: "modelPool",
      layout: this.groupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.params } },
        // The points' slab: anchors and properties are read from it.
        {
          binding: 1,
          resource: { buffer: this.world.vertexBufferOf(this.source.mesh) },
        },
        { binding: 2, resource: { buffer: this.partBuffer } },
        { binding: 3, resource: { buffer: this.world.instanceBuffer } },
        { binding: 4, resource: { buffer: this.counters } },
        { binding: 5, resource: { buffer: this.bins } },
        { binding: 6, resource: { buffer: this.styleBuffer } },
      ],
    });
  }

  /** Changes a style parameter (its uniform's name). */
  setUniform(name: string, value: number | ArrayLike<number>): void {
    const field = this.styleLayout.fields.find((f) => f.name === name);
    if (!field) {
      return;
    }
    writeUniform(this.styleData, field, value, false);
    this.engine.gpu.device.queue.writeBuffer(
      this.styleBuffer,
      0,
      this.styleData.buffer,
    );
    this.engine.requestRender();
  }

  private encode(pass: GPUComputePassEncoder): void {
    if (this.world.instanceGeneration !== this.instanceGeneration) {
      // A table or slab grew: its buffer is new.
      this.instanceGeneration = this.world.instanceGeneration;
      this.group = this.createGroup();
    }
    const source = this.source;
    const u32 = new Uint32Array(this.paramsData);
    const f32 = new Float32Array(this.paramsData);
    const { x, y, threads } = dispatchSize(source.capacity);
    const p = source.mesh.points;
    u32[0] = source.count;
    u32[1] = this.slots;
    u32[2] = this.parts;
    u32[3] = threads;
    u32[4] = p.anchors;
    u32[5] = p.streams;
    u32[6] = p.stride;
    // The views' cameras, in the source's frame.
    let cameras = 0;
    for (const view of this.engine.views) {
      if (view.world !== this.world || !view.enabled || cameras === 4) {
        continue;
      }
      const c = m4.transformPoint(
        this.scratch,
        this.inverseFrame,
        view.camera.position,
      );
      f32[12 + cameras * 4] = c[0]!;
      f32[13 + cameras * 4] = c[1]!;
      f32[14 + cameras * 4] = c[2]!;
      cameras++;
    }
    u32[7] = cameras;
    f32[8] = this.engine.time;
    this.engine.gpu.device.queue.writeBuffer(this.params, 0, this.paramsData);
    pass.setBindGroup(0, this.group);
    pass.setPipeline(this.kernels.reset);
    pass.dispatchWorkgroups(3);
    pass.setPipeline(this.kernels.bin);
    pass.dispatchWorkgroups(x, y);
    pass.setPipeline(this.kernels.cut);
    pass.dispatchWorkgroups(1);
    pass.setPipeline(this.kernels.claim);
    pass.dispatchWorkgroups(x, y);
    pass.setPipeline(this.kernels.hide);
    pass.dispatchWorkgroups(Math.ceil((this.slots * this.parts) / 64));
  }

  destroy(): void {
    this.removeHook();
    this.placement.remove();
    this.partBuffer.destroy();
    this.params.destroy();
    this.counters.destroy();
    this.bins.destroy();
    this.styleBuffer.destroy();
  }
}
