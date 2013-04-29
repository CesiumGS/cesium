/*global define*/
define([
        './DeveloperError',
        './Cartesian2',
        './PrimitiveType',
        './defaultValue'
    ], function(
        DeveloperError,
        Cartesian2,
        PrimitiveType,
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PlaneTessellator
     *
     * @see CubeMapEllipsoidTessellator
     * @see BoxTessellator
     */
    var PlaneTessellator = {
        /**
         * DOC_TBA
         *
         * @exception {DeveloperError} Resolution must be greater than one in both the x and y directions.
         */
        compute : function(options) {
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            var resolution = typeof options.resolution !== "undefined" ? options.resolution : new Cartesian2(2, 2);
            var onInterpolation = options.onInterpolation; // Can be undefined

            if (resolution.x <= 1 || resolution.y <= 1) {
                throw new DeveloperError('Resolution must be greater than one in both the x and y directions.');
            }

            var i;
            var j;

            // To allow computing custom attributes, e.g., texture coordinates, etc.
            if (onInterpolation) {
                for (j = 0; j < resolution.y; ++j) {
                    var yTime = j / (resolution.y - 1);

                    for (i = 0; i < resolution.x; ++i) {
                        var xTime = i / (resolution.x - 1);
                        onInterpolation(new Cartesian2(xTime, yTime));
                    }
                }
            }

            var indices = [];

            // Counterclockwise winding order
            for (j = 0; j < resolution.y - 1; ++j) {
                var row = j * resolution.x;
                var aboveRow = (j + 1) * resolution.x;

                for (i = 0; i < resolution.x - 1; ++i) {
                    indices.push(row + i, row + i + 1, aboveRow + i + 1);
                    indices.push(row + i, aboveRow + i + 1, aboveRow + i);
                }
            }

            return {
                attributes : {},
                indexLists : [{
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : indices
                }]
            };
        }
    };

    return PlaneTessellator;
});