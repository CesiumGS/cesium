// @ts-check

import {
  BoundingSphere,
  Cartesian3,
  Cartesian4,
  CullingVolume,
  DeveloperError,
  Ellipsoid,
  Frozen,
  Matrix3,
  OrientedBoundingBox,
  Rectangle,
  defined,
} from "@cesium/core";
/** @import Cesium3DTile from "./Cesium3DTile.js"; */

/**
 * Creates six inward-facing planes, one per face of an oriented bounding box.
 *
 * @param {OrientedBoundingBox} obb The box.
 * @returns {CullingVolume} The culling volume.
 * @private
 */
function createCullingVolumeFromOrientedBoundingBox(obb) {
  const halfAxes = obb.halfAxes;
  const center = obb.center;
  const planes = [];

  for (let i = 0; i < 3; ++i) {
    const axis = Matrix3.getColumn(halfAxes, i, new Cartesian3());
    const normal = Cartesian3.normalize(axis, new Cartesian3());
    const flipped = Cartesian3.negate(normal, new Cartesian3());

    const point0 = Cartesian3.subtract(center, axis, new Cartesian3());
    const point1 = Cartesian3.add(center, axis, new Cartesian3());

    const w0 = -Cartesian3.dot(normal, point0);
    const w1 = -Cartesian3.dot(flipped, point1);

    const plane0 = new Cartesian4(normal.x, normal.y, normal.z, w0);
    const plane1 = new Cartesian4(flipped.x, flipped.y, flipped.z, w1);

    planes.push(plane0);
    planes.push(plane1);
  }

  return new CullingVolume(planes);
}

/**
 * Creates the planes that bound an area.
 *
 * @param {Rectangle|OrientedBoundingBox|BoundingSphere} area The area.
 * @param {number} minimumHeight The minimum height, in meters, when area is a Rectangle.
 * @param {number} maximumHeight The maximum height, in meters, when area is a Rectangle.
 * @returns {CullingVolume} The culling volume.
 * @private
 */
function createCullingVolume(area, minimumHeight, maximumHeight) {
  if (area instanceof BoundingSphere) {
    return CullingVolume.fromBoundingSphere(area);
  }
  if (area instanceof OrientedBoundingBox) {
    return createCullingVolumeFromOrientedBoundingBox(area);
  }
  if (area instanceof Rectangle) {
    const obb = OrientedBoundingBox.fromRectangle(
      area,
      minimumHeight,
      maximumHeight,
      Ellipsoid.default,
    );
    return createCullingVolumeFromOrientedBoundingBox(obb);
  }

  throw new DeveloperError(
    "area must be a Rectangle, OrientedBoundingBox, or BoundingSphere.",
  );
}

/**
 * A function that returns how coarse a tile is. Larger values mean coarser.
 *
 * @callback Cesium3DTilesetAreaSelectionMeasureCallback
 * @param {Cesium3DTile} tile The tile.
 * @param {number} depth The tile's depth in the tree, with the root at 0.
 * @returns {number} The tile's measure.
 */

/**
 * @typedef {object} Cesium3DTilesetAreaSelectionOptions
 * @property {Rectangle|OrientedBoundingBox|BoundingSphere} area The volume the area covers.
 * @property {number} [minimumHeight=-1000.0] The minimum height, in meters, when area is a Rectangle.
 * @property {number} [maximumHeight=10000.0] The maximum height, in meters, when area is a Rectangle.
 * @property {Cesium3DTilesetAreaSelectionMeasureCallback} measure The function that returns how coarse a tile is.
 * @property {number} minimumMeasure The fine bound. Tiles at or below this measure are not refined.
 * @property {number} maximumMeasure The coarse bound. Tiles above this measure are always refined.
 * @property {boolean} [show=true] Whether the area is active.
 */

