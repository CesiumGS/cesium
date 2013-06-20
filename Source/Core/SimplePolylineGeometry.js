/*global define*/
define([
        './DeveloperError',
        './ComponentDatatype',
        './IndexDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './GeometryAttribute'
    ], function(
        DeveloperError,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        GeometryAttribute) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias SimplePolylineGeometry
     * @constructor
     *
     * @exception {DeveloperError} At least two positions are required.
     */
    var SimplePolylineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;

        if ((typeof positions === 'undefined') || (positions.length < 2)) {
            throw new DeveloperError('At least two positions are required.');
        }

        var i;
        var j = 0;
        var numberOfPositions = positions.length;
        var positionValues = new Float64Array(numberOfPositions * 3);

        for (i = 0; i < numberOfPositions; ++i) {
            var p = positions[i];

            positionValues[j++] = p.x;
            positionValues[j++] = p.y;
            positionValues[j++] = p.z;
        }

        var attributes = {
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positionValues
            })
        };

        // From line strip to lines
        var numberOfIndices = 2 * (numberOfPositions - 1);
        var indices = IndexDatatype.createTypedArray(numberOfPositions, numberOfIndices);

        j = 0;
        for (i = 0; i < numberOfPositions - 1; ++i) {
            indices[j++] = i;
            indices[j++] = i + 1;
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.LINES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = BoundingSphere.fromPoints(positions);
    };

    return SimplePolylineGeometry;
});