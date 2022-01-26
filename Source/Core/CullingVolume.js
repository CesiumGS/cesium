import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Intersect from "./Intersect.js";
import Plane from "./Plane.js";

/**
 * The culling volume defined by planes.
 *
 * @alias CullingVolume
 * @constructor
 *
 * @param {Cartesian4[]} [planes] An array of clipping planes.
 */
function CullingVolume(planes) {
  /**
   * Each plane is represented by a Cartesian4 object, where the x, y, and z components
   * define the unit vector normal to the plane, and the w component is the distance of the
   * plane from the origin.
   * @type {Cartesian4[]}
   * @default []
   */
  this.planes = defaultValue(planes, []);
}

const faces = [new Cartesian3(), new Cartesian3(), new Cartesian3()];
Cartesian3.clone(Cartesian3.UNIT_X, faces[0]);
Cartesian3.clone(Cartesian3.UNIT_Y, faces[1]);
Cartesian3.clone(Cartesian3.UNIT_Z, faces[2]);

const scratchPlaneCenter = new Cartesian3();
const scratchPlaneNormal = new Cartesian3();
const scratchPlane = new Plane(new Cartesian3(1.0, 0.0, 0.0), 0.0);

/**
 * Constructs a culling volume from a bounding sphere. Creates six planes that create a box containing the sphere.
 * The planes are aligned to the x, y, and z axes in world coordinates.
 *
 * @param {BoundingSphere} boundingSphere The bounding sphere used to create the culling volume.
 * @param {CullingVolume} [result] The object onto which to store the result.
 * @returns {CullingVolume} The culling volume created from the bounding sphere.
 */
CullingVolume.fromBoundingSphere = function (boundingSphere, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(boundingSphere)) {
    throw new DeveloperError("boundingSphere is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new CullingVolume();
  }

  const length = faces.length;
  const planes = result.planes;
  planes.length = 2 * length;

  const center = boundingSphere.center;
  const radius = boundingSphere.radius;

  let planeIndex = 0;

  for (let i = 0; i < length; ++i) {
    const faceNormal = faces[i];

    let plane0 = planes[planeIndex];
    let plane1 = planes[planeIndex + 1];

    if (!defined(plane0)) {
      plane0 = planes[planeIndex] = new Cartesian4();
    }
    if (!defined(plane1)) {
      plane1 = planes[planeIndex + 1] = new Cartesian4();
    }

    Cartesian3.multiplyByScalar(faceNormal, -radius, scratchPlaneCenter);
    Cartesian3.add(center, scratchPlaneCenter, scratchPlaneCenter);

    plane0.x = faceNormal.x;
    plane0.y = faceNormal.y;
    plane0.z = faceNormal.z;
    plane0.w = -Cartesian3.dot(faceNormal, scratchPlaneCenter);

    Cartesian3.multiplyByScalar(faceNormal, radius, scratchPlaneCenter);
    Cartesian3.add(center, scratchPlaneCenter, scratchPlaneCenter);

    plane1.x = -faceNormal.x;
    plane1.y = -faceNormal.y;
    plane1.z = -faceNormal.z;
    plane1.w = -Cartesian3.dot(
      Cartesian3.negate(faceNormal, scratchPlaneNormal),
      scratchPlaneCenter
    );

    planeIndex += 2;
  }

  return result;
};

/**
 * Determines whether a bounding volume intersects the culling volume.
 *
 * @param {Object} boundingVolume The bounding volume whose intersection with the culling volume is to be tested.
 * @returns {Intersect}  Intersect.OUTSIDE, Intersect.INTERSECTING, or Intersect.INSIDE.
 */
CullingVolume.prototype.computeVisibility = function (boundingVolume) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(boundingVolume)) {
    throw new DeveloperError("boundingVolume is required.");
  }
  //>>includeEnd('debug');

  const planes = this.planes;
  let intersecting = false;
  for (let k = 0, len = planes.length; k < len; ++k) {
    const result = boundingVolume.intersectPlane(
      Plane.fromCartesian4(planes[k], scratchPlane)
    );
    if (result === Intersect.OUTSIDE) {
      return Intersect.OUTSIDE;
    } else if (result === Intersect.INTERSECTING) {
      intersecting = true;
    }
  }

  return intersecting ? Intersect.INTERSECTING : Intersect.INSIDE;
};

/**
 * Determines whether a bounding volume intersects the culling volume.
 *
 * @param {Object} boundingVolume The bounding volume whose intersection with the culling volume is to be tested.
 * @param {Number} parentPlaneMask A bit mask from the boundingVolume's parent's check against the same culling
 *                                 volume, such that if (planeMask & (1 << planeIndex) === 0), for k < 31, then
 *                                 the parent (and therefore this) volume is completely inside plane[planeIndex]
 *                                 and that plane check can be skipped.
 * @returns {Number} A plane mask as described above (which can be applied to this boundingVolume's children).
 *
 * @private
 */
CullingVolume.prototype.computeVisibilityWithPlaneMask = function (
  boundingVolume,
  parentPlaneMask
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(boundingVolume)) {
    throw new DeveloperError("boundingVolume is required.");
  }
  if (!defined(parentPlaneMask)) {
    throw new DeveloperError("parentPlaneMask is required.");
  }
  //>>includeEnd('debug');

  if (
    parentPlaneMask === CullingVolume.MASK_OUTSIDE ||
    parentPlaneMask === CullingVolume.MASK_INSIDE
  ) {
    // parent is completely outside or completely inside, so this child is as well.
    return parentPlaneMask;
  }

  // Start with MASK_INSIDE (all zeros) so that after the loop, the return value can be compared with MASK_INSIDE.
  // (Because if there are fewer than 31 planes, the upper bits wont be changed.)
  let mask = CullingVolume.MASK_INSIDE;

  const planes = this.planes;
  for (let k = 0, len = planes.length; k < len; ++k) {
    // For k greater than 31 (since 31 is the maximum number of INSIDE/INTERSECTING bits we can store), skip the optimization.
    const flag = k < 31 ? 1 << k : 0;
    if (k < 31 && (parentPlaneMask & flag) === 0) {
      // boundingVolume is known to be INSIDE this plane.
      continue;
    }

    const result = boundingVolume.intersectPlane(
      Plane.fromCartesian4(planes[k], scratchPlane)
    );
    if (result === Intersect.OUTSIDE) {
      return CullingVolume.MASK_OUTSIDE;
    } else if (result === Intersect.INTERSECTING) {
      mask |= flag;
    }
  }

  return mask;
};

/**
 * For plane masks (as used in {@link CullingVolume#computeVisibilityWithPlaneMask}), this special value
 * represents the case where the object bounding volume is entirely outside the culling volume.
 *
 * @type {Number}
 * @private
 */
CullingVolume.MASK_OUTSIDE = 0xffffffff;

/**
 * For plane masks (as used in {@link CullingVolume.prototype.computeVisibilityWithPlaneMask}), this value
 * represents the case where the object bounding volume is entirely inside the culling volume.
 *
 * @type {Number}
 * @private
 */
CullingVolume.MASK_INSIDE = 0x00000000;

/**
 * For plane masks (as used in {@link CullingVolume.prototype.computeVisibilityWithPlaneMask}), this value
 * represents the case where the object bounding volume (may) intersect all planes of the culling volume.
 *
 * @type {Number}
 * @private
 */
CullingVolume.MASK_INDETERMINATE = 0x7fffffff;
export default CullingVolume;
