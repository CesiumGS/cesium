/*global define*/
define([
        './DeveloperError',
        './Cartesian3',
        './ComponentDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './Geometry',
        './GeometryAttribute',
        './GeometryIndices',
        './VertexFormat'
    ], function(
        DeveloperError,
        Cartesian3,
        ComponentDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        Geometry,
        GeometryAttribute,
        GeometryIndices,
        VertexFormat) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias EllipsoidGeometry
     * @constructor
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     */
    var BoxGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var minimumCorner;
        var maximumCorner;

        if (typeof options.minimumCorner !== 'undefined' && typeof options.maximumCorner !== 'undefined') {
            minimumCorner = options.minimumCorner;
            maximumCorner = options.maximumCorner;
        } else {
            var dimensions = typeof options.dimensions !== 'undefined' ? options.dimensions : new Cartesian3(1.0, 1.0, 1.0);

            if (dimensions.x < 0 || dimensions.y < 0 || dimensions.z < 0) {
                throw new DeveloperError('All dimensions components must be greater than or equal to zero.');
            }

            var corner = dimensions.multiplyByScalar(0.5);
            minimumCorner = corner.negate();
            maximumCorner = corner;
        }

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        var attributes;
        var indexLists;

//        if (vertexFormat !== VertexFormat.POSITION_ONLY) {
//        } else {
            // Positions only - no need to duplicate corner points
            attributes = {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [
                        // 8 corner points.
                        minimumCorner.x, minimumCorner.y, minimumCorner.z,
                        maximumCorner.x, minimumCorner.y, minimumCorner.z,
                        maximumCorner.x, maximumCorner.y, minimumCorner.z,
                        minimumCorner.x, maximumCorner.y, minimumCorner.z,
                        minimumCorner.x, minimumCorner.y, maximumCorner.z,
                        maximumCorner.x, minimumCorner.y, maximumCorner.z,
                        maximumCorner.x, maximumCorner.y, maximumCorner.z,
                        minimumCorner.x, maximumCorner.y, maximumCorner.z
                    ]
                })
            };

            indexLists = [
                new GeometryIndices({
                    // 12 triangles:  6 faces, 2 triangles each.
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : [
                        4, 5, 6, // Top: plane z = corner.Z
                        4, 6, 7,
                        1, 0, 3, // Bottom: plane z = -corner.Z
                        1, 3, 2,
                        1, 6, 5, // Side: plane x = corner.X
                        1, 2, 6,
                        2, 3, 7, // Side: plane y = corner.Y
                        2, 7, 6,
                        3, 0, 4, // Side: plane x = -corner.X
                        3, 4, 7,
                        0, 1, 5, // Side: plane y = -corner.Y
                        0, 5, 4
                    ]
                })
            ];
//        }

        /**
         * DOC_TBA
         */
        this.attributes = attributes;

        /**
         * DOC_TBA
         */
        this.indexLists = indexLists;

        /**
         * DOC_TBA
         */
        this.boundingSphere = new BoundingSphere(new Cartesian3(), maximumCorner.subtract(minimumCorner).magnitude() * 0.5);
    };

    BoxGeometry.prototype = new Geometry();

    return BoxGeometry;
});