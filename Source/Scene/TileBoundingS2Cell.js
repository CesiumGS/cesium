import BoundingSphere from "../Core/BoundingSphere.js";
import Cartographic from "../Core/Cartographic.js";
import PolygonOutlineGeometry from "../Core/PolygonOutlineGeometry.js";
import PolygonHierarchy from "../Core/PolygonHierarchy.js";
import Check from "../Core/Check.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defaultValue from "../Core/defaultValue.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Primitive from "./Primitive.js";
import S2Cell from "../Core/S2Cell.js";

var scratchCartographic;

/**
 * A tile bounding volume specified as an S2 cell token with minimum and maximum heights.
 * @alias TileBoundingS2Cell
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.token The token of the S2 cell.
 * @param {Number} [options.minimumHeight=0.0] The minimum height of the bounding volume.
 * @param {Number} [options.maximumHeight=0.0] The maximum height of the bounding volume.
 * @param {Ellipsoid} [options.ellipsoid=Cesium.Ellipsoid.WGS84] The ellipsoid.
 * @param {Boolean} [options.computeBoundingVolumes=true] True to compute the {@link TileBoundingS2Cell#boundingVolume} and
 *                  {@link TileBoundingS2Cell#boundingSphere}. If false, these properties will be undefined.
 *
 * @private
 */
function TileBoundingS2Cell(options) {
  this.s2Cell = S2Cell.fromToken(options.token);
  this.minimumHeight = defaultValue(options.minimumHeight, 0.0);
  this.maximumHeight = defaultValue(options.maximumHeight, 0.0);

  // WIP: For now, compute a simple bounding box from all the points of the box.
  var points = [];

  // Add center of cell.
  points[0] = this.s2Cell.getCenter();
  scratchCartographic = Cartographic.fromCartesian(points[0]);
  scratchCartographic.height = this.maximumHeight;
  points[0] = Cartographic.toCartesian(scratchCartographic);
  scratchCartographic.height = this.minimumHeight;
  points[1] = Cartographic.toCartesian(scratchCartographic);
  for (var i = 0; i <= 3; i++) {
    scratchCartographic = Cartographic.fromCartesian(this.s2Cell.getVertex(i));
    scratchCartographic.height = this.maximumHeight;
    points[2 + i] = Cartographic.toCartesian(scratchCartographic);
    scratchCartographic.height = this.minimumHeight;
    points[2 + i + 1] = Cartographic.toCartesian(scratchCartographic);
  }

  this._orientedBoundingBox = OrientedBoundingBox.fromPoints(points);
  this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this._orientedBoundingBox
  );
}

Object.defineProperties(TileBoundingS2Cell.prototype, {
  /**
   * The underlying bounding volume.
   *
   * @memberof TileOrientedBoundingBox.prototype
   *
   * @type {Object}
   * @readonly
   */
  boundingVolume: {
    get: function () {
      return this._orientedBoundingBox;
    },
  },
  /**
   * The underlying bounding sphere.
   *
   * @memberof TileOrientedBoundingBox.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      return this._boundingSphere;
    },
  },
});

/**
 * Calculates the distance between the tile and the camera.
 *
 * @param {FrameState} frameState The frame state.
 * @return {Number} The distance between the tile and the camera, in meters.
 *                  Returns 0.0 if the camera is inside the tile.
 */
TileBoundingS2Cell.prototype.distanceToCamera = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');
  return Math.sqrt(
    this._orientedBoundingBox.distanceSquaredTo(frameState.camera.positionWC)
  );
};

/**
 * Determines which side of a plane this volume is located.
 *
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire volume is on the side of the plane
 *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire volume is
 *                      on the opposite side, and {@link Intersect.INTERSECTING} if the volume
 *                      intersects the plane.
 */
TileBoundingS2Cell.prototype.intersectPlane = function (plane) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("plane", plane);
  //>>includeEnd('debug');
  return this._orientedBoundingBox.intersectPlane(plane);
};

/**
 * @private
 */
function getPolygonHierarchy(s2Cell) {
  var positions = [];
  for (var i = 0; i < 4; i++) {
    positions[i] = s2Cell.getVertex(i);
  }
  return positions;
}

/**
 * Creates a debug primitive that shows the outline of the tile bounding
 * volume.
 *
 * @param {Color} color The desired color of the primitive's mesh
 * @return {Primitive}
 */
TileBoundingS2Cell.prototype.createDebugVolume = function (color) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("color", color);
  //>>includeEnd('debug');

  var modelMatrix = new Matrix4.clone(Matrix4.IDENTITY);
  var polygonGeometry = new PolygonOutlineGeometry({
    polygonHierarchy: new PolygonHierarchy(getPolygonHierarchy(this.s2Cell)),
    height: this.minimumHeight,
    extrudedHeight: this.maximumHeight,
  });
  var geometry = PolygonOutlineGeometry.createGeometry(polygonGeometry);
  var instance = new GeometryInstance({
    geometry: geometry,
    id: "outline",
    modelMatrix: modelMatrix,
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(color),
    },
  });

  return new Primitive({
    geometryInstances: instance,
    appearance: new PerInstanceColorAppearance({
      translucent: false,
      flat: true,
    }),
    asynchronous: false,
  });
};
export default TileBoundingS2Cell;
