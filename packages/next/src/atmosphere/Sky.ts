import atmosphereWgsl from "./atmosphere.wgsl?raw";
import skyWgsl from "./sky.wgsl?raw";
import type { RealtimeAtmosphere } from "./RealtimeAtmosphere.ts";
import type { Ellipsoid, Cartographic } from "../math/ellipsoid.ts";
import * as v3 from "../math/vec3.ts";
import type { Camera } from "../scene/Camera.ts";

/** The sun's angular diameter seen from the Earth, radians (mean). */
export const SUN_ANGULAR_DIAMETER = 0.00935;

/** Bytes of the WGSL `Sky` uniform (sky.wgsl). */
const SKY_SIZE = 224;

/** Ray-march steps per pixel, above the atmosphere. */
const SKY_STEPS = 32;

/** The sky-view table: 192 × 108 directions and a row for the sun. */
const SKY_VIEW_WIDTH = 192;
const SKY_VIEW_ROWS = 109;

export interface SkyTargets {
  colorFormats: GPUTextureFormat[];
  depthFormat: GPUTextureFormat;
  sampleCount: number;
}

/** One view's sky: its uniform, its sky-view table and their bind groups. */
export interface SkyView {
  buffer: GPUBuffer;
  /** The uniform alone (marching, and building the table). */
  group: GPUBindGroup;
  table: GPUTexture;
  tableTarget: GPUTextureView;
  /** The uniform and the table (drawing from it). */
  tableGroup: GPUBindGroup;
  /** The camera is inside the atmosphere: the sky comes from the table. */
  inside: boolean;
}

type Pipelines = Record<
  "march" | "table" | "fromTable" | "sunLight",
  GPURenderPipeline
>;

/**
 * Draws a real-time atmosphere's sky and the sun's disk behind a view's
 * scene (sky.wgsl): inside the atmosphere from a sky-view table rendered
 * per frame (`encodeTable`), above it by marching each pixel; either way
 * inside the opaque pass after the scene (`draw`), where the depth is still
 * the cleared far plane.
 */
export class Sky {
  private readonly pipelines: Pipelines;
  private readonly viewLayout: GPUBindGroupLayout;
  private readonly tableLayout: GPUBindGroupLayout;
  /** Per wavelength group: the atmosphere uniform and the tables. */
  private readonly groups: Array<[GPUBindGroup, GPUBindGroup]>;
  private readonly empty: GPUBindGroup;
  private readonly data = new ArrayBuffer(SKY_SIZE);
  private readonly f32 = new Float32Array(this.data);
  private readonly tablePass: GPURenderPassDescriptor;
  private readonly tableAttachment: GPURenderPassColorAttachment;
  /**
   * The sun's illuminance on the scene by altitude and sun angle, linear
   * sRGB lux × 1e-5 (sky.wgsl `sunLightFragment`); the opaque pass reads it.
   */
  readonly sunLight: GPUTexture;

