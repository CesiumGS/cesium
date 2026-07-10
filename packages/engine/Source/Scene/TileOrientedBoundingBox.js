// @ts-check

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

/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import Intersect from "../Core/Intersect.js"; */
/** @import Plane from "../Core/Plane.js"; */

const scratchU = new Cartesian3();
const scratchV = new Cartesian3();
const scratchW = new Cartesian3();
const scratchCartesian = new Cartesian3();

/**
 * @param {Cartesian3} a
 * @param {Cartesian3} b
 * @param {Cartesian3} result
 * @private
 */
function computeMissingVector(a, b, result) {
  result = Cartesian3.cross(a, b, result);
  const magnitude = Cartesian3.magnitude(result);
  return Cartesian3.multiplyByScalar(
    result,
    CesiumMath.EPSILON7 / magnitude,
    result,
  );
}

/**
 * @param {Cartesian3} a
 * @param {Cartesian3} result
 * @private
 */
function findOrthogonalVector(a, result) {
  const temp = Cartesian3.normalize(a, scratchCartesian);
  const b = Cartesian3.equalsEpsilon(
    temp,
    Cartesian3.UNIT_X,
    CesiumMath.EPSILON6,
  )
    ? Cartesian3.UNIT_Y
    : Cartesian3.UNIT_X;
  return computeMissingVector(a, b, result);
}

/**
 * @param {Matrix3} halfAxes
 * @private
 */
function checkHalfAxes(halfAxes) {
  let u = Matrix3.getColumn(halfAxes, 0, scratchU);
  let v = Matrix3.getColumn(halfAxes, 1, scratchV);
  let w = Matrix3.getColumn(halfAxes, 2, scratchW);

  const uZero = Cartesian3.equals(u, Cartesian3.ZERO);
  const vZero = Cartesian3.equals(v, Cartesian3.ZERO);
  const wZero = Cartesian3.equals(w, Cartesian3.ZERO);

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
 *
 * @private
 */
class TileOrientedBoundingBox {
  /**
   * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
   * @param {Matrix3} [halfAxes=Matrix3.ZERO] The three orthogonal half-axes of the bounding box.
   *                                          Equivalently, the transformation matrix, to rotate and scale a 2x2x2
   *                                          cube centered at the origin.
   */
  constructor(center, halfAxes) {
    halfAxes = checkHalfAxes(halfAxes);
    this._orientedBoundingBox = new OrientedBoundingBox(center, halfAxes);
    this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(
      this._orientedBoundingBox,
    );
  }

  /**
   * The underlying bounding volume.
   *
   *
   * @type {OrientedBoundingBox}
   * @readonly
   */
  get boundingVolume() {
    return this._orientedBoundingBox;
  }

  /**
   * The underlying bounding sphere.
   *
   *
   * @type {BoundingSphere}
   * @readonly
   */
  get boundingSphere() {
    return this._boundingSphere;
  }

  /**
   * Computes the distance between this bounding box and the camera attached to frameState.
   *
   * @param {FrameState} frameState The frameState to which the camera is attached.
   * @returns {number} The distance between the camera and the bounding box in meters. Returns 0 if the camera is inside the bounding volume.
   */
  distanceToCamera(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("frameState", frameState);
    //>>includeEnd('debug');
    return Math.sqrt(
      this._orientedBoundingBox.distanceSquaredTo(frameState.camera.positionWC),
    );
  }

  /**
   * Determines which side of a plane this box is located.
   *
   * @param {Plane} plane The plane to test against.
   * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
   *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
   *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
   *                      intersects the plane.
   */
  intersectPlane(plane) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("plane", plane);
    //>>includeEnd('debug');
    return this._orientedBoundingBox.intersectPlane(plane);
  }

  /**
   * Update the bounding box after the tile is transformed.
   *
   * @param {Cartesian3} center The center of the box.
   * @param {Matrix3} halfAxes The three orthogonal half-axes of the bounding box.
   *                           Equivalently, the transformation matrix, to rotate and scale a 2x2x2
   *                           cube centered at the origin.
   */
  update(center, halfAxes) {
    Cartesian3.clone(center, this._orientedBoundingBox.center);
    halfAxes = checkHalfAxes(halfAxes);
    Matrix3.clone(halfAxes, this._orientedBoundingBox.halfAxes);
    BoundingSphere.fromOrientedBoundingBox(
      this._orientedBoundingBox,
      this._boundingSphere,
    );
  }

  /**
   * Creates a debug primitive that shows the outline of the box.
   *
   * @param {Color} color The desired color of the primitive's mesh
   * @return {Primitive}
   */
  createDebugVolume(color) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("color", color);
    //>>includeEnd('debug');

    const geometry = new BoxOutlineGeometry({
      // Make a 2x2x2 cube
      minimum: new Cartesian3(-1.0, -1.0, -1.0),
      maximum: new Cartesian3(1.0, 1.0, 1.0),
    });
    const modelMatrix = Matrix4.fromRotationTranslation(
      this.boundingVolume.halfAxes,
      this.boundingVolume.center,
    );
    const instance = new GeometryInstance({
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
  }
}

export default TileOrientedBoundingBox;
