import * as m4 from "../math/mat4.ts";
import { MaterialFlags } from "../render/layout.ts";
import { cssColor } from "../scene/styleExpression.ts";
import type { Engine } from "../scene/Engine.ts";
import type { DrawHandle, World } from "../scene/World.ts";
import type { PointCuller } from "../scene/PointCuller.ts";
import type { ModelResource } from "../scene/gltfModel.ts";
import { ModelPool } from "./ModelPool.ts";
import type { PointSource } from "./PointSource.ts";
import {
  compileVectorStyle,
  type CompiledShapeLayer,
  type ResolvedParameter,
  type VectorStyleDocument,
} from "./VectorStyle.ts";

export interface VectorLayerOptions {
  /** The points it draws: one source, or sources by a layer's `source`. */
  source: PointSource | Record<string, PointSource>;
  style: VectorStyleDocument;
  /**
   * Models by resource name (a URL), for `model('name')` shapes; a style
   * resource's `uri` serves otherwise.
   */
  models?: Record<string, string>;
  /** Models each model layer can show at once (default 4,096). */
  slots?: number;
  /**
   * Shapes within this distance of the camera draw in front of everything
   * (m; default 0, depth-tested), as 1.x `disableDepthTestDistance`.
   */
  depthTestDistance?: number;
  /**
   * Symbols this many pixels across or smaller are rasterized in compute
   * (pointCull.wgsl) rather than drawn as quads: a few threads a point
   * instead of six vertices (default 6; 0: always quads).
   */
  splatBelow?: number;
  /** Culling radius of the points around their source's origin (m; default 2,000 km). */
  radius?: number;
}

/**
 * Points drawn by a vector style (vector/VectorStyle.ts): each of its
 * point layers a draw of the source's points (six vertices a point,
 * shaded by the layer's compiled stages), each `model()` layer a
 * `ModelPool` of models for the nearest points it passes. The style's
 * parameters change with `setParameter`, on the GPU, without recompiling.
 */
export class VectorLayer {
  /** The style's parameters, with their current values. */
  readonly parameters: Readonly<Record<string, ResolvedParameter>>;
  private readonly values = new Map<string, number | boolean | string>();
  private readonly shapes: Array<{
    layer: CompiledShapeLayer;
    draw: DrawHandle;
    culler: PointCuller;
  }> = [];
  private readonly pools: ModelPool[] = [];
  private readonly materials: number[] = [];

  private constructor(
    private readonly engine: Engine,
    private readonly world: World,
    parameters: Record<string, ResolvedParameter>,
  ) {
    this.parameters = parameters;
    for (const [name, p] of Object.entries(parameters)) {
      this.values.set(name, p.default);
    }
  }

  /** Compiles the style, loads its models, and adds its draws. */
  static async create(
    engine: Engine,
    world: World,
    options: VectorLayerOptions,
  ): Promise<VectorLayer> {
    const sourceOf = (name: string | undefined): PointSource => {
      const s = options.source;
      if ("mesh" in s) {
        return s as PointSource;
      }
      const sources = s as Record<string, PointSource>;
      const found =
        name !== undefined ? sources[name] : Object.values(sources)[0];
      if (!found) {
        throw new Error(`VectorLayer: no source ${name}`);
      }
      return found;
    };
    // Compiled per source, against its properties.
    const compiled = new Map<
      PointSource,
      ReturnType<typeof compileVectorStyle>
    >();
    const first = sourceOf(undefined);
    const style = compileVectorStyle(options.style, first.layout);
    compiled.set(first, style);
    const layer = new VectorLayer(engine, world, style.parameters);
    // Each model's handle while its pools are placed: then theirs alone.
    const models = new Map<string, Promise<ModelResource>>();
    try {
      for (const l of style.layers) {
        const source = sourceOf(l.source);
        let c = compiled.get(source);
        if (!c) {
          c = compileVectorStyle(options.style, source.layout);
          compiled.set(source, c);
        }
        const own = c.layers.find((x) => x.path === l.path)!;
        if (own.kind === "shape") {
          // Opaque: the symbol's coverage is the sample mask (`fsPoints`).
          const material = world.addMaterial({
            baseColor: [1, 1, 1, 1],
            flags: MaterialFlags.unlit,
          });
          layer.materials.push(material);
          const rotation = m4.copy(m4.mat4(), source.frame);
          rotation[12] = rotation[13] = rotation[14] = 0;
          const draw = world.addDraw({
            mesh: source.mesh,
            origin: source.origin,
            model: rotation,
            radius: options.radius ?? 2e6,
            material,
            unlit: true,
            ground: false,
            billboard: {
              size: 1,
              depthTestDistance: options.depthTestDistance ?? 0,
            },
            shader: own.shader,
            name: own.id ?? own.path,
          });
          // Its points' cull with its style: tiny symbols splatted.
          const culler = world.createPointCuller({
            code: own.kernel,
            uniforms: c.uniforms,
            label: `vector style ${own.id ?? own.path} (cull)`,
          });
          world.setPointCuller(draw, culler, options.splatBelow ?? 6);
          layer.shapes.push({ layer: own, draw, culler });
        } else {
          const url = options.models?.[own.model] ?? own.uri;
          if (!url) {
            throw new Error(
              `VectorLayer: ${own.path}: no URL for model ${own.model} (options.models or the style's resources)`,
            );
          }
          // One upload per model, placed by every pool that draws it.
          const href = new URL(url, location.href).href;
          let model = models.get(href);
          if (!model) {
            model = engine.loadModel(world, href);
            models.set(href, model);
          }
          layer.pools.push(
            new ModelPool(engine, world, source, await model, {
              slots: options.slots ?? 4096,
              code: own.code,
              uniforms: c.uniforms,
              label: `vector style ${own.id ?? own.path}`,
            }),
          );
        }
      }
    } catch (e) {
      layer.destroy();
      throw e;
    } finally {
      for (const model of models.values()) {
        void model.then(
          (m) => m.release(),
          () => {},
        );
      }
    }
    return layer;
  }

  /** A parameter's value (its default until set). */
  getParameter(name: string): number | boolean | string | undefined {
    return this.values.get(name);
  }

  /** Sets a parameter: numbers, booleans, CSS colors. */
  setParameter(name: string, value: number | boolean | string): void {
    const p = this.parameters[name];
    if (!p) {
      throw new Error(`VectorLayer.setParameter: no parameter ${name}`);
    }
    let uniform: number | number[];
    if (p.type === "color") {
      const rgba = cssColor(String(value));
      if (!rgba) {
        throw new Error(`VectorLayer.setParameter: ${name}: not a CSS color`);
      }
      uniform = rgba;
    } else {
      uniform = Number(value);
    }
    this.values.set(name, value);
    for (const { layer, culler } of this.shapes) {
      layer.shader.setUniform(p.uniform, uniform);
      culler.setUniform(p.uniform, uniform);
    }
    for (const pool of this.pools) {
      pool.setUniform(p.uniform, uniform);
    }
    this.engine.requestRender();
  }

  /** Removes its draws and models (the sources stay). */
  destroy(): void {
    for (const { draw, culler } of this.shapes) {
      this.world.removeDraw(draw);
      culler.destroy();
    }
    this.shapes.length = 0;
    for (const pool of this.pools) {
      pool.destroy();
    }
    this.pools.length = 0;
    for (const material of this.materials) {
      this.world.removeMaterial(material);
    }
    this.materials.length = 0;
  }
}
