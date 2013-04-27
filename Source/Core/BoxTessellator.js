/*global define*/
define([
        './DeveloperError',
        './Cartesian3',
        './ComponentDatatype',
        './PrimitiveType',
        './defaultValue'
    ], function(
        DeveloperError,
        Cartesian3,
        ComponentDatatype,
        PrimitiveType,
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias BoxTessellator
     * @exports BoxTessellator
     *
     * @see CubeMapEllipsoidTessellator
     * @see PlaneTessellator
     */
    var BoxTessellator = {
        /**
         * DOC_TBA
         *
         * @exception {DeveloperError} All dimensions' components must be greater than or equal to zero.
         */
        compute : function(options) {
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

            var mesh = {};
            mesh.attributes = {};
            mesh.indexLists = [];

            // 8 corner points.
            mesh.attributes.position = {
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : [
                          minimumCorner.x, minimumCorner.y, minimumCorner.z,
                          maximumCorner.x, minimumCorner.y, minimumCorner.z,
                          maximumCorner.x, maximumCorner.y, minimumCorner.z,
                          minimumCorner.x, maximumCorner.y, minimumCorner.z,
                          minimumCorner.x, minimumCorner.y, maximumCorner.z,
                          maximumCorner.x, minimumCorner.y, maximumCorner.z,
                          maximumCorner.x, maximumCorner.y, maximumCorner.z,
                          minimumCorner.x, maximumCorner.y, maximumCorner.z
                      ]
            };

            // 12 triangles:  6 faces, 2 triangles each.
            mesh.indexLists.push({
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
            });

            return mesh;
        }
    };

    return BoxTessellator;
});