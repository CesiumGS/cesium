/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/freezeObject',
        './TileOrientedBoundingBox',
        './TileBoundingRegion'
    ], function(
        Cartesian3,
        defaultValue,
        freezeObject,
        TileOrientedBoundingBox,
        TileBoundingRegion) {
    'use strict';

    /**
     * @alias Cesium3DTileOptimizationFlag
     *
     * Flag denoting support for a 3D Tiles optimization
     */
    var Cesium3DTileOptimizationFlag = {
        UNSUPPORTED: 0,
        SUPPORTED: 1,
        INDETERMINATE: -1
    };

    /**
     * Defines optional optimization flags for a {@link Cesium3DTileset}.
     * Optimizations marked as Cesium3DTileOptimizations.Flags.SUPPORTED or Cesium3DTileOptimizations.Flags.UNSUPPORTED
     * will not be evaluated at runtime
     *
     * @alias Cesium3DTileOptimizations
     * @constructor
     *
     * @example
     * var tileset = new Cesium.Cesium3DTileset({
     *     url: ...,
     *     optimizations: new Cesium.Cesium3DTileOptimizations({
     *         childrenWithinParent: Cesium.Cesium3DTileOptimizations.Flags.SUPPORTED
     *     })
     * });
     */
    function Cesium3DTileOptimizations(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * Denotes support for if the childrenWithinParent optimization is supported. This is used to more tightly cull tilesets if children bounds are
         * fully contained within the parent.
         *
         * @type {Cesium3DTileOptimizationFlag}
         */
        this.childrenWithinParent = defaultValue(options.childrenWithinParent, Cesium3DTileOptimizations.Flags.INDETERMINATE);
    }

    var scratchAxis = new Cartesian3();

    /**
     * Checks and optinonally evaluates support for the childrenWithinParent optimization. This is used to more tightly cull tilesets if children bounds are
     * fully contained within the parent.
     *
     * @param {Cesium3DTile} tile The tile to check.
     * @param {Boolean} [evaluate=false] Whether to evaluate support if support for the childrenWithinParent optimization is Cesium3DTileOptimizations.INDETERMINATE
     * @param {Boolean} [force=false] Whether to always evaluate support for the childrenWithinParent optimization
     * @returns {Boolean} Whether the childrenWithinParent optimization is supported.
     */
    Cesium3DTileOptimizations.prototype.checkChildrenWithinParent = function(tile, evaluate, force) {
        evaluate = defaultValue(evaluate, false);
        force = defaultValue(force, false);

        if ((this.childrenWithinParent === Cesium3DTileOptimizations.Flags.INDETERMINATE && evaluate) || force) {
            var children = tile.children;
            var length = children.length;
            var boundingVolume = tile._boundingVolume;
            if (boundingVolume instanceof TileOrientedBoundingBox || boundingVolume instanceof TileBoundingRegion) {
                var orientedBoundingBox = boundingVolume._orientedBoundingBox;
                this.childrenWithinParent = Cesium3DTileOptimizations.Flags.SUPPORTED;
                for (var i = 0; i < length; ++i) {
                    var child = children[i];
                    var childBoundingVolume = child._boundingVolume;
                    if (childBoundingVolume instanceof TileOrientedBoundingBox || childBoundingVolume instanceof TileBoundingRegion) {
                        var childOrientedBoundingBox = childBoundingVolume._orientedBoundingBox;
                        var axis = Cartesian3.subtract(childOrientedBoundingBox.center, orientedBoundingBox.center, scratchAxis);
                        var axisLength = Cartesian3.magnitude(axis);
                        Cartesian3.divideByScalar(axis, axisLength, axis);

                        var proj1 = Math.abs(orientedBoundingBox.halfAxes[0] * axis.x) +
                                    Math.abs(orientedBoundingBox.halfAxes[1] * axis.y) +
                                    Math.abs(orientedBoundingBox.halfAxes[2] * axis.z) +
                                    Math.abs(orientedBoundingBox.halfAxes[3] * axis.x) +
                                    Math.abs(orientedBoundingBox.halfAxes[4] * axis.y) +
                                    Math.abs(orientedBoundingBox.halfAxes[5] * axis.z) +
                                    Math.abs(orientedBoundingBox.halfAxes[6] * axis.x) +
                                    Math.abs(orientedBoundingBox.halfAxes[7] * axis.y) + 
                                    Math.abs(orientedBoundingBox.halfAxes[8] * axis.z);

                        var proj2 = Math.abs(childOrientedBoundingBox.halfAxes[0] * axis.x) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[1] * axis.y) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[2] * axis.z) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[3] * axis.x) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[4] * axis.y) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[5] * axis.z) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[6] * axis.x) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[7] * axis.y) +
                                    Math.abs(childOrientedBoundingBox.halfAxes[8] * axis.z);

                        if (proj1 <= proj2 + axisLength) {
                            this.childrenWithinParent = Cesium3DTileOptimizations.Flags.UNSUPPORTED;
                            break;
                        }

                    } else {
                        this.childrenWithinParent = Cesium3DTileOptimizations.Flags.UNSUPPORTED;
                        break;
                    }
                }
            }
        }

        return this.childrenWithinParent === Cesium3DTileOptimizations.Flags.SUPPORTED ? true : false;
    }

    Cesium3DTileOptimizations.Flags = freezeObject(Cesium3DTileOptimizationFlag)

    return Cesium3DTileOptimizations;
});
