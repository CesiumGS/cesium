import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import CoplanarPolygonOutlineGeometry from "../Core/CoplanarPolygonOutlineGeometry.js";
import Check from "../Core/Check.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defaultValue from "../Core/defaultValue.js";
import DeveloperError from "../Core/DeveloperError.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Matrix4 from "../Core/Matrix4.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Primitive from "./Primitive.js";
import S2Cell from "../Core/S2Cell.js";

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
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.String("options.token", options.token);
  //>>includeEnd('debug');

  this.s2Cell = new S2Cell(options.token);
  this.minimumHeight = defaultValue(options.minimumHeight, 0.0);
  this.maximumHeight = defaultValue(options.maximumHeight, 0.0);
}

/**
 * The underlying bounding volume.
 *
 * @type {Object}
 * @readonly
 */
TileBoundingS2Cell.prototype.boundingVolume = undefined;

/**
 * The underlying bounding sphere.
 *
 * @type {BoundingSphere}
 * @readonly
 */
TileBoundingS2Cell.prototype.boundingSphere = undefined;

/**
 * Calculates the distance between the tile and the camera.
 *
 * @param {FrameState} frameState The frame state.
 * @return {Number} The distance between the tile and the camera, in meters.
 *                  Returns 0.0 if the camera is inside the tile.
 */
TileBoundingS2Cell.prototype.distanceToCamera = function (frameState) {
  DeveloperError.throwInstantiationError();
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

function getPolygonPositions() {
  var positions = [];
  var vertexScratch;
  var vertexCartographicScratch;
  for (var i = 0; i < 4; i++) {
    vertexScratch = this.s2Cell.getVertex(i);
    vertexCartographicScratch = Cartographic.fromCarteisan(vertexScratch);
    vertexCartographicScratch.height = this.minimumHeight;
    positions[2 * i] = Cartographic.toCartesian(vertexCartographicScratch);
    vertexCartographicScratch.height = this.maximumHeight;
    positions[2 * i + 4 + 1] = Cartographic.toCartesian(
      vertexCartographicScratch
    );
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
  var geometry = CoplanarPolygonOutlineGeometry.fromPositions({
    positions: getPolygonPositions(),
  });
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
