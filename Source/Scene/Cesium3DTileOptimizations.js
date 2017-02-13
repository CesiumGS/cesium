/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/freezeObject',
        './Cesium3DTileOptimizationHint',
        './TileOrientedBoundingBox',
        './TileBoundingRegion'
    ], function(
        Cartesian3,
        defaultValue,
        defineProperties,
        freezeObject,
        Cesium3DTileOptimizationHint,
        TileOrientedBoundingBox,
        TileBoundingRegion) {
    'use strict';

    /**
     * Defines optional optimization hints for a {@link Cesium3DTileset}.
     * Optimizations marked as {@link Cesium3DTileOptimizationHint.USE_OPTIMIZATION} or {@link Cesium3DTileOptimizationHint.SKIP_OPTIMIZATION}
     * will not be evaluated at runtime
     *
     * @private
     * 
     * @alias Cesium3DTileOptimizations
     * @constructor
     */
    function Cesium3DTileOptimizations(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * Denotes support for if the childrenWithinParent optimization is supported. This is used to more tightly cull tilesets if children bounds are
         * fully contained within the parent.
         *
         * @type {Cesium3DTileOptimizationHint}
         */
        this.childrenWithinParent = defaultValue(options.childrenWithinParent, Cesium3DTileOptimizationHint.NOT_COMPUTED);
    }

    var scratchAxis = new Cartesian3();

    /**
     * Checks and optionnally evaluates support for the childrenWithinParent optimization. This is used to more tightly cull tilesets if children bounds are
     * fully contained within the parent. Currently, support for the optimization only works for oriented bounding boxes, so both the child and parent tile 
     * must be either a {@link TileOrientedBoundingBox} or {@link TileBoundingRegion}. The purpose of this check is to prevent use of a culling optimization
     * when the child bounds exceed those of the parent.
     *
     * @param {Cesium3DTile} tile The tile to check.
     * @param {Boolean} [evaluate=false] Whether to evaluate support if support for the childrenWithinParent optimization is Cesium3DTileOptimizations.Hints.NOT_COMPUTED
     * @param {Boolean} [force=false] Whether to always evaluate support for the childrenWithinParent optimization
     * @returns {Boolean} Whether the childrenWithinParent optimization is supported.
     */
    Cesium3DTileOptimizations.prototype.checkChildrenWithinParent = function(tile, evaluate, force) {
        evaluate = defaultValue(evaluate, false);
        force = defaultValue(force, false);

        if ((this.childrenWithinParent === Cesium3DTileOptimizationHint.NOT_COMPUTED && evaluate) || force) {
            var children = tile.children;
            var length = children.length;

            // Check if the parent has an oriented bounding box.
            var boundingVolume = tile._boundingVolume;
            if (boundingVolume instanceof TileOrientedBoundingBox || boundingVolume instanceof TileBoundingRegion) {
                var orientedBoundingBox = boundingVolume._orientedBoundingBox;
                this.childrenWithinParent = Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
                for (var i = 0; i < length; ++i) {
                    var child = children[i];

                    // Check if the child has an oriented bounding box.
                    var childBoundingVolume = child._boundingVolume;
                    if (childBoundingVolume instanceof TileOrientedBoundingBox || childBoundingVolume instanceof TileBoundingRegion) {
                        var childOrientedBoundingBox = childBoundingVolume._orientedBoundingBox;

                        // Compute the axis from the parent to the child.
                        var axis = Cartesian3.subtract(childOrientedBoundingBox.center, orientedBoundingBox.center, scratchAxis);
                        var axisLength = Cartesian3.magnitude(axis);
                        Cartesian3.divideByScalar(axis, axisLength, axis);

                        // Project the bounding box of the parent onto the axis. Because the axis is a ray from the parent to the child,
                        // the projection parameterized along the ray will be (+/- proj1).
                        var proj1 = Math.abs(orientedBoundingBox.halfAxes[0] * axis.x) +
                                    Math.abs(orientedBoundingBox.halfAxes[1] * axis.y) +
                                    Math.abs(orientedBoundingBox.halfAxes[2] * axis.z) +
                                    Math.abs(orientedBoundingBox.halfAxes[3] * axis.x) +
                                    Math.abs(orientedBoundingBox.halfAxes[4] * axis.y) +
                                    Math.abs(orientedBoundingBox.halfAxes[5] * axis.z) +
                                    Math.abs(orientedBoundingBox.halfAxes[6] * axis.x) +
                                    Math.abs(orientedBoundingBox.halfAxes[7] * axis.y) + 
                                    Math.abs(orientedBoundingBox.halfAxes[8] * axis.z);
                        
                        // Project the bounding box of the child onto the axis. Because the axis is a ray from the parent to the child,
                        // the projection parameterized along the ray will be (+/- proj2) + axis.length.
                        var proj2 = Math.abs(childOrientedBoundingBox.halfAxes[0] * axis.x) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[1] * axis.y) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[2] * axis.z) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[3] * axis.x) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[4] * axis.y) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[5] * axis.z) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[6] * axis.x) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[7] * axis.y) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[8] * axis.z);
                        
                        // If the child extends the parent's bounds, the optimization is not valid and we skip it.
                        if (proj1 <= proj2 + axisLength) {
                            this.childrenWithinParent = Cesium3DTileOptimizationHint.SKIP_OPTIMIZATION;
                            break;
                        }

                    } else {
                        // Do not support if the parent and child both do not have oriented bounding boxes.
                        this.childrenWithinParent = Cesium3DTileOptimizationHint.SKIP_OPTIMIZATION;
                        break;
                    }
                }
            }
        }

        return this.childrenWithinParent === Cesium3DTileOptimizationHint.USE_OPTIMIZATION ? true : false;
    }

    return Cesium3DTileOptimizations;
});
