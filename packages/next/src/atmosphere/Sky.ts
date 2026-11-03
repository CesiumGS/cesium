import atmosphereWgsl from "./atmosphere.wgsl?raw";
import skyWgsl from "./sky.wgsl?raw";
import type { RealtimeAtmosphere } from "./RealtimeAtmosphere.ts";
import { Ellipsoid, type Cartographic } from "../math/ellipsoid.ts";
import * as v3 from "../math/vec3.ts";
import type { Camera } from "../scene/Camera.ts";

/** The sun's angular diameter seen from the Earth, radians (mean). */
export const SUN_ANGULAR_DIAMETER = 0.00935;

/** Bytes of the WGSL `Sky` uniform (sky.wgsl). */
const SKY_SIZE = 224;

/** Ray-march steps per pixel. */
const SKY_STEPS = 32;

export interface SkyTargets {
  colorFormats: GPUTextureFormat[];
  depthFormat: GPUTextureFormat;
  sampleCount: number;
}

/** One view's sky uniform and its bind group. */
export interface SkyView {
  buffer: GPUBuffer;
  group: GPUBindGroup;
}

/**
 * Draws a real-time atmosphere's sky and the sun's disk behind a view's
 * scene, inside its opaque pass (sky.wgsl): after the scene, where the
 * depth is still the cleared far plane, once per group of four wavelengths.
 */
export class Sky {
  private readonly pipeline: GPURenderPipeline;
  private readonly viewLayout: GPUBindGroupLayout;
  /** Per wavelength group: the atmosphere uniform and the tables. */
  private readonly groups: Array<[GPUBindGroup, GPUBindGroup]>;
  private readonly data = new ArrayBuffer(SKY_SIZE);
  private readonly f32 = new Float32Array(this.data);

  private constructor(
    private readonly device: GPUDevice,
    readonly atmosphere: RealtimeAtmosphere,
    pipeline: GPURenderPipeline,
    layouts: GPUBindGroupLayout[],
  ) {
    this.pipeline = pipeline;
    this.viewLayout = layouts[2]!;
    this.groups = atmosphere.groups.map((g) => [
      device.createBindGroup({
        label: "sky.atmosphere",
        layout: layouts[0]!,
        entries: [{ binding: 0, resource: { buffer: g.uniforms } }],
      }),
      device.createBindGroup({
        label: "sky.tables",
        layout: layouts[1]!,
        entries: [
          { binding: 1, resource: g.transmittance.createView() },
          { binding: 2, resource: atmosphere.sampler },
          { binding: 3, resource: g.multipleScattering.createView() },
        ],
      }),
    ]);
    // The band weights are the same for every view.
    atmosphere.weights.forEach((w, i) => this.f32.set(w, 24 + i * 4));
  }

