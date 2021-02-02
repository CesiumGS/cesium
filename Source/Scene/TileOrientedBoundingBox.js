import BoundingSphere from "../Core/BoundingSphere.js";
import BoxOutlineGeometry from "../Core/BoxOutlineGeometry.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import CesiumMath from "../Core/Math.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Primitive from "./Primitive.js";
import defined from "../Core/defined.js";

var scratchU = new Cartesian3();
var scratchV = new Cartesian3();
var scratchW = new Cartesian3();
var scratchCartesian = new Cartesian3();

function computeMissingVector(a, b, result) {
  result = Cartesian3.cross(a, b, result);
  var magnitude = Cartesian3.magnitude(result);
  return Cartesian3.multiplyByScalar(
    result,
    CesiumMath.EPSILON7 / magnitude,
    result
  );
}

function findOrthogonalVector(a, result) {
  var temp = Cartesian3.normalize(a, scratchCartesian);
  var b = Cartesian3.equalsEpsilon(temp, Cartesian3.UNIT_X, CesiumMath.EPSILON6)
    ? Cartesian3.UNIT_Y
    : Cartesian3.UNIT_X;
  return computeMissingVector(a, b, result);
}

function checkHalfAxes(halfAxes) {
  var u = Matrix3.getColumn(halfAxes, 0, scratchU);
  var v = Matrix3.getColumn(halfAxes, 1, scratchV);
  var w = Matrix3.getColumn(halfAxes, 2, scratchW);

  var uZero = Cartesian3.equals(u, Cartesian3.ZERO);
  var vZero = Cartesian3.equals(v, Cartesian3.ZERO);
  var wZero = Cartesian3.equals(w, Cartesian3.ZERO);

  if (!uZero && !vZero && !wZero) {
    return halfAxes;
  }
  if (uZero && vZero && wZero) {
    halfAxes[0] = CesiumMath.EPSILON7;
    halfAxes[4] = CesiumMath.EPSILON7;
    halfAxes[8] = CesiumMath.EPSILON7;
    return halfAxes;
  }
  if (uZero && !vZero && !wZero) {
    u = computeMissingVector(v, w, u);
  } else if (!uZero && vZero && !wZero) {
    v = computeMissingVector(u, w, v);
  } else if (!uZero && !vZero && wZero) {
    w = computeMissingVector(v, u, w);
  } else if (!uZero) {
    v = findOrthogonalVector(u, v);
    w = computeMissingVector(v, u, w);
  } else if (!vZero) {
    u = findOrthogonalVector(v, u);
    w = computeMissingVector(v, u, w);
  } else if (!wZero) {
    u = findOrthogonalVector(w, u);
    v = computeMissingVector(w, u, v);
  }

  Matrix3.setColumn(halfAxes, 0, u, halfAxes);
  Matrix3.setColumn(halfAxes, 1, v, halfAxes);
  Matrix3.setColumn(halfAxes, 2, w, halfAxes);

  return halfAxes;
}

/**
 * A tile bounding volume specified as an oriented bounding box.
 * @alias TileOrientedBoundingBox
 * @constructor
 *
 * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
 * @param {Matrix3} [halfAxes=Matrix3.ZERO] The three orthogonal half-axes of the bounding box.
 *                                          Equivalently, the transformation matrix, to rotate and scale a 2x2x2
 *                                          cube centered at the origin.
 *
 * @private
 */
function TileOrientedBoundingBox(center, halfAxes) {
  halfAxes = checkHalfAxes(halfAxes);
  this._orientedBoundingBox = new OrientedBoundingBox(center, halfAxes);
  this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this._orientedBoundingBox
  );
}

Object.defineProperties(TileOrientedBoundingBox.prototype, {
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
 * Computes the distance between this bounding box and the camera attached to frameState.
 *
 * @param {FrameState} frameState The frameState to which the camera is attached.
 * @returns {Number} The distance between the camera and the bounding box in meters. Returns 0 if the camera is inside the bounding volume.
 */
TileOrientedBoundingBox.prototype.distanceToCamera = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');
  return Math.sqrt(
    this._orientedBoundingBox.distanceSquaredTo(frameState.camera.positionWC)
  );
};

/**
 * Determines which side of a plane this box is located.
 *
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
 *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
 *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
 *                      intersects the plane.
 */
TileOrientedBoundingBox.prototype.intersectPlane = function (plane) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("plane", plane);
  //>>includeEnd('debug');
  return this._orientedBoundingBox.intersectPlane(plane);
};

