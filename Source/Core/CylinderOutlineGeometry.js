/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
        './Math',
        './ComponentDatatype',
        './IndexDatatype',
        './PrimitiveType',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes'
    ], function(
        defaultValue,
        DeveloperError,
        Cartesian2,
        Cartesian3,
        CesiumMath,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes) {
    "use strict";

    var radiusScratch = new Cartesian2();

    /**
     * A {@link Geometry} that represents vertices and indices for the outline of a cylinder.
     *
     * @alias CylinderGeometryOutline
     * @constructor
     *
     * @param {Number} options.length The length of the cylinder.
     * @param {Number} options.topRadius The radius of the top of the cylinder.
     * @param {Number} options.bottomRadius The radius of the bottom of the cylinder.
     * @param {Number} [options.slices = 100] The number of edges around perimeter of the cylinder.
     * @param {Number} [options.lateralSurfaceLines = 10] Number of lines to draw between the top and bottom surfaces of the cylinder.
     *
     * @exception {DeveloperError} options.length must be greater than 0.
     * @exception {DeveloperError} options.topRadius must be greater than 0.
     * @exception {DeveloperError} options.bottomRadius must be greater than 0.
     * @exception {DeveloperError} bottomRadius and topRadius cannot both equal 0.
     * @exception {DeveloperError} options.slices must be greater that 3.
     *
     * @example
     * // create cylinder geometry
     * var cylinder = new Cesium.CylinderGeometryOutline({
     *     length: 200000,
     *     topRadius: 80000,
     *     bottomRadius: 200000,
     * });
     *
     */
    var CylinderGeometryOutline = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var length = options.length;
        if (typeof length === 'undefined' || length <= 0) {
            throw new DeveloperError('options.length must be greater than 0.');
        }
        var topRadius = options.topRadius;
        if (typeof topRadius === 'undefined' || topRadius < 0) {
            throw new DeveloperError('options.topRadius must be greater than 0.');
        }
        var bottomRadius = options.bottomRadius;
        if (typeof bottomRadius === 'undefined' || bottomRadius < 0) {
            throw new DeveloperError('options.bottomRadius must be greater than 0.');
        }
        if (bottomRadius === 0 && topRadius === 0) {
            throw new DeveloperError('bottomRadius and topRadius cannot both equal 0.');
        }

        var slices = defaultValue(options.slices, 100);
        if (slices < 3) {
            throw new DeveloperError('options.slices must be greater that 3.');
        }

        var lateralSurfaceLines = Math.max(defaultValue(options.lateralSurfaceLines, 10), 0);

        var topZ = length * 0.5;
        var bottomZ = -topZ;

        var numVertices = slices * 2;

        var positions = new Float64Array(numVertices * 3);

        var i;
        var index = 0;

        for (i = 0; i < slices; i++) {
            var angle = i / slices * CesiumMath.TWO_PI;
            var x = Math.cos(angle);
            var y = Math.sin(angle);
            var bottomX = x * bottomRadius;
            var bottomY = y * bottomRadius;
            var topX = x * topRadius;
            var topY = y * topRadius;

            positions[index + slices*3] = topX;
            positions[index + slices*3 + 1] = topY;
            positions[index + slices*3 + 2] = topZ;

            positions[index++] = bottomX;
            positions[index++] = bottomY;
            positions[index++] = bottomZ;
        }
        var numIndices = slices * 2;
        var numSide;
        if (lateralSurfaceLines > 0) {
            var numSideLines = Math.min(lateralSurfaceLines, slices);
            numSide = Math.round(slices/numSideLines);
            numIndices += numSideLines;
        }

        var indices = IndexDatatype.createTypedArray(numVertices, numIndices*2);
        index = 0;

        for (i = 0; i < slices-1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
            indices[index++] = i + slices;
            indices[index++] = i + 1 + slices;
        }
        indices[index++] = slices-1;
        indices[index++] = 0;
        indices[index++] = slices + slices - 1;
        indices[index++] = slices;

        if (lateralSurfaceLines > 0) {
            for (i = 0; i < slices; i+= numSide){
                indices[index++] = i;
                indices[index++] = i + slices;
            }
        }

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype: ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: positions
        });

        radiusScratch.x = length * 0.5;
        radiusScratch.y = Math.max(bottomRadius, topRadius);

        var boundingSphere = new BoundingSphere(Cartesian3.ZERO, radiusScratch.magnitude());

        /**
         * An object containing {@link GeometryAttribute} position property.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.LINES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;
    };

    return CylinderGeometryOutline;
});
