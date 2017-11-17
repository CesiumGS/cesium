define([
    '../Core/BoundingSphere',
    '../Core/buildModuleUrl',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/Matrix4',
    '../Core/Plane'
], function(
    BoundingSphere,
    buildModuleUrl,
    Cartesian3,
    Cartographic,
    Color,
    defaultValue,
    defined,
    Matrix4,
    Plane) {
    'use strict';

    /**
     * The globe rendered in the scene, including its terrain ({@link ClippingPlanesCollection#terrainProvider})
     * and imagery layers ({@link ClippingPlanesCollection#imageryLayers}).  Access the globe using {@link Scene#globe}.
     *
     * @alias ClippingPlanesCollection
     * @constructor
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] Determines the size and shape of the
     * globe.
     */
    function ClippingPlanesCollection(options) {
        var options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * An array of up to 6 {@link Plane} used to selectively disable rendering on the outside of each plane.
         *
         * @type {Plane}
         * @default []
         */
        this.planes = defaultValue(options.planes, []);

        /**
         * Determines whether the clipping planes are active.
         *
         * @type {Boolean}
         * @default true
         */
        this.enabled = defaultValue(options.enabled, true);

        /**
         * A transformation matrix specifying the coordinate system for this collection.
         *
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        this.transformationMatrix = defaultValue(options.transformationMatrix, Matrix4.IDENTITY);

        /**
         * If true, the region to be clipped must be included in all planes in this collection.
         * Otherwise, a region will be clipped if included in any plane in the collection.
         *
         * @type {Boolean}
         * @default true
         */
        this.inclusive = defaultValue(options.inclusive, true);

        /**
         * The color of the highlighted clipped edge.
         *
         * @type {Color}
         * @default Color.WHITE
         */
        this.edgeColor = defaultValue(options.edgeColor, Color.WHITE);

        /**
         * The width of the clipped edge to highlight.
         *
         * @type {Number}
         * @default 0.0
         */
        this.edgeWidth = defaultValue(options.edgeWidth, 0.0);

        this._geometries = undefined;
    }

    var scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0);
    var scratchMatrix = new Matrix4();
    /**
     * Applies the transformations to each plane and packs it into an array.
     *
     * @param viewMatrix
     * @param [array]
     * @returns {Cartesian4[]} The array of packed planes.
     */
    ClippingPlanesCollection.prototype.transformAndPackPlanes = function (viewMatrix, array) {
        var planes = this.planes;
        var length = planes.length;

        if (!defined(array)) {
            array = new Array(length);
        }

        var transform = Matrix4.multiply(viewMatrix, this.transformationMatrix, scratchMatrix);

        for (var j = 0; j < length; ++j) {
            var plane = planes[j];
            var packedPlane = array[j];

            Plane.transform(plane, transform, scratchPlane);

            Cartesian3.clone(scratchPlane.normal, packedPlane);
            packedPlane.w = scratchPlane.distance;
        }

        return array;
    };

    /**
     * Duplicates this ClippingPlanesCollection instance.
     *
     * @param {ClippingPlanesCollection} [result] The object onto which to store the result.
     * @returns he modified result parameter or a new ClippingPlanesCollection instance if one was not provided.
     */
    ClippingPlanesCollection.prototype.clone = function (result) {
        if (!defined(result)) {
            result = new ClippingPlanesCollection();
        }

        result.planes = Array.from(this.planes);
        result.enabled = this.enabled;
        Matrix4.clone(this.transformationMatrix, result.transformationMatrix);
        result.inclusive = this.inclusive;
        Color.clone(this.edgeColor, result.edgeColor);
        result.edgeWidth = this.edgeWidth;

        return result;
    };

    return ClippingPlanesCollection;
});
