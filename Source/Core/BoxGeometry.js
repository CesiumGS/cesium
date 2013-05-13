/*global define*/
define([
        './DeveloperError',
        './Cartesian3',
        './Matrix4',
        './ComponentDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryIndices',
        './VertexFormat'
    ], function(
        DeveloperError,
        Cartesian3,
        Matrix4,
        ComponentDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
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

        var min;
        var max;

        if (typeof options.minimumCorner !== 'undefined' && typeof options.maximumCorner !== 'undefined') {
            min = options.minimumCorner;
            max = options.maximumCorner;
        } else {
            var dimensions = typeof options.dimensions !== 'undefined' ? options.dimensions : new Cartesian3(1.0, 1.0, 1.0);

            if (dimensions.x < 0 || dimensions.y < 0 || dimensions.z < 0) {
                throw new DeveloperError('All dimensions components must be greater than or equal to zero.');
            }

            var corner = dimensions.multiplyByScalar(0.5);
            min = corner.negate();
            max = corner;
        }

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        var attributes = {};
        var indexLists = [];

// TODO: use typed arrays

        if (vertexFormat !== VertexFormat.POSITION_ONLY) {

            if (vertexFormat.position) {
                // 8 corner points.  Duplicated 3 times each for each incident edge/face.
                attributes.position = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [
                        // +z face
                        min.x, min.y, max.z,
                        max.x, min.y, max.z,
                        max.x, max.y, max.z,
                        min.x, max.y, max.z,

                        // -z face
                        min.x, min.y, min.z,
                        max.x, min.y, min.z,
                        max.x, max.y, min.z,
                        min.x, max.y, min.z,

                        // +x face
                        max.x, min.y, min.z,
                        max.x, max.y, min.z,
                        max.x, max.y, max.z,
                        max.x, min.y, max.z,

                        // -x face
                        min.x, min.y, min.z,
                        min.x, max.y, min.z,
                        min.x, max.y, max.z,
                        min.x, min.y, max.z,

                        // +y face
                        min.x, max.y, min.z,
                        max.x, max.y, min.z,
                        max.x, max.y, max.z,
                        min.x, max.y, max.z,

                        // -y face
                        min.x, min.y, min.z,
                        max.x, min.y, min.z,
                        max.x, min.y, max.z,
                        min.x, min.y, max.z
                    ]
                });
            }

            if (vertexFormat.normal) {
                attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [
                        // +z face
                        0.0, 0.0, 1.0,
                        0.0, 0.0, 1.0,
                        0.0, 0.0, 1.0,
                        0.0, 0.0, 1.0,

                        // -z face
                        0.0, 0.0, -1.0,
                        0.0, 0.0, -1.0,
                        0.0, 0.0, -1.0,
                        0.0, 0.0, -1.0,

                        // +x face
                        1.0, 0.0, 0.0,
                        1.0, 0.0, 0.0,
                        1.0, 0.0, 0.0,
                        1.0, 0.0, 0.0,

                        // -x face
                        -1.0, 0.0, 0.0,
                        -1.0, 0.0, 0.0,
                        -1.0, 0.0, 0.0,
                        -1.0, 0.0, 0.0,

                        // +y face
                        0.0, 1.0, 0.0,
                        0.0, 1.0, 0.0,
                        0.0, 1.0, 0.0,
                        0.0, 1.0, 0.0,

                        // -y face
                        0.0, -1.0, 0.0,
                        0.0, -1.0, 0.0,
                        0.0, -1.0, 0.0,
                        0.0, -1.0, 0.0
                    ]
                });
            }


            if (vertexFormat.st) {
                attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        // +z face
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0,

                        // -z face
                        1.0, 0.0,
                        0.0, 0.0,
                        0.0, 1.0,
                        1.0, 1.0,

                        // +x face
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0,

                        // -x face
                        1.0, 0.0,
                        0.0, 0.0,
                        0.0, 1.0,
                        1.0, 1.0,

                        // +y face
                        1.0, 0.0,
                        0.0, 0.0,
                        0.0, 1.0,
                        1.0, 1.0,

                        // -y face
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                });
            }

            indexLists.push(
                new GeometryIndices({
                    // 12 triangles:  6 faces, 2 triangles each.
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : [
                        // +z face
                        0, 1, 2,
                        0, 2, 3,

                        // -z face
                        4 + 2, 4 + 1, 4 + 0,
                        4 + 3, 4 + 2, 4 + 0,

                        // +x face
                        8 + 0, 8 + 1, 8 + 2,
                        8 + 0, 8 + 2, 8 + 3,

                        // -x face
                        12 + 2, 12 + 1, 12 + 0,
                        12 + 3, 12 + 2, 12 + 0,

                        // +y face
                        16 + 2, 16 + 1, 16 + 0,
                        16 + 3, 16 + 2, 16 + 0,

                        // -y face
                        20 + 0, 20 + 1, 20 + 2,
                        20 + 0, 20 + 2, 20 + 3,
                    ]
                }));
        } else {
            // Positions only - no need to duplicate corner points
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : [
                    // 8 corner points.
                    min.x, min.y, min.z,
                    max.x, min.y, min.z,
                    max.x, max.y, min.z,
                    min.x, max.y, min.z,
                    min.x, min.y, max.z,
                    max.x, min.y, max.z,
                    max.x, max.y, max.z,
                    min.x, max.y, max.z
                ]
            });

            indexLists.push(
                new GeometryIndices({
                    // 12 triangles:  6 faces, 2 triangles each.
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : [
                        4, 5, 6, // plane z = corner.Z
                        4, 6, 7,
                        1, 0, 3, // plane z = -corner.Z
                        1, 3, 2,
                        1, 6, 5, // plane x = corner.X
                        1, 2, 6,
                        2, 3, 7, // plane y = corner.Y
                        2, 7, 6,
                        3, 0, 4, // plane x = -corner.X
                        3, 4, 7,
                        0, 1, 5, // plane y = -corner.Y
                        0, 5, 4
                    ]
                }));
        }

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
        this.boundingSphere = new BoundingSphere(new Cartesian3(), max.subtract(min).magnitude() * 0.5);

        /**
         * DOC_TBA
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    return BoxGeometry;
});