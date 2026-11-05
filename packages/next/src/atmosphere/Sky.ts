import atmosphereWgsl from "./atmosphere.wgsl?raw";
import skyWgsl from "./sky.wgsl?raw";
import type { RealtimeAtmosphere } from "./RealtimeAtmosphere.ts";
import type { AerosolType } from "./model.ts";
import type { Ellipsoid, Cartographic } from "../math/ellipsoid.ts";
import * as v3 from "../math/vec3.ts";
import { MipGenerator } from "../gpu/MipGenerator.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Camera } from "../scene/Camera.ts";
import { STAR_FLOATS, type StarField } from "./stars.ts";
import {
  MOON_ALBEDO,
  lommelSeeliger,
  moonPhaseBrightness,
} from "../time/moon.ts";

/** The sun's angular diameter seen from the Earth, radians (mean). */
export const SUN_ANGULAR_DIAMETER = 0.00935;

/** Bytes of the WGSL `Sky` uniform (sky.wgsl). */
const SKY_SIZE = 320;
/** The Earth's geometric albedo (earthshine on the Moon). */
const EARTH_ALBEDO = 0.367;
/** Bytes between the environment faces' `Sky` uniforms. */
const FACE_STRIDE = 512;

/**
 * Camera altitudes, km, across which aerial perspective from high up moves
 * from the per-vertex march to the screen grid (sky.wgsl
 * `aerialScreenFragment`): there the coarsest tiles' triangles span
 * hundreds of kilometers.
 */
const SCREEN_HAZE_FROM = 500;
const SCREEN_HAZE_TO = 1000;
/** The screen grid's size (sky.wgsl `AERIAL_SCREEN`). */
const AERIAL_SCREEN: [number, number] = [640, 400];
/** The aerial-perspective volume: 32 × 32 directions × 128 distances. */
const AERIAL_SIZE = 32;
const AERIAL_SLICES = 128;
/**
 * Camera altitudes, km, across which aerial perspective moves from the
 * volume to a march per vertex (the opaque pass's `aerialMarch`). From
 * higher up a pixel's ray and its neighbor's in the volume, at the same
 * distance, are at heights kilometers apart near the ground, where the haze
 * changes fastest: interpolating between them drew bands at the volume's
 * row spacing. Near the ground they're close; the volume is cheaper.
 */
const MARCH_FROM = 2;
const MARCH_TO = 5;
/** Bytes of the opaque pass's `Air`: both groups' `Atmosphere`, weights. */
const AIR_SIZE = 2 * 112 + 8 * 16;

/** Ray-march steps per pixel, above the atmosphere. */
const SKY_STEPS = 32;

/**
 * The sky-view table: 192 × 108 directions, a row for the sun, then 108
 * for the Moon's sky (sky.wgsl `skyViewFragment`).
 */
const SKY_VIEW_WIDTH = 192;
const SKY_VIEW_ROWS = 217;

export interface SkyTargets {
  colorFormats: GPUTextureFormat[];
  depthFormat: GPUTextureFormat;
  sampleCount: number;
}

/** One view's sky: its uniform, its sky-view table and their bind groups. */
/** The Moon as a view's camera sees it (`Sky.write`), Earth-fixed axes. */
export interface MoonView {
  /** Toward its center from the camera (unit). */
  direction: ArrayLike<number>;
  /** The sine of its angular radius. */
  sinRadius: number;
  /**
   * Its axes: toward its longitude and latitude 0 (the near side's
   * center), and its north pole (unit).
   */
  meridian: ArrayLike<number>;
  north: ArrayLike<number>;
  /** From it toward the sun (unit). */
  toSun: ArrayLike<number>;
  /** At it, between the sun and the camera, radians (0: full). */
  phaseAngle: number;
  /** The sine of the Earth's angular radius seen from it (earthshine). */
  earthRadius: number;
  /**
   * Its illuminance as a share of the sun's above the atmosphere, for the
   * light the air scatters (0 while the sun is up: by day it's lost).
   */
  airShare: number;
}

export interface SkyView {
  buffer: GPUBuffer;
  /** The uniform alone (marching, and building the table). */
  group: GPUBindGroup;
  table: GPUTexture;
  tableTarget: GPUTextureView;
  /** The uniform and the table (drawing from it). */
  tableGroup: GPUBindGroup;
  /** The aerial-perspective volume's two dispatches (group 0, then 1). */
  aerialGroups: [GPUBindGroup, GPUBindGroup];
  /** The camera is inside the atmosphere: the sky comes from the table. */
  inside: boolean;
  /** The camera on the atmosphere's sphere, km, planet-centered. */
  position: [number, number, number];
  /**
   * How much of aerial perspective is marched per vertex rather than read
   * from the volume, 0 to 1, by the camera's altitude (`MARCH_FROM`).
   */
  march: number;
  /**
   * How much of it comes from the screen grid instead of the vertices, 0
   * to 1, by altitude (`SCREEN_HAZE_FROM`).
   */
  screenHaze: number;
  /**
   * The aerial-perspective volume's first and last slice distances along
   * view rays, km (from the atmosphere's nearest point above it, to its far
   * edge), the same for every ray.
   */
  aerialStart: number;
  aerialEnd: number;
  /** Six `Sky` uniforms, `FACE_STRIDE` apart: the environment cube's faces. */
  faceUniforms: GPUBuffer;
  /** Per face: its uniform alone (marching), and with the table. */
  faceGroups: GPUBindGroup[];
  faceTableGroups: GPUBindGroup[];
  /** The stars' group for this view's star layer (rebuilt as it changes). */
  starGroup?: GPUBindGroup;
  starLayer?: GPUTextureView;
  starFor?: GPUBuffer;
  starMoon?: GPUTexture;
}