/**
 * An area of a {@link Cesium3DTileset} in which tiles are selected within a
 * level-of-detail range, whether or not the camera can see them.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Cesium3DTilesetAreaSelection {
  /**
   * @param {Cesium3DTilesetAreaSelectionOptions} options
   * @exception {DeveloperError} options.area is required.
   * @exception {DeveloperError} options.area must be a Rectangle, OrientedBoundingBox, or BoundingSphere.
   * @exception {DeveloperError} options.minimumHeight must be less than or equal to options.maximumHeight.
   * @exception {DeveloperError} options.measure must be a function.
   * @exception {DeveloperError} options.minimumMeasure must be a number.
   * @exception {DeveloperError} options.maximumMeasure must be a number.
   * @exception {DeveloperError} options.minimumMeasure must be finite and greater than or equal to 0.0.
   * @exception {DeveloperError} options.maximumMeasure must be greater than or equal to options.minimumMeasure.
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    const area = options.area;
    const minimumHeight = options.minimumHeight ?? -1000.0;
    const maximumHeight = options.maximumHeight ?? 10000.0;
    const measure = options.measure;
    const minimumMeasure = options.minimumMeasure;
    const maximumMeasure = options.maximumMeasure;

    if (!defined(area)) {
      throw new DeveloperError("options.area is required.");
    }
    if (!(
      area instanceof Rectangle ||
      area instanceof OrientedBoundingBox ||
      area instanceof BoundingSphere
    )) {
      throw new DeveloperError(
        "options.area must be a Rectangle, OrientedBoundingBox, or BoundingSphere.",
      );
    }
    if (minimumHeight > maximumHeight) {
      throw new DeveloperError(
        "options.minimumHeight must be less than or equal to options.maximumHeight.",
      );
    }
    if (typeof measure !== "function") {
      throw new DeveloperError("options.measure must be a function.");
    }
    if (typeof minimumMeasure !== "number" || Number.isNaN(minimumMeasure)) {
      throw new DeveloperError("options.minimumMeasure must be a number.");
    }
    if (typeof maximumMeasure !== "number" || Number.isNaN(maximumMeasure)) {
      throw new DeveloperError("options.maximumMeasure must be a number.");
    }
    if (!Number.isFinite(minimumMeasure) || minimumMeasure < 0.0) {
      throw new DeveloperError(
        "options.minimumMeasure must be finite and greater than or equal to 0.0.",
      );
    }
    if (maximumMeasure < minimumMeasure) {
      throw new DeveloperError(
        "options.maximumMeasure must be greater than or equal to options.minimumMeasure.",
      );
    }

    this._area = area.clone();
    this._minimumHeight = minimumHeight;
    this._maximumHeight = maximumHeight;
    this._measure = measure;
    this._minimumMeasure = minimumMeasure;
    this._maximumMeasure = maximumMeasure;
    this._show = options.show ?? true;

    this._cullingVolume = createCullingVolume(
      this._area,
      minimumHeight,
      maximumHeight,
    );
  }

  /**
   * The volume the area covers.
   *
   * @type {Rectangle|OrientedBoundingBox|BoundingSphere}
   * @readonly
   */
  get area() {
    return this._area;
  }

  /**
   * The minimum height, in meters, of the area when it is a {@link Rectangle}.
   *
   * @type {number}
   * @default -1000.0
   * @readonly
   */
  get minimumHeight() {
    return this._minimumHeight;
  }

  /**
   * The maximum height, in meters, of the area when it is a {@link Rectangle}.
   *
   * @type {number}
   * @default 10000.0
   * @readonly
   */
  get maximumHeight() {
    return this._maximumHeight;
  }

  /**
   * The function that returns how coarse a tile is. Larger values mean coarser.
   *
   * @type {Cesium3DTilesetAreaSelectionMeasureCallback}
   * @readonly
   */
  get measure() {
    return this._measure;
  }

  /**
   * The fine bound of the level-of-detail range. Tiles at or below this measure are not refined.
   *
   * @type {number}
   * @readonly
   */
  get minimumMeasure() {
    return this._minimumMeasure;
  }

  /**
   * The coarse bound of the level-of-detail range. Tiles above this measure are always refined.
   *
   * @type {number}
   * @readonly
   */
  get maximumMeasure() {
    return this._maximumMeasure;
  }

  /**
   * Whether the area is active.
   *
   * @type {boolean}
   * @default true
   */
  get show() {
    return this._show;
  }

  set show(value) {
    this._show = value;
  }
}

export default Cesium3DTilesetAreaSelection;
