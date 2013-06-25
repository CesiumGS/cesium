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
     * Geometry instancing allows one {@link Geometry} object to be positions in several
     * different locations and colored uniquely.  For example, one {@link BoxGeometry} can
     * be instanced several times, each with a different <code>modelMatrix</code> to change
     * its position, rotation, and scale.
     *
     * @alias GeometryInstance
     * @constructor
     *
     * @param {Geometry} [options.geometry=undefined] The geometry to instance.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The model matrix that transforms to transform the geometry from model to world coordinates.
     * @param {Color} [options.color=undefined] The color of the instance when a per-instance color appearance is used.
     * @param {Object} [options.id=undefined] A user-defined object to return when the instance is picked with {@link Context#pick} or get/set per-instance attributes with {@link Primitive#getGeometryInstanceAttributes}.
     *
     * @example
     * // Create geometry for a box, and two instances that refer to it.
     * // One instance positions the box on the bottom and colored aqua.
     * // The other instance positions the box on the top and color white.
     * var geometry = new BoxGeometry({
     *   vertexFormat : VertexFormat.POSITION_AND_NORMAL,
     *   dimensions : new Cartesian3(1000000.0, 1000000.0, 500000.0)
     * }),
     * var instanceBottom = new GeometryInstance({
     *     geometry : geometry,
     *     modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
     *       ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 1000000.0)),
     *     color : Color.AQUA,
     *     id : 'bottom'
     * });
     * var instanceTop = new GeometryInstance({
     *   geometry : geometry,
     *   modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
     *     ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 3000000.0)),
     *   color : Color.WHITE,
     *   id : 'top'
     * });
     *
     * @see Geometry
     */
    var GeometryInstance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The geometry being instanced.
         *
         * @type Geometry
         *
         * @default undefined
         */
        this.geometry = options.geometry;

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         *
         * @default Matrix4.IDENTITY
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * The color of the geometry when a per-instance color appearance is used.
         *
         * @type Color
         *
         * @default undefined
         */
        this.color = options.color;

        /**
         * User-defined object returned when the instance is picked or used to get/set per-instance attributes.
         *
         * @default undefined
         *
         * @see Context#pick
         * @see Primitive#getGeometryInstanceAttributes
         */
        this.id = options.id;
    };

    /**
     * Duplicates a GeometryInstance instance, including a deep copy of the geometry.
     * <p>
     * {@link GeometryInstance#id} is shallow copied so that the same <code>
     * id</code> reference is returned by {@link Context#pick} regardless of
     * if the geometry instance was cloned.
     * </p>
     *
     * @memberof GeometryInstance
     *
     * @param {Geometry} [result] The object onto which to store the result.
     *
     * @return {Geometry} The modified result parameter or a new GeometryInstance instance if one was not provided.
     */
    GeometryInstance.prototype.clone = function(result) {
        if (typeof result === 'undefined') {
            result = new GeometryInstance();
        }

        result.geometry = Geometry.clone(this.geometry);    // Looses type info, e.g., BoxGeometry to Geometry.
        result.modelMatrix = this.modelMatrix.clone(result.modelMatrix);
        result.color = (typeof this.color !== 'undefined') ? this.color.clone() : undefined;
        result.id = this.id;                                // Shadow copy

        return result;
    };

    return GeometryInstance;
});
