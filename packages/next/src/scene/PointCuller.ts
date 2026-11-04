import commonWgsl from "../shaders/common.wgsl?raw";
import cullWgsl from "../shaders/cull.wgsl?raw";
import pointCullWgsl from "../shaders/pointCull.wgsl?raw";
import type { RenderContext } from "./RenderContext.ts";
import {
  uniformLayout,
  writeUniform,
  type UniformDeclaration,
} from "./uniforms.ts";

/**
 * A point draw's cull with a style's functions (pointCull.wgsl; a vector
 * style's layer: `styleShow`, `styleSize`, `styleColor`, `styleShapeAt`,
 * `styleOffset`,
 * reading `uniforms.<name>` at group 3): in each view it lists the points
 * whose symbols draw as quads and splats those up to the draw's `tiny`
 * pixels (`World.setPointCuller`). Until its pipelines compile it culls as
 * the generic cull does (every point a quad).
 */
export class PointCuller {
  private pipelines?: {
    cull: GPUComputePipeline;
    splat: GPUComputePipeline;
    args: GPUComputePipeline;
  };
  private readonly layout: ReturnType<typeof uniformLayout>;
  private readonly buffer: GPUBuffer;
  private readonly data: DataView;
  private readonly group: GPUBindGroup;
  private destroyed = false;

  constructor(
    private readonly ctx: RenderContext,
    options: {
      /** WGSL defining the five style functions. */
      code: string;
      /** The style's parameters (`uniforms.<name>`). */
      uniforms: Record<string, UniformDeclaration>;
      label?: string;
    },
  ) {
    const { device, pipelines } = ctx;
    this.layout = uniformLayout(options.uniforms);
    const bytes = Math.max(16, this.layout.bytes);
    this.buffer = device.createBuffer({
      label: `${options.label ?? "pointCuller"}.uniforms`,
      size: bytes,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.data = new DataView(new ArrayBuffer(bytes));
    for (const field of this.layout.fields) {
      const declaration = options.uniforms[field.name] as {
        value?: number | ArrayLike<number>;
      };
      writeUniform(this.data, field, declaration.value, false);
    }
    device.queue.writeBuffer(this.buffer, 0, this.data.buffer);
    const styleLayout = device.createBindGroupLayout({
      label: "pointCuller.style",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
      ],
    });
    this.group = device.createBindGroup({
      label: "pointCuller.style",
      layout: styleLayout,
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    });
    const uniformStruct = this.layout.fields.length
      ? `struct Uniforms { ${this.layout.fields.map((f) => `${f.name}: ${f.type}`).join(", ")} };`
      : "struct Uniforms { _unused: f32 };";
    const module = device.createShaderModule({
      label: options.label ?? "pointCuller",
      code: `${commonWgsl}
${cullWgsl}
${pointCullWgsl}
${uniformStruct}
@group(3) @binding(0) var<uniform> uniforms: Uniforms;
${options.code}`,
    });
    const layout = device.createPipelineLayout({
      bindGroupLayouts: [
        pipelines.viewLayout,
        pipelines.cullWorldLayout,
        pipelines.pointCullLayout,
        styleLayout,
      ],
    });
    const make = (entryPoint: string) =>
      device.createComputePipelineAsync({
        label: `${options.label ?? "pointCuller"}.${entryPoint}`,
        layout,
        compute: { module, entryPoint },
      });
    void Promise.all([
      make("cullPoints"),
      make("splatPoints"),
      make("writePointArgs"),
    ]).then(
      ([cull, splat, args]) => {
        if (!this.destroyed) {
          this.pipelines = { cull, splat, args };
        }
      },
      (error: unknown) =>
        console.error(
          `[cesium/next] ${options.label ?? "pointCuller"}:`,
          error,
        ),
    );
  }

  /** In a view's cull pass, groups 0–2 set (`World.encodeCull`). */
  encode(pass: GPUComputePassEncoder, x: number, y: number): void {
    const own = this.pipelines;
    if (!own) {
      pass.setPipeline(this.ctx.pipelines.cullPoints);
      pass.dispatchWorkgroups(x, y);
      pass.setPipeline(this.ctx.pipelines.writePointArgs);
      pass.dispatchWorkgroups(1);
      return;
    }
    pass.setBindGroup(3, this.group);
    pass.setPipeline(own.cull);
    pass.dispatchWorkgroups(x, y);
    pass.setPipeline(own.splat);
    pass.dispatchWorkgroups(x, y);
    pass.setPipeline(own.args);
    pass.dispatchWorkgroups(1);
  }

  /** Changes a style parameter (its uniform's name). */
  setUniform(name: string, value: number | ArrayLike<number>): void {
    const field = this.layout.fields.find((f) => f.name === name);
    if (!field) {
      return;
    }
    writeUniform(this.data, field, value, false);
    this.ctx.device.queue.writeBuffer(this.buffer, 0, this.data.buffer);
  }

  destroy(): void {
    this.destroyed = true;
    this.buffer.destroy();
  }
}