  static async create(
    device: GPUDevice,
    atmosphere: RealtimeAtmosphere,
    targets: SkyTargets,
  ): Promise<Sky> {
    const fragment = GPUShaderStage.FRAGMENT;
    const layouts = [
      device.createBindGroupLayout({
        label: "sky.atmosphere",
        entries: [{ binding: 0, visibility: fragment, buffer: {} }],
      }),
      device.createBindGroupLayout({
        label: "sky.tables",
        entries: [
          { binding: 1, visibility: fragment, texture: {} },
          { binding: 2, visibility: fragment, sampler: {} },
          { binding: 3, visibility: fragment, texture: {} },
        ],
      }),
      device.createBindGroupLayout({
        label: "sky.view",
        entries: [{ binding: 0, visibility: fragment, buffer: {} }],
      }),
    ];
    const module = device.createShaderModule({
      label: "sky",
      code: `${atmosphereWgsl}\n${skyWgsl}`,
    });
    const [color, ...others] = targets.colorFormats;
    const pipeline = await device.createRenderPipelineAsync({
      label: "sky",
      layout: device.createPipelineLayout({ bindGroupLayouts: layouts }),
      vertex: { module, entryPoint: "skyVertex" },
      fragment: {
        module,
        entryPoint: "skyFragment",
        targets: [
          {
            format: color!,
            // The groups' wavelengths add up; alpha 1 marks the sky as
            // drawn (the exposure meter counts it).
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one", operation: "max" },
            },
          },
          ...others.map((format) => ({ format, writeMask: 0 })),
        ],
      },
      primitive: { topology: "triangle-list" },
      depthStencil: {
        format: targets.depthFormat,
        depthWriteEnabled: false,
        // Reverse-Z: where nothing was drawn the depth is still 0.
        depthCompare: "equal",
      },
      multisample: { count: targets.sampleCount },
    });
    return new Sky(device, atmosphere, pipeline, layouts);
  }

  /** A view's uniform and bind group. */
  createView(): SkyView {
    const buffer = this.device.createBuffer({
      label: "sky.view",
      size: SKY_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const group = this.device.createBindGroup({
      label: "sky.view",
      layout: this.viewLayout,
      entries: [{ binding: 0, resource: { buffer } }],
    });
    return { buffer, group };
  }

  /**
   * Writes a view's uniform: its camera (Earth-fixed, meters), the sun
   * (unit, Earth-fixed), the pre-exposure and whether the sun's disk shows.
   *
   * The atmosphere is a sphere; the camera sits on it at its height above
   * the WGS84 ellipsoid, along the ellipsoid's normal, so the horizon and
   * the light are the local ones wherever the camera is.
   */
  write(
    view: SkyView,
    camera: Camera,
    aspect: number,
    width: number,
    height: number,
    sun: ArrayLike<number>,
    exposure: number,
    sunDisk: boolean,
  ): void {
    const f = this.f32;
    const p = this.atmosphere.parameters;
    const c = Ellipsoid.WGS84.cartesianToCartographic(
      camera.position,
      scratchCartographic,
    );
    const altitude = Math.max(c?.height ?? 0, 1);
    const normal =
      Ellipsoid.WGS84.geodeticSurfaceNormal(camera.position, scratchNormal) ??
      v3.set(scratchNormal, 0, 0, 1);
    const r = (p.bottomRadius + altitude) / 1000;
    f[0] = normal[0]! * r;
    f[1] = normal[1]! * r;
    f[2] = normal[2]! * r;
    f[3] = exposure;
    f[4] = sun[0]!;
    f[5] = sun[1]!;
    f[6] = sun[2]!;
    const radius = SUN_ANGULAR_DIAMETER / 2;
    f[7] = sunDisk ? Math.cos(radius) : 2;
    const tanY = Math.tan(camera.fovy(aspect) / 2);
    f.set(camera.direction, 8);
    f[11] = tanY * aspect;
    f.set(camera.right, 12);
    f[15] = tanY;
    f.set(camera.up, 16);
    f[19] = 2 * Math.PI * (1 - Math.cos(radius));
    f[20] = width;
    f[21] = height;
    f[22] = SKY_STEPS;
    this.device.queue.writeBuffer(view.buffer, 0, this.data, 0, 96);
  }

  /** The weights (bytes 96 on) are constant: written once per view. */
  writeWeights(view: SkyView): void {
    this.device.queue.writeBuffer(view.buffer, 96, this.data, 96);
  }

  /** Draws the sky in an open opaque pass (after the scene). */
  draw(pass: GPURenderPassEncoder, view: SkyView): void {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(2, view.group);
    for (let g = 0; g < this.groups.length; g++) {
      const [atmosphere, tables] = this.groups[g]!;
      pass.setBindGroup(0, atmosphere);
      pass.setBindGroup(1, tables);
      pass.draw(3, 1, 0, g);
    }
  }
}

const scratchCartographic: Cartographic = {
  longitude: 0,
  latitude: 0,
  height: 0,
};
const scratchNormal = v3.vec3();
