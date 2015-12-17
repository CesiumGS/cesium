/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Intersect',
        '../Core/Plane'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        Intersect,
        Plane) {
    "use strict";

    /**
     * The culling volume defined by planes.
     *
     * @alias CullingVolume
     * @constructor
     *
     * @param {Cartesian4[]} planes An array of clipping planes.
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

    var scratchPlane = new Plane(new Cartesian3(), 0.0);
    /**
     * Determines whether a bounding volume intersects the culling volume.
     *
     * @param {Object} boundingVolume The bounding volume whose intersection with the culling volume is to be tested.
     * @returns {Intersect}  Intersect.OUTSIDE, Intersect.INTERSECTING, or Intersect.INSIDE.
     */
    CullingVolume.prototype.computeVisibility = function(boundingVolume) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(boundingVolume)) {
            throw new DeveloperError('boundingVolume is required.');
        }
        //>>includeEnd('debug');

        var planes = this.planes;
        var intersecting = false;
        for (var k = 0, len = planes.length; k < len; ++k) {
            var result = boundingVolume.intersectPlane(Plane.fromCartesian4(planes[k], scratchPlane));
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
    CullingVolume.prototype.computeVisibilityWithPlaneMask = function(boundingVolume, parentPlaneMask) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(boundingVolume)) {
            throw new DeveloperError('boundingVolume is required.');
        }
        if (!defined(parentPlaneMask)) {
            throw new DeveloperError('parentPlaneMask is required.');
        }
        //>>includeEnd('debug');

        if (parentPlaneMask === CullingVolume.MASK_OUTSIDE || parentPlaneMask === CullingVolume.MASK_INSIDE) {
            // parent is completely outside or completely inside, so this child is as well.
            return parentPlaneMask;
        }

        // Start with MASK_INSIDE (all zeros) so that after the loop, the return value can be compared with MASK_INSIDE.
        // (Because if there are fewer than 31 planes, the upper bits wont be changed.)
        var mask = CullingVolume.MASK_INSIDE;

        var planes = this.planes;
        for (var k = 0, len = planes.length; k < len; ++k) {
            // For k greater than 31 (since 31 is the maximum number of INSIDE/INTERSECTING bits we can store), skip the optimization.
            var flag = (k < 31) ? (1 << k) : 0;
            if (k < 31 && (parentPlaneMask & flag) === 0) {
                // boundingVolume is known to be INSIDE this plane.
                continue;
            }

            var result = boundingVolume.intersectPlane(Plane.fromCartesian4(planes[k], scratchPlane));
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

    return CullingVolume;
});
