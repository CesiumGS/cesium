/*global define*/
define([
        './defaultValue',
        './Matrix4',
        './Geometry'
    ], function(
        defaultValue,
        Matrix4,
        Geometry) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias GeometryInstance
     * @constructor
     *
     * @param {Geometry} [options.geometry] The geometry to instance.
     * @param {Matrix4} [options.modelMatrix] The model matrix for this geometry.
     * @param {Color} [options.color] The color of the geometry when a per-geometry color appearance is used.
     * @param {Object} [options.pickData] DOC_TBA
     */
    var GeometryInstance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.geometry = options.geometry;

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * The color of the geometry when a per-geometry color appearance is used.
         *
         * @type Color
         */
        this.color = options.color;

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    /**
     * DOC_TBA
     */
    GeometryInstance.prototype.clone = function(result) {
        if (typeof result === 'undefined') {
            result = new GeometryInstance();
        }

        result.geometry = Geometry.clone(this.geometry);    // Looses type info, e.g., BoxGeometry to Geometry.
        result.modelMatrix = this.modelMatrix.clone(result.modelMatrix);
        result.color = (typeof this.color !== 'undefined') ? this.color.clone() : undefined;
        result.pickData = this.pickData;                    // Shadow copy

        return result;
    };

    return GeometryInstance;
});
