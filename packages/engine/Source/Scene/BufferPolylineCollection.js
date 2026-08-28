// @ts-check

import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Frozen from "../Core/Frozen.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
import BufferPolyline from "./BufferPolyline.js";
import renderPolylines from "./renderBufferPolylineCollection.js";
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";

/** @import { TypedArray } from "../Core/globalTypes.js"; */
/** @import Matrix4 from "../Core/Matrix4.js"; */
/** @import BoundingSphere from "../Core/BoundingSphere.js"; */
/** @import ComponentDatatype from "../Core/ComponentDatatype.js"; */
/** @import BlendOption from "./BlendOption.js"; */
/** @import HeightReference from "./HeightReference.js"; */
/** @import FrameState from "./FrameState.js" */

/**
 * @typedef {object} BufferPolylineOptions
 * @property {Matrix4} [modelMatrix=Matrix4.IDENTITY] Transforms geometry from model to world coordinates.
 * @property {boolean} [show=true]
 * @property {BufferPolylineMaterial} [material=BufferPolylineMaterial.DEFAULT_MATERIAL]
 * @property {number} [featureId]
 * @property {object} [pickObject]
 * @property {TypedArray} [positions]
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Collection of polylines held in ArrayBuffer storage for performance and memory optimization.
 *
 * <p>Default buffer memory allocation is arbitrary, and collections cannot be resized,
 * so specific per-buffer capacities should be provided in the collection
 * constructor when available.</p>
 *
 * @example
 * const collection = new BufferPolylineCollection({
 *   primitiveCountMax: 1024,
 *   vertexCountMax: 4096,
 * });
 *
 * const polyline = new BufferPolyline();
 * const material = new BufferPolylineMaterial({color: Color.WHITE});
 *
 * // Create a new polyline, temporarily bound to 'polyline' local variable.
 * collection.add({
 *   positions: new Float64Array([ ... ]),
 *   material,
 * }, polyline);
 *
 * // Iterate over all polylines in collection, temporarily binding 'polyline'
 * // local variable to each, and updating polyline material.
 * for (let i = 0; i < collection.primitiveCount; i++) {
 *   collection.get(i, polyline);
 *   polyline.setMaterial(material);
 * }
 *
 * @see BufferPolyline
 * @see BufferPolylineMaterial
 * @see BufferPrimitiveCollection
 * @extends BufferPrimitiveCollection<BufferPolyline>
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPolylineCollection extends BufferPrimitiveCollection {
  /**
   * @param {object} [options]
   * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] Transforms geometry from model to world coordinates.
   * @param {number} [options.primitiveCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {number} [options.vertexCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {boolean} [options.show=true]
   * @param {ComponentDatatype} [options.positionDatatype=ComponentDatatype.DOUBLE]
   * @param {boolean} [options.positionNormalized=false]
   * @param {boolean} [options.allowPicking=false] When <code>true</code>, primitives are pickable with {@link Scene#pick}. When <code>false</code>, memory and initialization cost are lower.
   * @param {BoundingSphere} [options.boundingVolume] Bounding volume, in world space, for the collection.
   * @param {boolean} [options.debugShowBoundingVolume=false]
   * @param {BlendOption} [options.blendOption=BlendOption.TRANSLUCENT]
   * @param {HeightReference} [options.heightReference=HeightReference.NONE]
   * @param {"pixels"|"meters"} [options.widthUnits="pixels"] Unit of polyline widths in this collection:
   *   <code>"pixels"</code> on the screen, or <code>"meters"</code> in world space. A clamped
   *   {@link HeightReference} measures those meters on the ellipsoid surface, so elevation and terrain
   *   slope stretch the drawn width.
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    super(options);

    const widthUnits = options.widthUnits ?? "pixels";

    //>>includeStart('debug', pragmas.debug);
    if (widthUnits !== "pixels" && widthUnits !== "meters") {
      throw new DeveloperError(
        'options.widthUnits must be "pixels" or "meters".',
      );
    }
    //>>includeEnd('debug');

    /**
     * @type {"pixels"|"meters"}
     * @private
     */
    this._widthUnits = widthUnits;
  }

  /**
   * Unit of polyline widths in this collection: <code>"pixels"</code> on the screen, or
   * <code>"meters"</code> in world space, measured on the ellipsoid surface when clamped.
   *
   * @type {"pixels"|"meters"}
   * @readonly
   */
  get widthUnits() {
    return this._widthUnits;
  }

  _getCollectionClass() {
    return BufferPolylineCollection;
  }

  _getPrimitiveClass() {
    return BufferPolyline;
  }

  _getMaterialClass() {
    return BufferPolylineMaterial;
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /**
   * @param {BufferPolylineCollection} collection
   * @returns {BufferPolylineCollection}
   * @override
   * @ignore
   */
  static _cloneEmpty(collection) {
    return new BufferPolylineCollection({
      primitiveCountMax: collection.primitiveCountMax,
      vertexCountMax: collection.vertexCountMax,
      positionDatatype: collection.positionDatatype,
      positionNormalized: collection.positionNormalized,
      widthUnits: collection.widthUnits,
    });
  }

  /////////////////////////////////////////////////////////////////////////////
  // PRIMITIVE LIFECYCLE

  /**
   * Adds a new polyline to the collection, with the specified options. A
   * {@link BufferPolyline} instance is linked to the new polyline, using
   * the 'result' argument if given, or a new instance if not. For repeated
   * calls, prefer to reuse a single BufferPolyline instance rather than
   * allocating a new instance on each call.
   *
   * @param {BufferPolylineOptions} options
   * @param {BufferPolyline} result
   * @returns {BufferPolyline}
   * @override
   */
  add(options, result = new BufferPolyline()) {
    super.add(options, result);

    const vertexOffset = this._positionCount;
    result._setUint32(BufferPolyline.Layout.POSITION_OFFSET_U32, vertexOffset);
    result._setUint32(BufferPolyline.Layout.POSITION_COUNT_U32, 0);

    if (defined(options.positions)) {
      result.setPositions(options.positions);
    }

    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // RENDER

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    super.update(frameState);

    const passes = frameState.passes;
    if (this.show && (passes.render || passes.pick)) {
      this._renderContext = renderPolylines(
        this,
        frameState,
        this._renderContext,
      );
    }
  }
}

export default BufferPolylineCollection;
