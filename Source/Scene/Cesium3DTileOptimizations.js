import Cartesian3 from '../Core/Cartesian3.js';
import Check from '../Core/Check.js';
import Cesium3DTileOptimizationHint from './Cesium3DTileOptimizationHint.js';
import TileBoundingRegion from './TileBoundingRegion.js';
import TileOrientedBoundingBox from './TileOrientedBoundingBox.js';

    /**
     * Utility functions for computing optimization hints for a {@link Cesium3DTileset}.
     *
     * @exports Cesium3DTileOptimizations
     *
     * @private
     */
    var Cesium3DTileOptimizations = {};

    var scratchAxis = new Cartesian3();

    /**
     * Evaluates support for the childrenWithinParent optimization. This is used to more tightly cull tilesets if
     * children bounds are fully contained within the parent. Currently, support for the optimization only works for
     * oriented bounding boxes, so both the child and parent tile must be either a {@link TileOrientedBoundingBox} or
     * {@link TileBoundingRegion}. The purpose of this check is to prevent use of a culling optimization when the child
     * bounds exceed those of the parent. If the child bounds are greater, it is more likely that the optimization will
     * waste CPU cycles. Bounding spheres are not supported for the reason that the child bounds can very often be
     * partially outside of the parent bounds.
     *
     * @param {Cesium3DTile} tile The tile to check.
     * @returns {Boolean} Whether the childrenWithinParent optimization is supported.
     */
    Cesium3DTileOptimizations.checkChildrenWithinParent = function(tile) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('tile', tile);
        //>>includeEnd('debug');

        var children = tile.children;
        var length = children.length;

        // Check if the parent has an oriented bounding box.
        var boundingVolume = tile.boundingVolume;
        if (boundingVolume instanceof TileOrientedBoundingBox || boundingVolume instanceof TileBoundingRegion) {
            var orientedBoundingBox = boundingVolume._orientedBoundingBox;
            tile._optimChildrenWithinParent = Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
            for (var i = 0; i < length; ++i) {
                var child = children[i];

                // Check if the child has an oriented bounding box.
                var childBoundingVolume = child.boundingVolume;
                if (!(childBoundingVolume instanceof TileOrientedBoundingBox || childBoundingVolume instanceof TileBoundingRegion)) {
                    // Do not support if the parent and child both do not have oriented bounding boxes.
                    tile._optimChildrenWithinParent = Cesium3DTileOptimizationHint.SKIP_OPTIMIZATION;
                    break;
                }

                var childOrientedBoundingBox = childBoundingVolume._orientedBoundingBox;

                // Compute the axis from the parent to the child.
                var axis = Cartesian3.subtract(childOrientedBoundingBox.center, orientedBoundingBox.center, scratchAxis);
                var axisLength = Cartesian3.magnitude(axis);
                Cartesian3.divideByScalar(axis, axisLength, axis);

                // Project the bounding box of the parent onto the axis. Because the axis is a ray from the parent
                // to the child, the projection parameterized along the ray will be (+/- proj1).
                var proj1 = Math.abs(orientedBoundingBox.halfAxes[0] * axis.x) +
                            Math.abs(orientedBoundingBox.halfAxes[1] * axis.y) +
                            Math.abs(orientedBoundingBox.halfAxes[2] * axis.z) +
                            Math.abs(orientedBoundingBox.halfAxes[3] * axis.x) +
                            Math.abs(orientedBoundingBox.halfAxes[4] * axis.y) +
                            Math.abs(orientedBoundingBox.halfAxes[5] * axis.z) +
                            Math.abs(orientedBoundingBox.halfAxes[6] * axis.x) +
                            Math.abs(orientedBoundingBox.halfAxes[7] * axis.y) +
                            Math.abs(orientedBoundingBox.halfAxes[8] * axis.z);

                // Project the bounding box of the child onto the axis. Because the axis is a ray from the parent
                // to the child, the projection parameterized along the ray will be (+/- proj2) + axis.length.
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
                    tile._optimChildrenWithinParent = Cesium3DTileOptimizationHint.SKIP_OPTIMIZATION;
                    break;
                }
            }
        }

        return tile._optimChildrenWithinParent === Cesium3DTileOptimizationHint.USE_OPTIMIZATION;
    };
export default Cesium3DTileOptimizations;
