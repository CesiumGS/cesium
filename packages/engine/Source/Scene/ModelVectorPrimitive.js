import {
  Cartesian3,
  HeadingPitchRoll,
  Matrix4,
  defined,
  oneTimeWarning,
} from "@cesium/core";
import Resource from "../Core/Resource.js";
import Transforms from "../Core/Transforms.js";
import Axis from "./Axis.js";
import BufferPoint from "./BufferPoint.js";
import ModelInstanceCollection from "./Model/ModelInstanceCollection.js";
import VectorPrimitive from "./VectorPrimitive.js";

const scratchPoint = new BufferPoint();
const scratchPosition = new Cartesian3();
const scratchHpr = new HeadingPitchRoll();

/**
 * PROTOTYPE. Draws the points of a collection as glTF models, one
 * {@link ModelInstanceCollection} per distinct model URI. The points are read
 * once, when the vector primitive is first drawn.
 *
 * @extends VectorPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class ModelVectorPrimitive extends VectorPrimitive {
  /**
   * @param {object} options
   * @param {BufferPointCollection} options.collection The points to draw.
   * @param {string|function(BufferPoint): string} options.uri The model URI of each point. Points with no URI are not drawn. A relative URI is resolved against the content of the point's pick object, if any.
   * @param {number|function(BufferPoint): number} [options.heading=0.0] Heading in radians, clockwise from north.
   * @param {number|function(BufferPoint): number} [options.scale=1.0] Uniform scale.
   * @param {function(BufferPoint): boolean} [options.filter] Whether each point is drawn.
   * @param {boolean} [options.show=true]
   */
  constructor(options) {
    super(options);

    this._uri = options.uri;
    this._heading = options.heading ?? 0.0;
    this._scale = options.scale ?? 1.0;
    this._filter = options.filter;

    // Outlives destroy(), so pending loads can tell they were abandoned.
    this._state = { destroyed: false, models: [], started: false };
  }

  /**
   * The model instance collections that have loaded so far.
   * @type {ModelInstanceCollection[]}
   * @readonly
   */
  get models() {
    return this._state.models;
  }

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    const passes = frameState.passes;
    if (!this.show || !(passes.render || passes.pick)) {
      return;
    }

    const state = this._state;
    if (!state.started) {
      state.started = true;
      this._load();
    }
    for (const model of state.models) {
      model.update(frameState);
    }
  }

  _load() {
    const collection = this._collection;
    const state = this._state;

    /** @type {Map<string, {resource: Resource, instances: object[]}>} */
    const byUrl = new Map();
    for (let i = 0; i < collection.primitiveCount; i++) {
      const point = collection.get(i, scratchPoint);
      if (!point.show || (defined(this._filter) && !this._filter(point))) {
        continue;
      }
      const uri = VectorPrimitive._evaluate(this._uri, point);
      if (typeof uri !== "string" || uri === "") {
        continue;
      }

      const base = point.pickObject?.content?._resource;
      const resource = defined(base)
        ? base.getDerivedResource({ url: uri })
        : Resource.createIfNeeded(uri);

      const position = Matrix4.multiplyByPoint(
        collection.modelMatrix,
        point.getPosition(scratchPosition),
        scratchPosition,
      );
      scratchHpr.heading = Number(
        VectorPrimitive._evaluate(this._heading, point),
      );
      const modelMatrix = Transforms.headingPitchRollToFixedFrame(
        position,
        scratchHpr,
      );
      Matrix4.multiplyByUniformScale(
        modelMatrix,
        Number(VectorPrimitive._evaluate(this._scale, point)),
        modelMatrix,
      );

      const key = resource.getUrlComponent(true);
      let entry = byUrl.get(key);
      if (!defined(entry)) {
        entry = { resource, instances: [] };
        byUrl.set(key, entry);
      }
      entry.instances.push({ modelMatrix });
    }

    for (const { resource, instances } of byUrl.values()) {
      ModelInstanceCollection.fromGltfAsync({
        url: resource,
        instances,
        // Same convention as glTF tile content: no forward-axis rotation.
        forwardAxis: Axis.X,
      })
        .then((model) => {
          if (state.destroyed) {
            model.destroy();
          } else {
            state.models.push(model);
          }
        })
        .catch((error) => {
          oneTimeWarning(
            "ModelVectorPrimitive.load",
            `A referenced model failed to load: ${error}`,
          );
        });
    }
  }

  destroy() {
    const state = this._state;
    state.destroyed = true;
    for (const model of state.models) {
      model.destroy();
    }
    state.models.length = 0;
    return super.destroy();
  }
}

export default ModelVectorPrimitive;
