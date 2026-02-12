// @ts-check

import defined from "../Core/defined.js";
import Feature3D from "./Feature3D.js";
import Feature3DCollection from "./Feature3DCollection.js";
import Polygon3D from "./Polygon3D.js";
import Frozen from "../Core/Frozen.js";
import renderPolygons from "./renderPolygon3DCollection.js";

/** @import Color from "../Core/Color.js"; */
/** @import Matrix4 from "../Core/Matrix4.js"; */
/** @import FrameState from "../Scene/FrameState.js" */

/**
 * @typedef {object} Polygon3DOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Float64Array} [positions]
 * @property {Uint32Array} [holes]
 * @property {Uint32Array} [triangles]
 */

/**
 * @extends Feature3DCollection<Polygon3D>
 */
class Polygon3DCollection extends Feature3DCollection {
  /**
   * @param {object} options
   * @param {number} [options.maxFeatureCount=Feature3D.DEFAULT_COUNT]
   * @param {number} [options.maxVertexCount=Feature3D.DEFAULT_COUNT]
   * @param {number} [options.maxHoleCount=Feature3D.DEFAULT_COUNT]
   * @param {number} [options.maxTriangleCount=Feature3D.DEFAULT_COUNT]
   * @param {boolean} [options.show=true]
   * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY]
   * @param {boolean} [options.debugShowBoundingVolume=false]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    super(options);

    /**
     * @type {number}
     * @ignore
     */
    this._holeCount = 0;

    /**
     * @type {number}
     * @protected
     */
    this._holeCountMax = options.maxHoleCount ?? Feature3D.DEFAULT_COUNT;

    /**
     * @type {ArrayBuffer}
     * @protected
     */
    this._holeIndexBuffer = null;

    /**
     * @type {Uint32Array<ArrayBuffer>}
     * @ignore
     */
    this._holeIndexU32 = null;

    /**
     * @type {number}
     * @ignore
     */
    this._triangleCount = 0;

    /**
     * @type {number}
     * @protected
     */
    this._triangleCountMax =
      options.maxTriangleCount ?? Feature3D.DEFAULT_COUNT;

    /**
     * @type {ArrayBuffer}
     * @protected
     */
    this._triangleIndexBuffer = null;

    /**
     * @type {Uint32Array<ArrayBuffer>}
     * @ignore
     */
    this._triangleIndexU32 = null;

    this._allocateHoleIndexBuffer();
    this._allocateTriangleIndexBuffer();
  }

  _getFeatureClass() {
    return Polygon3D;
  }

  _getFeatureLayout() {
    return Polygon3D.Layout;
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /**
   * @private
   */
  _allocateHoleIndexBuffer() {
    const holeIndexBufferByteLength =
      this._holeCountMax * Uint32Array.BYTES_PER_ELEMENT;
    this._holeIndexBuffer = new ArrayBuffer(holeIndexBufferByteLength);
    this._holeIndexU32 = new Uint32Array(this._holeIndexBuffer);
  }

  /**
   * @private
   */
  _allocateTriangleIndexBuffer() {
    const triangleIndexBufferByteLength =
      this._triangleCountMax * 3 * Uint32Array.BYTES_PER_ELEMENT;
    this._triangleIndexBuffer = new ArrayBuffer(triangleIndexBufferByteLength);
    this._triangleIndexU32 = new Uint32Array(this._triangleIndexBuffer);
  }

  /////////////////////////////////////////////////////////////////////////////
  // FEATURE LIFECYCLE

  /**
   * @param {Polygon3DOptions} options
   * @param {Polygon3D} result
   * @override
   */
  add(options, result = new Polygon3D()) {
    super.add(options, result);

    const vertexOffset = this._positionCount;
    result._setUint32(Polygon3D.Layout.POSITION_OFFSET_U32, vertexOffset);
    result._setUint32(Polygon3D.Layout.POSITION_COUNT_U32, 0);

    const holeOffset = this._holeCount;
    result._setUint32(Polygon3D.Layout.HOLE_OFFSET_U32, holeOffset);
    result._setUint32(Polygon3D.Layout.HOLE_COUNT_U32, 0);

    const triangleOffset = this._triangleCount;
    result._setUint32(Polygon3D.Layout.TRIANGLE_OFFSET_U32, triangleOffset);
    result._setUint32(Polygon3D.Layout.TRIANGLE_COUNT_U32, 0);

    if (defined(options.positions)) {
      result.setPositions(options.positions);
    }

    if (defined(options.holes)) {
      result.setHoles(options.holes);
    }

    if (defined(options.triangles)) {
      result.setTriangles(options.triangles);
    }

    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // RENDER

  /** @param {FrameState} frameState */
  update(frameState) {
    super.update(frameState);

    this._renderContext = renderPolygons(this, frameState, this._renderContext);
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /** @type {number} */
  get byteLength() {
    return (
      super.byteLength +
      this._holeIndexBuffer.byteLength +
      this._triangleIndexBuffer.byteLength
    );
  }

  /** @type {number} */
  get holeCount() {
    return this._holeCount;
  }

  /** @type {number} */
  get holeCountMax() {
    return this._holeCountMax;
  }

  /** @type {number} */
  get triangleCount() {
    return this._triangleCount;
  }

  /** @type {number} */
  get triangleCountMax() {
    return this._triangleCountMax;
  }
}
export default Polygon3DCollection;
