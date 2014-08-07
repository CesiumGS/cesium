/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defineProperties',
        '../Core/EllipsoidalOccluder'
    ], function(
        Cartesian3,
        defineProperties,
        EllipsoidalOccluder) {
    "use strict";

    /**
     * A set of occluders that can be used to test quadtree tiles for occlusion.
     *
     * @alias QuadtreeOccluders
     * @constructor
     * @private
     *
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid that potentially occludes tiles.
     */
    var QuadtreeOccluders = function(options) {
        this._ellipsoid = new EllipsoidalOccluder(options.ellipsoid, Cartesian3.ZERO);
    };

    defineProperties(QuadtreeOccluders.prototype, {
        /**
         * Gets the {@link EllipsoidalOccluder} that can be used to determine if a point is
         * occluded by an {@link Ellipsoid}.
         * @type {EllipsoidalOccluder}
         * @memberof QuadtreeOccluders.prototype
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        }
    });

    return QuadtreeOccluders;
});