type Pipelines = Record<
  | "march"
  | "table"
  | "fromTable"
  | "sunLight"
  | "environment"
  | "environmentFromTable"
  | "stars"
  | "aerialScreen",
  GPURenderPipeline
>;

/** The environment cube's face size (Environment's sky cube). */
const ENVIRONMENT_SIZE = 128;

/**
 * Cube faces as 90° views in the environment frame (east, up, −north):
 * forward, right and up, matching ibl.wgsl `cubeDirection` (WebGPU layer
 * order +X, −X, +Y, −Y, +Z, −Z).
 */
const CUBE_FACES: ReadonlyArray<readonly [V3, V3, V3]> = [
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [-1, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ],
  [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, -1],
    [-1, 0, 0],
    [0, 1, 0],
  ],
];

type V3 = readonly [number, number, number];

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
  /**
   * The aerial-perspective volume (sky.wgsl `aerialCompute`): in-scattered
   * light (cd/m², pre-exposed) and transmittance, by screen position and
   * distance. One pair, rewritten for each view before its opaque pass
   * reads it; another holds the first wavelength group's share.
   */
  /**
   * The view's aerial-perspective volume: in-scatter in slices
   * 0..AERIAL_SLICES-1, transmittance in the next AERIAL_SLICES (one
   * sampled texture in the opaque pass instead of two, §13.15).
   */
  readonly aerialVolume: GPUTexture;
  /**
   * Aerial perspective from high up on a screen grid (sky.wgsl
   * `aerialScreenFragment`): in-scattered light and transmittance.
   */
  readonly aerialScreen: GPUTexture;
  private readonly aerialScreenPass: GPURenderPassDescriptor;
  /** The first wavelength group's share, as `aerialVolume` is laid out. */
  private readonly aerialPartial: GPUTexture;
  /**
   * For the opaque pass's per-vertex march (opaque.wgsl `aerialMarch`): both
   * wavelength groups' parameters and the bands' weights (`Air`), and their
   * transmittance and multiple-scattering tables as two-layer arrays.
   */
  readonly air: GPUBuffer;
  readonly airTransmittance: GPUTexture;
  readonly airScattering: GPUTexture;
  /**
   * The stars (sky.wgsl `starLight`, atmosphere/stars.ts): their uniform
   * (Earth-fixed to ICRF, and whether there are any), the points (one
   * placeholder until set), the background (a cube in the celestial frame,
   * cd/m²; black until set), and the groups splatting and reading them.
   */
  private readonly starUniform: GPUBuffer;
  private starBackground: GPUTexture;
  private starPoints: GPUBuffer;
  private starCount = 0;
  private starSplatGroup: GPUBindGroup;
  private readonly starLayout: GPUBindGroupLayout;
  private readonly starSplatLayout: GPUBindGroupLayout;
  private readonly starSampler: GPUSampler;
  private readonly starData = new Float32Array(12);
  private starsOn = 0;
  private readonly starPass: GPURenderPassDescriptor;
  private readonly starAttachment: GPURenderPassColorAttachment;
  /** The Moon's albedo map (white until one is set) and its mean albedo. */
  private moonMap: GPUTexture;
  private moonMean = 1;
  /** The Moon map's levels. */
  private mips?: MipGenerator;
  /**
   * @internal For checks: how much aerial perspective is marched per vertex
   * whatever the altitude (Lab "Real-time sky"); undefined: by altitude.
   */
  marchOverride: number | undefined;
  private readonly aerialPipelines: [GPUComputePipeline, GPUComputePipeline];
  private readonly aerialLayout: GPUBindGroupLayout;

  private constructor(
    private readonly device: GPUDevice,
    readonly atmosphere: RealtimeAtmosphere,
    pipelines: Pipelines,
    aerialPipelines: [GPUComputePipeline, GPUComputePipeline],
    layouts: Record<
      | "atmosphere"
      | "tables"
      | "view"
      | "table"
      | "empty"
      | "aerial"
      | "stars"
      | "starSplat",
      GPUBindGroupLayout
    >,
  ) {
    this.pipelines = pipelines;
    this.starLayout = layouts.stars;
    this.starSplatLayout = layouts.starSplat;
    this.starAttachment = {
      view: undefined as never,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: "clear",
      storeOp: "store",
    };
    this.starPass = { label: "stars", colorAttachments: [this.starAttachment] };
    // In-scatter (layer 0) and transmittance (layer 1) in one array: one
    // sampled texture in the opaque pass instead of two (the base tier's
    // 16, §13.15), each layer one of the pass's two targets.
    this.aerialScreen = device.createTexture({
      label: "sky.aerialScreen",
      size: [...AERIAL_SCREEN, 2],
      format: "rgba16float",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.aerialScreenPass = {
      label: "aerial-screen",
      colorAttachments: [0, 1].map((layer) => ({
        view: this.aerialScreen.createView({
          dimension: "2d",
          baseArrayLayer: layer,
          arrayLayerCount: 1,
        }),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear" as const,
        storeOp: "store" as const,
      })),
    };
    this.aerialPipelines = aerialPipelines;
    this.aerialLayout = layouts.aerial;
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
    this.air = device.createBuffer({
      label: "sky.air",
      size: AIR_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const layers = (label: string, size: number, height: number) =>
      device.createTexture({
        label,
        size: [size, height, 2],
        format: "rgba16float",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });
    this.airTransmittance = layers("sky.airTransmittance", 256, 64);
    this.airScattering = layers("sky.airScattering", 32, 32);
    this.buildAir();
    this.starUniform = device.createBuffer({
      label: "sky.stars",
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Filtered across the Moon map's levels, anisotropically (its disk's
    // limb and poles squeeze it); the star background is read at its top
    // level.
    this.starSampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 16,
    });
    this.starBackground = this.createStarBackground(1);
    this.starPoints = this.createStarPoints(1);
    this.moonMap = this.createMoonMap(1, 1);
    device.queue.writeTexture(
      { texture: this.moonMap },
      new Uint8Array([255, 255, 255, 255]),
      {},
      [1, 1],
    );
    this.starSplatGroup = this.createStarSplatGroup();
    const volume = (label: string, extra = 0) =>
      device.createTexture({
        label,
        size: [AERIAL_SIZE, AERIAL_SIZE, 2 * AERIAL_SLICES],
        dimension: "3d",
        format: "rgba16float",
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          extra,
      });
    // COPY_SRC: checked against the march (Lab "Real-time sky").
    this.aerialVolume = volume("sky.aerialVolume", GPUTextureUsage.COPY_SRC);
    this.aerialPartial = volume("sky.aerialPartial");
  }

  /**
   * Encodes a view's aerial-perspective volume (after `write`): each column
   * marched once, every slice written, one dispatch per wavelength group
   * (the second adds the first's share).
   */
  encodeAerial(
    encoder: GPUCommandEncoder,
    view: SkyView,
    timestampWrites?: GPUComputePassTimestampWrites,
  ): void {
    const pass = encoder.beginComputePass({
      label: "aerial-perspective",
      ...(timestampWrites ? { timestampWrites } : {}),
    });
    for (let g = 0; g < this.groups.length; g++) {
      const [atmosphere, tables] = this.groups[g]!;
      pass.setPipeline(this.aerialPipelines[g]!);
      pass.setBindGroup(0, atmosphere);
      pass.setBindGroup(1, tables);
      pass.setBindGroup(2, view.aerialGroups[g]!);
      pass.dispatchWorkgroups(AERIAL_SIZE, AERIAL_SIZE);
    }
    pass.end();
  }

  /**
   * Encodes aerial perspective from high up on the screen grid (after
   * `write`; only where `screenHaze` > 0).
   */
  encodeAerialScreen(encoder: GPUCommandEncoder, view: SkyView): void {
    const pass = encoder.beginRenderPass(this.aerialScreenPass);
    pass.setPipeline(this.pipelines.aerialScreen);
    pass.setBindGroup(2, view.group);
    for (let g = 0; g < this.groups.length; g++) {
      const [atmosphere, tables] = this.groups[g]!;
      pass.setBindGroup(0, atmosphere);
      pass.setBindGroup(1, tables);
      pass.draw(3, 1, 0, g);
    }
    pass.end();
  }

  /** Releases the sun-light table and the aerial-perspective volumes. */
  destroy(): void {
    this.aerialScreen.destroy();
    this.sunLight.destroy();
    this.aerialVolume.destroy();
    {
      this.aerialPartial.destroy();
    }
    this.air.destroy();
    this.airTransmittance.destroy();
    this.airScattering.destroy();
    this.starUniform.destroy();
    this.starBackground.destroy();
    this.starPoints.destroy();
    this.moonMap.destroy();
  }

  /**
   * Sets the stars (atmosphere/stars.ts `extractStars`): their points and
   * the background, its faces as the star map's (upside down to WebGPU's
   * cube layout, as 1.x uploads them). Null: no stars.
   */
  setStarField(field: StarField | null): void {
    const oldBackground = this.starBackground;
    const oldPoints = this.starPoints;
    if (!field || field.count === 0) {
      this.starBackground = this.createStarBackground(1);
      this.starPoints = this.createStarPoints(1);
      this.starCount = 0;
      this.starsOn = 0;
    } else {
      const n = field.backgroundSize;
      this.starBackground = this.createStarBackground(n);
      const halves = new Uint16Array(n * n * 4);
      field.background.forEach((face, f) => {
        for (let y = 0; y < n; y++) {
          for (let k = 0; k < n * 4; k++) {
            halves[y * n * 4 + k] = floatToHalf(face[(n - 1 - y) * n * 4 + k]!);
          }
        }
        this.device.queue.writeTexture(
          { texture: this.starBackground, origin: [0, 0, f] },
          halves,
          { bytesPerRow: n * 8 },
          [n, n],
        );
      });
      this.starPoints = this.createStarPoints(field.count);
      this.device.queue.writeBuffer(
        this.starPoints,
        0,
        field.points,
        0,
        field.count * STAR_FLOATS,
      );
      this.starCount = field.count;
      this.starsOn = 1;
    }
    this.starSplatGroup = this.createStarSplatGroup();
    oldBackground.destroy();
    oldPoints.destroy();
  }

  /**
   * Sets the Moon's albedo map: equirectangular, longitude 0 (the near
   * side's center) in the middle, north up, sRGB; its mean sets the scale
   * (the disk's total follows the Moon's albedo, `MOON_ALBEDO`). Null: a
   * uniform disk.
   */
  setMoonMap(image: ImageBitmap | null): void {
    const old = this.moonMap;
    if (!image) {
      this.moonMap = this.createMoonMap(1, 1);
      this.device.queue.writeTexture(
        { texture: this.moonMap },
        new Uint8Array([255, 255, 255, 255]),
        {},
        [1, 1],
      );
      this.moonMean = 1;
    } else {
      const { width, height } = image;
      this.moonMap = this.createMoonMap(width, height);
      this.device.queue.copyExternalImageToTexture(
        { source: image },
        { texture: this.moonMap },
        [width, height],
      );
      (this.mips ??= new MipGenerator(this.device)).generate(this.moonMap);
      this.moonMean = meanAlbedo(image);
    }
    old.destroy();
  }

  private createMoonMap(width: number, height: number): GPUTexture {
    return this.device.createTexture({
      label: "sky.moonMap",
      size: [width, height],
      mipLevelCount: MipGenerator.levelCount(width, height),
      format: "rgba8unorm-srgb",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  /**
   * Turns the stars: `icrfToFixed`, the celestial frame's rotation to
   * Earth-fixed axes (row-major, `icrfToFixed` in time/celestial.ts).
   */
  writeStars(icrfToFixed: ArrayLike<number>): void {
    const f = this.starData;
    // The shader turns Earth-fixed directions back: the transpose, by rows.
    for (let i = 0; i < 3; i++) {
      f[i * 4] = icrfToFixed[i]!;
      f[i * 4 + 1] = icrfToFixed[3 + i]!;
      f[i * 4 + 2] = icrfToFixed[6 + i]!;
      f[i * 4 + 3] = 0;
    }
    f[3] = this.starsOn;
    this.device.queue.writeBuffer(this.starUniform, 0, f);
  }

  private createStarBackground(size: number): GPUTexture {
    return this.device.createTexture({
      label: "sky.starBackground",
      size: [size, size, 6],
      dimension: "2d",
      format: "rgba16float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
  }

  private createStarPoints(count: number): GPUBuffer {
    return this.device.createBuffer({
      label: "sky.starPoints",
      size: Math.max(count, 1) * STAR_FLOATS * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createStarSplatGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      label: "sky.starSplat",
      layout: this.starSplatLayout,
      entries: [
        { binding: 0, resource: { buffer: this.starUniform } },
        { binding: 5, resource: { buffer: this.starPoints } },
      ],
    });
  }

  /** The stars' group reading `layer` (the view's, cached while it holds). */
  private starGroupFor(view: SkyView, layer: GPUTextureView): GPUBindGroup {
    if (
      !view.starGroup ||
      view.starLayer !== layer ||
      view.starFor !== this.starPoints ||
      view.starMoon !== this.moonMap
    ) {
      view.starLayer = layer;
      view.starFor = this.starPoints;
      view.starMoon = this.moonMap;
      view.starGroup = this.device.createBindGroup({
        label: "sky.stars",
        layout: this.starLayout,
        entries: [
          { binding: 0, resource: { buffer: this.starUniform } },
          {
            binding: 1,
            resource: this.starBackground.createView({ dimension: "cube" }),
          },
          { binding: 2, resource: this.starSampler },
          { binding: 3, resource: this.moonMap.createView() },
          { binding: 4, resource: layer },
        ],
      });
    }
    return view.starGroup;
  }

  /**
   * Splats the stars into a view's star layer (`layer`, rgba16float at the
   * view's size; cleared): each through its point spread function, in
   * cd/m², for the sky to read (`draw`).
   */
  encodeStars(
    encoder: GPUCommandEncoder,
    view: SkyView,
    layer: GPUTextureView,
  ): void {
    this.starAttachment.view = layer;
    const pass = encoder.beginRenderPass(this.starPass);
    if (this.starCount > 0) {
      pass.setPipeline(this.pipelines.stars);
      pass.setBindGroup(0, this.empty);
      pass.setBindGroup(1, this.empty);
      pass.setBindGroup(2, view.group);
      pass.setBindGroup(3, this.starSplatGroup);
      pass.draw(6, this.starCount);
    }
    pass.end();
  }

  /**
   * Encodes rendering the sky as the environment around `position`
   * (Earth-fixed, meters) into the top level of `cube`, in the environment
   * frame `frame` (east, up, −north there): radiance in cd/m², not exposed,
   * without the sun's disk (the sun lights the scene directly). With
   * `fromTable`, from the view's sky-view table encoded earlier this frame
   * (a lookup per texel; `exposure` is the view's, which the table carries);
   * otherwise by marching each texel. The caller builds the probe's mips,
   * specular and irradiance cubes from it (`Environment.build`).
   */
  encodeEnvironment(
    encoder: GPUCommandEncoder,
    view: SkyView,
    cube: GPUTexture,
    ellipsoid: Ellipsoid,
    position: Vec3,
    frame: readonly [Vec3, Vec3, Vec3],
    sun: ArrayLike<number>,
    fromTable: { exposure: number } | undefined,
  ): void {
    const f = this.f32;
    this.placeCamera(ellipsoid, position);
    f[3] = fromTable ? 1 / fromTable.exposure : 1;
    f[4] = sun[0]!;
    f[5] = sun[1]!;
    f[6] = sun[2]!;
    f[7] = 2; // no disk
    f[63] = 0; // nor the Moon
    f[11] = 1;
    f[15] = 1;
    f[19] = 1;
    f[20] = ENVIRONMENT_SIZE;
    f[21] = ENVIRONMENT_SIZE;
    f[22] = SKY_STEPS;
    const world = (v: V3, at: number) => {
      for (let k = 0; k < 3; k++) {
        f[at + k] =
          frame[0][k]! * v[0] + frame[1][k]! * v[1] + frame[2][k]! * v[2];
      }
    };
    CUBE_FACES.forEach(([forward, right, up], face) => {
      world(forward, 8);
      world(right, 12);
      world(up, 16);
      this.device.queue.writeBuffer(
        view.faceUniforms,
        face * FACE_STRIDE,
        this.data,
      );
    });
    for (let face = 0; face < 6; face++) {
      const pass = encoder.beginRenderPass({
        label: "sky.environment",
        colorAttachments: [
          {
            view: cube.createView({
              dimension: "2d",
              baseMipLevel: 0,
              mipLevelCount: 1,
              baseArrayLayer: face,
              arrayLayerCount: 1,
            }),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      if (fromTable) {
        pass.setPipeline(this.pipelines.environmentFromTable);
        pass.setBindGroup(0, this.empty);
        pass.setBindGroup(1, this.empty);
        pass.setBindGroup(2, view.faceTableGroups[face]!);
        pass.draw(3);
      } else {
        pass.setPipeline(this.pipelines.environment);
        pass.setBindGroup(2, view.faceGroups[face]!);
        for (let g = 0; g < this.groups.length; g++) {
          const [atmosphere, tables] = this.groups[g]!;
          pass.setBindGroup(0, atmosphere);
          pass.setBindGroup(1, tables);
          pass.draw(3, 1, 0, g);
        }
      }
      pass.end();
    }
  }

  /**
   * The camera on the atmosphere's sphere (uniform words 0-2 and 23): at
   * its height above the body's ellipsoid, along the ellipsoid's normal;
   * the sphere unscaled (words 76-78). Returns the radius, km.
   */
  private placeCamera(ellipsoid: Ellipsoid, position: Vec3): number {
    const f = this.f32;
    const p = this.atmosphere.parameters;
    f[76] = 1;
    f[77] = 1;
    f[78] = 1;
    const c = ellipsoid.cartesianToCartographic(position, scratchCartographic);
    const altitude = Math.max(c?.height ?? 0, 1);
    const normal =
      ellipsoid.geodeticSurfaceNormal(position, scratchNormal) ??
      v3.set(scratchNormal, 0, 0, 1);
    const r = (p.bottomRadius + altitude) / 1000;
    f[0] = normal[0]! * r;
    f[1] = normal[1]! * r;
    f[2] = normal[2]! * r;
    f[23] = p.bottomRadius / 1000;
    return r;
  }

  /**
   * The atmosphere's haze (visibility, km, and kind of aerosols): rebuilds
   * its tables and the sun-light table. Views' environments need
   * rebuilding after (Engine).
   */
  setHaze(kilometers: number | undefined, aerosol?: AerosolType): void {
    if (
      kilometers === this.atmosphere.visibility &&
      aerosol === this.atmosphere.aerosol
    ) {
      return;
    }
    this.atmosphere.setHaze(kilometers, aerosol);
    this.buildSunLight();
    this.buildAir();
  }

  /** Gathers both wavelength groups for the opaque pass's march. */
  private buildAir(): void {
    const device = this.device;
    const encoder = device.createCommandEncoder({ label: "sky.air" });
    this.atmosphere.groups.forEach((g, i) => {
      encoder.copyBufferToBuffer(g.uniforms, 0, this.air, i * 112, 112);
      encoder.copyTextureToTexture(
        { texture: g.transmittance },
        { texture: this.airTransmittance, origin: [0, 0, i] },
        [256, 64],
      );
      encoder.copyTextureToTexture(
        { texture: g.multipleScattering },
        { texture: this.airScattering, origin: [0, 0, i] },
        [32, 32],
      );
    });
    device.queue.submit([encoder.finish()]);
    // The band weights, as in the `Sky` uniform.
    device.queue.writeBuffer(this.air, 224, this.data, 96, 128);
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
    const compute = GPUShaderStage.COMPUTE;
    const both = fragment | compute;
    const volume = (binding: number): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: compute,
      texture: { viewDimension: "3d", sampleType: "unfilterable-float" },
    });
    const store = (binding: number): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: compute,
      storageTexture: {
        access: "write-only",
        format: "rgba16float",
        viewDimension: "3d",
      },
    });
    const layouts = {
      atmosphere: device.createBindGroupLayout({
        label: "sky.atmosphere",
        entries: [{ binding: 0, visibility: both, buffer: {} }],
      }),
      tables: device.createBindGroupLayout({
        label: "sky.tables",
        entries: [
          { binding: 1, visibility: both, texture: {} },
          { binding: 2, visibility: both, sampler: {} },
          { binding: 3, visibility: both, texture: {} },
        ],
      }),
      aerial: device.createBindGroupLayout({
        label: "sky.aerial",
        entries: [
          { binding: 0, visibility: compute, buffer: {} },
          volume(5),
          store(7),
        ],
      }),
      view: device.createBindGroupLayout({
        label: "sky.view",
        entries: [
          {
            binding: 0,
            visibility: fragment | GPUShaderStage.VERTEX,
            buffer: {},
          },
        ],
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
      stars: device.createBindGroupLayout({
        label: "sky.stars",
        entries: [
          { binding: 0, visibility: fragment, buffer: {} },
          {
            binding: 1,
            visibility: fragment,
            texture: { viewDimension: "cube" },
          },
          { binding: 2, visibility: fragment, sampler: {} },
          { binding: 3, visibility: fragment, texture: {} },
          {
            binding: 4,
            visibility: fragment,
            texture: { sampleType: "unfilterable-float" },
          },
        ],
      }),
      starSplat: device.createBindGroupLayout({
        label: "sky.starSplat",
        entries: [
          { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} },
          {
            binding: 5,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "read-only-storage" },
          },
        ],
      }),
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
    // A table of the groups' wavelengths added up, in linear sRGB; alpha
    // adds too (the sky-view table's transmittance to space, for the stars).
    const summed: GPUBlendState = {
      color: additive.color,
      alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
    };
    const table = (entryPoint: string): GPURenderPipelineDescriptor => ({
      label: `sky.${entryPoint}`,
      layout: device.createPipelineLayout({ bindGroupLayouts: marching }),
      vertex: { module, entryPoint: "skyVertex" },
      fragment: {
        module,
        entryPoint,
        targets: [{ format: "rgba16float", blend: summed }],
      },
      primitive: { topology: "triangle-list" },
    });
    const [
      march,
      skyView,
      fromTable,
      sunLight,
      environment,
      environmentFromTable,
      aerial0,
      aerial1,
      stars,
      aerialScreen,
    ] = await Promise.all([
      device.createRenderPipelineAsync(
        scene("skyStarsFragment", [...marching, layouts.stars]),
      ),
      device.createRenderPipelineAsync(table("skyViewFragment")),
      device.createRenderPipelineAsync(
        scene("skyFromTableFragment", [
          layouts.empty,
          layouts.empty,
          layouts.table,
          layouts.stars,
        ]),
      ),
      device.createRenderPipelineAsync(table("sunLightFragment")),
      device.createRenderPipelineAsync(table("skyFragment")),
      device.createRenderPipelineAsync({
        label: "sky.environmentFromTable",
        layout: device.createPipelineLayout({
          bindGroupLayouts: [layouts.empty, layouts.empty, layouts.table],
        }),
        vertex: { module, entryPoint: "skyVertex" },
        fragment: {
          module,
          entryPoint: "environmentFromTableFragment",
          targets: [{ format: "rgba16float" }],
        },
        primitive: { topology: "triangle-list" },
      }),
      ...[0, 1].map((group) =>
        device.createComputePipelineAsync({
          label: `sky.aerial${group}`,
          layout: device.createPipelineLayout({
            bindGroupLayouts: [
              layouts.atmosphere,
              layouts.tables,
              layouts.aerial,
            ],
          }),
          compute: {
            module,
            entryPoint: "aerialCompute",
            constants: { AERIAL_GROUP: group },
          },
        }),
      ),
      // The stars' splats into the view's star layer, adding up.
      device.createRenderPipelineAsync({
        label: "sky.stars",
        layout: device.createPipelineLayout({
          bindGroupLayouts: [
            layouts.empty,
            layouts.empty,
            layouts.view,
            layouts.starSplat,
          ],
        }),
        vertex: { module, entryPoint: "starVertex" },
        fragment: {
          module,
          entryPoint: "starFragment",
          targets: [
            {
              format: "rgba16float",
              blend: {
                color: { srcFactor: "one", dstFactor: "one", operation: "add" },
                alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
              },
            },
          ],
        },
        primitive: { topology: "triangle-list" },
      }),
      device.createRenderPipelineAsync({
        label: "sky.aerialScreen",
        layout: device.createPipelineLayout({
          bindGroupLayouts: [layouts.atmosphere, layouts.tables, layouts.view],
        }),
        vertex: { module, entryPoint: "skyVertex" },
        fragment: {
          module,
          entryPoint: "aerialScreenFragment",
          targets: [
            { format: "rgba16float", blend: additive },
            { format: "rgba16float", blend: additive },
          ],
        },
        primitive: { topology: "triangle-list" },
      }),
    ]);
    return new Sky(
      device,
      atmosphere,
      {
        march,
        table: skyView,
        fromTable,
        sunLight,
        environment,
        environmentFromTable,
        stars: stars as GPURenderPipeline,
        aerialScreen: aerialScreen as GPURenderPipeline,
      },
      [aerial0 as GPUComputePipeline, aerial1 as GPUComputePipeline],
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
    const faceUniforms = device.createBuffer({
      label: "sky.environment",
      size: 6 * FACE_STRIDE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const face = (index: number): GPUBufferBinding => ({
      buffer: faceUniforms,
      offset: index * FACE_STRIDE,
      size: SKY_SIZE,
    });
    const tableView = table.createView();
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
      aerialStart: 0,
      aerialEnd: 0,
      position: [0, 0, 0],
      march: 0,
      screenHaze: 0,
      // Group 0 writes its share into the partial volume (the final one is
      // bound, unused, as its input); group 1 adds it and writes the final.
      aerialGroups: [
        [this.aerialVolume, this.aerialPartial],
        [this.aerialPartial, this.aerialVolume],
      ].map(([input, output]) =>
        device.createBindGroup({
          label: "sky.aerial",
          layout: this.aerialLayout,
          entries: [
            { binding: 0, resource: { buffer } },
            { binding: 5, resource: input!.createView() },
            { binding: 7, resource: output!.createView() },
          ],
        }),
      ) as [GPUBindGroup, GPUBindGroup],
      faceUniforms,
      faceGroups: CUBE_FACES.map((_, i) =>
        device.createBindGroup({
          label: "sky.environment",
          layout: this.viewLayout,
          entries: [{ binding: 0, resource: face(i) }],
        }),
      ),
      faceTableGroups: CUBE_FACES.map((_, i) =>
        device.createBindGroup({
          label: "sky.environmentFromTable",
          layout: this.tableLayout,
          entries: [
            { binding: 0, resource: face(i) },
            { binding: 1, resource: tableView },
            { binding: 2, resource: this.atmosphere.sampler },
          ],
        }),
      ),
    };
  }

  /**
   * Writes a view's uniform: its camera (Earth-fixed, meters), the sun
   * (unit, Earth-fixed), the pre-exposure, whether the sun's disk shows,
   * the stars' exposure against a dark sky (0: the view's) and the Moon
   * as the camera sees it (undefined: none).
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
    starExposure = 0,
    moon?: MoonView,
    cityLight = 0,
  ): void {
    const f = this.f32;
    const p = this.atmosphere.parameters;
    const r = this.placeCamera(ellipsoid, camera.position);
    // A margin below the top, where the table's rows still resolve the
    // thin shell of atmosphere left above.
    view.inside = r < (p.topRadius - 1000) / 1000;
    f[79] = globalThis.devicePixelRatio ?? 1;
    if (!view.inside) {
      // From above, the sky is marched where the ellipsoid is the ground
      // sphere (sky.wgsl `marchedSky`): the sphere under the camera alone
      // is up to 20 km off the ellipsoid's edge, the glow along it with it.
      const radii = ellipsoid.radii;
      for (let i = 0; i < 3; i++) {
        f[76 + i] = p.bottomRadius / radii[i]!;
        f[i] = (camera.position[i]! / 1000) * f[76 + i]!;
      }
    }
    // Aerial perspective, from the camera (or where rays can first enter
    // the atmosphere) to its far edge past the horizon.
    const bottom = p.bottomRadius / 1000;
    const top = p.topRadius / 1000;
    view.aerialStart = Math.max(0, r - top);
    view.position[0] = f[0]!;
    view.position[1] = f[1]!;
    view.position[2] = f[2]!;
    const x = Math.min(
      Math.max((r - bottom - MARCH_FROM) / (MARCH_TO - MARCH_FROM), 0),
      1,
    );
    view.march = this.marchOverride ?? x * x * (3 - 2 * x);
    const y = Math.min(
      Math.max(
        (r - bottom - SCREEN_HAZE_FROM) / (SCREEN_HAZE_TO - SCREEN_HAZE_FROM),
        0,
      ),
      1,
    );
    view.screenHaze = y * y * (3 - 2 * y);
    view.aerialEnd =
      Math.sqrt(Math.max(0, r * r - bottom * bottom)) +
      Math.sqrt(top * top - bottom * bottom);
    f[56] = view.aerialStart;
    f[57] = view.aerialEnd;
    f[58] = starExposure;
    f[59] = moon?.airShare ?? 0;
    // The light the ground around emits (cities), cd/m² (cityLight.ts).
    f[75] = cityLight;
    if (moon) {
      f.set(moon.direction, 60);
      f[63] = moon.sinRadius;
      f.set(moon.meridian, 64);
      f.set(moon.north, 68);
      f.set(moon.toSun, 72);
      // A full disk's radiance is the albedo's share of a white Lambertian
      // disk's (E / π); by phase, Allen's total over Lommel-Seeliger's.
      const alpha = Math.min(moon.phaseAngle, (170 * Math.PI) / 180);
      f[67] =
        ((MOON_ALBEDO / Math.PI) * moonPhaseBrightness(alpha)) /
        lommelSeeliger(alpha) /
        this.moonMean;
      // Earthshine: the Earth as a Lambertian sphere (geometric albedo
      // 0.37) seen from the Moon at its phase (about π − the Moon's), its
      // light on the Moon read as the Moon's full-phase brightness.
      const earthPhase = Math.PI - moon.phaseAngle;
      const lambert =
        (Math.sin(earthPhase) + (Math.PI - earthPhase) * Math.cos(earthPhase)) /
        Math.PI;
      const earth = EARTH_ALBEDO * moon.earthRadius * moon.earthRadius;
      f[71] = ((MOON_ALBEDO / Math.PI) * earth * lambert) / this.moonMean;
    } else {
      f[63] = 0;
      f[71] = 0;
    }
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
    this.device.queue.writeBuffer(view.buffer, 224, this.data, 224, 96);
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

  /**
   * Draws the sky in an open opaque pass (after the scene), the stars from
   * the view's layer (`encodeStars`, this frame).
   */
  draw(
    pass: GPURenderPassEncoder,
    view: SkyView,
    starLayer: GPUTextureView,
  ): void {
    const stars = this.starGroupFor(view, starLayer);
    if (view.inside) {
      pass.setPipeline(this.pipelines.fromTable);
      pass.setBindGroup(0, this.empty);
      pass.setBindGroup(1, this.empty);
      pass.setBindGroup(2, view.tableGroup);
      pass.setBindGroup(3, stars);
      pass.draw(3);
      return;
    }
    pass.setPipeline(this.pipelines.march);
    pass.setBindGroup(2, view.group);
    pass.setBindGroup(3, stars);
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

/**
 * An albedo map's mean (linear luminance of its sRGB texels), weighted by
 * latitude's cosine (equirectangular rows shrink toward the poles).
 */
function meanAlbedo(image: ImageBitmap): number {
  const { width, height } = image;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    return 1;
  }
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, width, height).data;
  const linear = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  let sum = 0;
  let weights = 0;
  for (let y = 0; y < height; y++) {
    const w = Math.cos(((y + 0.5) / height - 0.5) * Math.PI);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      sum +=
        w *
        (0.2126 * linear(data[i]!) +
          0.7152 * linear(data[i + 1]!) +
          0.0722 * linear(data[i + 2]!));
      weights += w;
    }
  }
  return sum > 0 ? sum / weights : 1;
}

const halfScratch = new DataView(new ArrayBuffer(4));

/** A float as IEEE half precision bits (round to nearest even). */
function floatToHalf(value: number): number {
  halfScratch.setFloat32(0, value);
  const x = halfScratch.getUint32(0);
  const sign = (x >>> 16) & 0x8000;
  const exponent = ((x >>> 23) & 0xff) - 127 + 15;
  const mantissa = x & 0x7fffff;
  if (exponent >= 31) {
    return sign | 0x7c00;
  }
  if (exponent <= 0) {
    if (exponent < -10) {
      return sign;
    }
    const m = (mantissa | 0x800000) >>> (1 - exponent);
    return sign | ((m + 0x1000) >>> 13);
  }
  return sign | (exponent << 10) | ((mantissa + 0x1000) >>> 13);
}
