/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Intersect'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Intersect) {
    "use strict";

    /**
     * The culling volume defined by planes.
     *
     * @alias CullingVolume
     * @constructor
     *
     * @param {Cartesian4[]} planes An array of clipping planes.
     */
    var CullingVolume = function(planes) {
        /**
         * Each plane is represented by a Cartesian4 object, where the x, y, and z components
         * define the unit vector normal to the plane, and the w component is the distance of the
         * plane from the origin.
         * @type {Cartesian4[]}
         * @default []
         */
        this.planes = defaultValue(planes, []);
    };

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
            var result = boundingVolume.intersect(planes[k]);
            if (result === Intersect.OUTSIDE) {
                return Intersect.OUTSIDE;
            } else if (result === Intersect.INTERSECTING) {
                intersecting = true;
            }
        }

        return intersecting ? Intersect.INTERSECTING : Intersect.INSIDE;
    };

    return CullingVolume;
});