/**
 * Update the bounding box after the tile is transformed.
 *
 * @param {Cartesian3} center The center of the box.
 * @param {Matrix3} halfAxes The three orthogonal half-axes of the bounding box.
 *                           Equivalently, the transformation matrix, to rotate and scale a 2x2x2
 *                           cube centered at the origin.
 */
TileOrientedBoundingBox.prototype.update = function (center, halfAxes) {
  Cartesian3.clone(center, this._orientedBoundingBox.center);
  halfAxes = checkHalfAxes(halfAxes);
  Matrix3.clone(halfAxes, this._orientedBoundingBox.halfAxes);
  BoundingSphere.fromOrientedBoundingBox(
    this._orientedBoundingBox,
    this._boundingSphere
  );
};

/**
 * Derive a bounding volume for a descendant tile (child, grandchild, etc.),
 * assuming a quadtree or octree implicit tiling scheme. The (level, x, y, [z])
 * coordinates are given to select the descendant tile and compute its position
 * and dimensions.
 *
 * If z is present, octree subdivision is used. Otherwise, quadtree subdivision
 * is used. Quadtrees are always divided at the midpoint of the the horizontal
 * dimensions, i.e. (x, y), leaving the z axis unchanged.
 *
 * This computes the child volume directly from the root bounding volume rather
 * than recursively subdividing to minimize floating point error.
 *
 * @param {Number} level The level of the descendant tile relative to
 * @param {Number} x The x coordinate of the child tile
 * @param {Number} y The y coordinate of the child tile
 * @param {Number|undefined} z The z coordinate of the child volume (octree only)
 * @return {TileOrientedBoundingBox} A new TileBoundingRegion with the given x, y, z coordinates
 */
TileOrientedBoundingBox.prototype.deriveVolume = function (level, x, y, z) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  if (defined(z)) {
    Check.typeOf.number("z", z);
  }
  //>>includeEnd('debug');

  var rootCenter = this._orientedBoundingBox.center;
  var rootHalfAxes = this._orientedBoundingBox.halfAxes;

  if (level === 0) {
    return new TileOrientedBoundingBox(
      this._orientedBoundingBox.center,
      this._orientedBoundingBox.halfAxes
    );
  }

  var tileScale = Math.pow(2, -level);
  var modelSpaceX = -1 + (2 * x + 1) * tileScale;
  var modelSpaceY = -1 + (2 * y + 1) * tileScale;

  var modelSpaceZ = 0;
  var scaleFactors = Cartesian3.fromElements(
    tileScale,
    tileScale,
    1,
    scratchCartesian
  );

  if (defined(z)) {
    modelSpaceZ = -1 + (2 * z + 1) * tileScale;
    scaleFactors.z = tileScale;
  }

  var center = new Cartesian3(modelSpaceX, modelSpaceY, modelSpaceZ);
  center = Matrix3.multiplyByVector(rootHalfAxes, center, new Cartesian3());
  center = Cartesian3.add(center, rootCenter, center);

  var halfAxes = Matrix3.clone(rootHalfAxes);
  halfAxes = Matrix3.multiplyByScale(halfAxes, scaleFactors, halfAxes);

  return new TileOrientedBoundingBox(center, halfAxes);
};

/**
 * Creates a debug primitive that shows the outline of the box.
 *
 * @param {Color} color The desired color of the primitive's mesh
 * @return {Primitive}
 */
TileOrientedBoundingBox.prototype.createDebugVolume = function (color) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("color", color);
  //>>includeEnd('debug');

  var geometry = new BoxOutlineGeometry({
    // Make a 2x2x2 cube
    minimum: new Cartesian3(-1.0, -1.0, -1.0),
    maximum: new Cartesian3(1.0, 1.0, 1.0),
  });
  var modelMatrix = Matrix4.fromRotationTranslation(
    this.boundingVolume.halfAxes,
    this.boundingVolume.center
  );
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
export default TileOrientedBoundingBox;