  private constructor(
    private readonly device: GPUDevice,
    readonly atmosphere: RealtimeAtmosphere,
    pipelines: Pipelines,
    layouts: Record<
      "atmosphere" | "tables" | "view" | "table" | "empty",
      GPUBindGroupLayout
    >,
  ) {
    this.pipelines = pipelines;
    this.viewLayout = layouts.view;
    this.tableLayout = layouts.table;
    this.groups = atmosphere.groups.map((g) => [
      device.createBindGroup({
        label: "sky.atmosphere",
        layout: layouts.atmosphere,
        entries: [{ binding: 0, resource: { buffer: g.uniforms } }],
      }),
      device.createBindGroup({
        label: "sky.tables",
        layout: layouts.tables,
        entries: [
          { binding: 1, resource: g.transmittance.createView() },
          { binding: 2, resource: atmosphere.sampler },
          { binding: 3, resource: g.multipleScattering.createView() },
        ],
      }),
    ]);
    this.empty = device.createBindGroup({
      layout: layouts.empty,
      entries: [],
    });
    this.tableAttachment = {
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: "clear",
      storeOp: "store",
    };
    this.tablePass = {
      label: "sky-view",
      colorAttachments: [this.tableAttachment],
    };
    // The band weights are the same for every view.
    atmosphere.weights.forEach((w, i) => this.f32.set(w, 24 + i * 4));
    this.sunLight = device.createTexture({
      label: "sky.sunLight",
      size: [256, 64],
      format: "rgba16float",
      // COPY_SRC: checked against the CPU model (Lab "Real-time sky").
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    this.buildSunLight();
  }

  /** Renders the sun-light table from the atmosphere's tables. */
  private buildSunLight(): void {
    const device = this.device;
    // Only the band weights of the uniform are read.
    const weights = device.createBuffer({
      label: "sky.sunLight.weights",
      size: SKY_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(weights, 0, this.data);
    const group = device.createBindGroup({
      layout: this.viewLayout,
      entries: [{ binding: 0, resource: { buffer: weights } }],
    });
    const encoder = device.createCommandEncoder({ label: "sky.sunLight" });
    const pass = encoder.beginRenderPass({
      label: "sky.sunLight",
      colorAttachments: [
        {
          view: this.sunLight.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipelines.sunLight);
    pass.setBindGroup(2, group);
    for (let g = 0; g < this.groups.length; g++) {
      const [atmosphere, tables] = this.groups[g]!;
      pass.setBindGroup(0, atmosphere);
      pass.setBindGroup(1, tables);
      pass.draw(3, 1, 0, g);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
    weights.destroy();
  }

  static async create(
    device: GPUDevice,
    atmosphere: RealtimeAtmosphere,
    targets: SkyTargets,
  ): Promise<Sky> {
    const fragment = GPUShaderStage.FRAGMENT;
    const layouts = {
      atmosphere: device.createBindGroupLayout({
        label: "sky.atmosphere",
        entries: [{ binding: 0, visibility: fragment, buffer: {} }],
      }),
      tables: device.createBindGroupLayout({
        label: "sky.tables",
        entries: [
          { binding: 1, visibility: fragment, texture: {} },
          { binding: 2, visibility: fragment, sampler: {} },
          { binding: 3, visibility: fragment, texture: {} },
        ],
      }),
      view: device.createBindGroupLayout({
        label: "sky.view",
        entries: [{ binding: 0, visibility: fragment, buffer: {} }],
      }),
      table: device.createBindGroupLayout({
        label: "sky.fromTable",
        entries: [
          { binding: 0, visibility: fragment, buffer: {} },
          { binding: 1, visibility: fragment, texture: {} },
          { binding: 2, visibility: fragment, sampler: {} },
        ],
      }),
      empty: device.createBindGroupLayout({ label: "sky.empty", entries: [] }),
    };
    const module = device.createShaderModule({
      label: "sky",
      code: `${atmosphereWgsl}\n${skyWgsl}`,
    });
    const [color, ...others] = targets.colorFormats;
    // The groups' wavelengths add up; alpha 1 marks the sky as drawn (the
    // exposure meter counts it).
    const additive: GPUBlendState = {
      color: { srcFactor: "one", dstFactor: "one", operation: "add" },
      alpha: { srcFactor: "one", dstFactor: "one", operation: "max" },
    };
    const scene = (
      entryPoint: string,
      bindGroupLayouts: GPUBindGroupLayout[],
    ): GPURenderPipelineDescriptor => ({
      label: `sky.${entryPoint}`,
      layout: device.createPipelineLayout({ bindGroupLayouts }),
      vertex: { module, entryPoint: "skyVertex" },
      fragment: {
        module,
        entryPoint,
        targets: [
          { format: color!, blend: additive },
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
    const marching = [layouts.atmosphere, layouts.tables, layouts.view];
    // A table of the groups' wavelengths added up, in linear sRGB.
    const table = (entryPoint: string): GPURenderPipelineDescriptor => ({
      label: `sky.${entryPoint}`,
      layout: device.createPipelineLayout({ bindGroupLayouts: marching }),
      vertex: { module, entryPoint: "skyVertex" },
      fragment: {
        module,
        entryPoint,
        targets: [{ format: "rgba16float", blend: additive }],
      },
      primitive: { topology: "triangle-list" },
    });
    const [march, skyView, fromTable, sunLight] = await Promise.all([
      device.createRenderPipelineAsync(scene("skyFragment", marching)),
      device.createRenderPipelineAsync(table("skyViewFragment")),
      device.createRenderPipelineAsync(
        scene("skyFromTableFragment", [
          layouts.empty,
          layouts.empty,
          layouts.table,
        ]),
      ),
      device.createRenderPipelineAsync(table("sunLightFragment")),
    ]);
    return new Sky(
      device,
      atmosphere,
      { march, table: skyView, fromTable, sunLight },
      layouts,
    );
  }

  /** A view's uniform, table and bind groups. */
  createView(): SkyView {
    const device = this.device;
    const buffer = device.createBuffer({
      label: "sky.view",
      size: SKY_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const table = device.createTexture({
      label: "sky.table",
      size: [SKY_VIEW_WIDTH, SKY_VIEW_ROWS],
      format: "rgba16float",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    return {
      buffer,
      group: device.createBindGroup({
        label: "sky.view",
        layout: this.viewLayout,
        entries: [{ binding: 0, resource: { buffer } }],
      }),
      table,
      tableTarget: table.createView(),
      tableGroup: device.createBindGroup({
        label: "sky.fromTable",
        layout: this.tableLayout,
        entries: [
          { binding: 0, resource: { buffer } },
          { binding: 1, resource: table.createView() },
          { binding: 2, resource: this.atmosphere.sampler },
        ],
      }),
      inside: true,
    };
  }

  /**
   * Writes a view's uniform: its camera (Earth-fixed, meters), the sun
   * (unit, Earth-fixed), the pre-exposure and whether the sun's disk shows.
   *
   * The atmosphere is a sphere; the camera sits on it at its height above
   * the body's ellipsoid, along the ellipsoid's normal, so the horizon and
   * the light are the local ones wherever the camera is.
   */
  write(
    view: SkyView,
    ellipsoid: Ellipsoid,
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
    const c = ellipsoid.cartesianToCartographic(
      camera.position,
      scratchCartographic,
    );
    const altitude = Math.max(c?.height ?? 0, 1);
    const normal =
      ellipsoid.geodeticSurfaceNormal(camera.position, scratchNormal) ??
      v3.set(scratchNormal, 0, 0, 1);
    const r = (p.bottomRadius + altitude) / 1000;
    // A margin below the top, where the table's rows still resolve the
    // thin shell of atmosphere left above.
    view.inside = r < (p.topRadius - 1000) / 1000;
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
    f[23] = p.bottomRadius / 1000;
    this.device.queue.writeBuffer(view.buffer, 0, this.data, 0, 96);
  }

  /** The weights (bytes 96 on) are constant: written once per view. */
  writeWeights(view: SkyView): void {
    this.device.queue.writeBuffer(view.buffer, 96, this.data, 96);
  }

  /** Renders a view's sky-view table (inside the atmosphere only). */
  encodeTable(
    encoder: GPUCommandEncoder,
    view: SkyView,
    timestampWrites?: GPURenderPassTimestampWrites,
  ): void {
    if (!view.inside) {
      return;
    }
    this.tableAttachment.view = view.tableTarget;
    this.tablePass.timestampWrites = timestampWrites;
    const pass = encoder.beginRenderPass(this.tablePass);
    pass.setPipeline(this.pipelines.table);
    pass.setBindGroup(2, view.group);
    for (let g = 0; g < this.groups.length; g++) {
      const [atmosphere, tables] = this.groups[g]!;
      pass.setBindGroup(0, atmosphere);
      pass.setBindGroup(1, tables);
      pass.draw(3, 1, 0, g);
    }
    pass.end();
  }

  /** Draws the sky in an open opaque pass (after the scene). */
  draw(pass: GPURenderPassEncoder, view: SkyView): void {
    if (view.inside) {
      pass.setPipeline(this.pipelines.fromTable);
      pass.setBindGroup(0, this.empty);
      pass.setBindGroup(1, this.empty);
      pass.setBindGroup(2, view.tableGroup);
      pass.draw(3);
      return;
    }
    pass.setPipeline(this.pipelines.march);
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
