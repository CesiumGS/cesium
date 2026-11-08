/**
 * A scene on the fake GPU (test/fakeGpu.ts) for tests of what styling
 * asks of the device: one triangle with a feature table, a view of it,
 * and counts of the shader modules and render pipelines created.
 */
import type { Engine } from "../src/scene/Engine.ts";
import type { FeatureTable, GltfAsset } from "../src/io/gltfTypes.ts";
import type { CustomShader } from "../src/scene/CustomShader.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
} from "./fakeGpu.ts";

export interface StyleScene {
  engine: Engine;
  /** Places the triangle with `shader` (or the default) and returns a way to change it. */
  setShader(shader: CustomShader | undefined): void;
  /** Renders until the pipelines asked for have been made. */
  settle(): Promise<void>;
  /** Shader modules and render pipelines created so far, by label. */
  readonly created: { modules: number; pipelines: string[] };
}

/** One triangle whose feature `table` has one row per feature. */
function triangle(table: FeatureTable): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        featureIds: new Uint32Array([0, 0, 0]),
        featureTable: 0,
        featureCount: table.count,
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [
      {
        mesh: 0,
        material: -1,
        matrix: Float64Array.from([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]),
      },
    ],
    featureTables: [table],
    warnings: [],
  };
}

/**
 * The scene, with shadows and ambient occlusion on, as the parity pages
 * have them (the opaque pass, its shadow, depth prepass and depth pipelines).
 * Call after any `vi.mock`s: it imports the engine.
 */
export async function styleScene(table: FeatureTable): Promise<StyleScene> {
  installGpuGlobals();
  const device = fakeDevice({});
  const created = { modules: 0, pipelines: [] as string[] };
  const wrapped = device as unknown as Record<string, unknown>;
  const module = device.createShaderModule.bind(device);
  wrapped.createShaderModule = (d: GPUShaderModuleDescriptor) => {
    created.modules++;
    return module(d);
  };
  for (const name of ["createRenderPipeline", "createRenderPipelineAsync"]) {
    const make = (
      device as unknown as Record<
        string,
        (d: GPURenderPipelineDescriptor) => unknown
      >
    )[name]!.bind(device);
    wrapped[name] = (d: GPURenderPipelineDescriptor) => {
      created.pipelines.push(d.label ?? "");
      return make(d);
    };
  }
  installFakeNavigator(device);
  const { Engine } = await import("../src/scene/Engine.ts");
  const { OffscreenTarget } = await import("../src/index.ts");
  const engine = await Engine.create({ limits: "adapter" });
  const world = engine.createWorld();
  const view = engine.addView({
    target: new OffscreenTarget(64, 48),
    world,
    lighting: { environment: "procedural" },
    shadows: true,
    ambientOcclusion: true,
  });
  view.camera.lookAt(new Float64Array([6378137, 0, 0]), 0, -Math.PI / 2, 10);
  const model = engine.uploadModel(world, triangle(table));
  const placement = model.place({
    modelMatrix: new Float64Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 6378137, 0, 0, 1,
    ]),
  });
  model.release();
  const settle = async () => {
    for (let i = 0; i < 30; i++) {
      engine.renderFrame();
      await new Promise((resolve) => setImmediate(resolve));
    }
  };
  return {
    engine,
    setShader: (shader) => placement.setShader(shader),
    settle,
    created,
  };
}
