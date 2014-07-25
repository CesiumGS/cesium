/*global define*/
define([
        './Cartographic',
        './defined',
        './DeveloperError',
        './EllipsoidTangentPlane',
        './Math',
        './PolygonPipeline',
        './PolylinePipeline',
        './WindingOrder'
    ], function(
        Cartographic,
        defined,
        DeveloperError,
        EllipsoidTangentPlane,
        CesiumMath,
        PolygonPipeline,
        PolylinePipeline,
        WindingOrder) {
    "use strict";

    /**
     * private
     */
    var WallGeometryLibrary = {};

    function latLonEquals(c0, c1) {
        return ((CesiumMath.equalsEpsilon(c0.latitude, c1.latitude, CesiumMath.EPSILON14)) && (CesiumMath.equalsEpsilon(c0.longitude, c1.longitude, CesiumMath.EPSILON14)));
    }

    var scratchCartographic1 = new Cartographic();
    var scratchCartographic2 = new Cartographic();
    function removeDuplicates(ellipsoid, positions, topHeights, bottomHeights) {
        var hasBottomHeights = (defined(bottomHeights));
        var hasTopHeights = (defined(topHeights));
        var cleanedPositions = [];
        var cleanedTopHeights = [];
        var cleanedBottomHeights = [];

        var length = positions.length;
        if (length < 2) {
            return { positions: positions };
        }

        var v0 = positions[0];
        cleanedPositions.push(v0);
        var c0 = ellipsoid.cartesianToCartographic(v0, scratchCartographic1);
        if (hasTopHeights) {
            c0.height = topHeights[0];
        }
        cleanedTopHeights.push(c0.height);
        if (hasBottomHeights) {
            cleanedBottomHeights.push(bottomHeights[0]);
        } else {
            cleanedBottomHeights.push(0);
        }

        for (var i = 1; i < length; ++i) {
            var v1 = positions[i];
            var c1 = ellipsoid.cartesianToCartographic(v1, scratchCartographic2);
            if (hasTopHeights) {
                c1.height = topHeights[i];
            }
            if (!latLonEquals(c0, c1)) {
                cleanedPositions.push(v1); // Shallow copy!
                cleanedTopHeights.push(c1.height);
                if (hasBottomHeights) {
                    cleanedBottomHeights.push(bottomHeights[i]);
                } else {
                    cleanedBottomHeights.push(0);
                }
            } else if (c0.height < c1.height) {
                cleanedTopHeights[cleanedTopHeights.length-1] = c1.height;
            }

            Cartographic.clone(c1, c0);
        }

        return {
            positions: cleanedPositions,
            topHeights: cleanedTopHeights,
            bottomHeights: cleanedBottomHeights
        };
    }

    /**
     * @private
     */
    WallGeometryLibrary.computePositions = function(ellipsoid, wallPositions, maximumHeights, minimumHeights, granularity, duplicateCorners) {
        var o = removeDuplicates(ellipsoid, wallPositions, maximumHeights, minimumHeights);

        wallPositions = o.positions;
        maximumHeights = o.topHeights;
        minimumHeights = o.bottomHeights;

        //>>includeStart('debug', pragmas.debug);
        if (wallPositions.length < 2) {
            throw new DeveloperError('unique positions must be greater than or equal to 2');
        }
        //>>includeEnd('debug');

        if (wallPositions.length >= 3) {
            // Order positions counter-clockwise
            var tangentPlane = EllipsoidTangentPlane.fromPoints(wallPositions, ellipsoid);
            var positions2D = tangentPlane.projectPointsOntoPlane(wallPositions);

            if (PolygonPipeline.computeWindingOrder2D(positions2D) === WindingOrder.CLOCKWISE) {
                wallPositions.reverse();
                maximumHeights.reverse();
                minimumHeights.reverse();
            }
        }

        var i;
        var length = wallPositions.length;
        var topPositions;
        var bottomPositions;
        var p0;
        var p1;
        if (duplicateCorners) {
            var l = 0;
            for (i = 0; i < length-1; i++) {
                p0 = wallPositions[i];
                p1 = wallPositions[i+1];

                l += PolylinePipeline.numberOfPoints(p0, p1, granularity);
                l++;
            }

            topPositions = new Float64Array(l*3);
            bottomPositions = new Float64Array(l*3);

            var offset = 0;
            for (i = 0; i < length-1; i++) {
                p0 = wallPositions[i];
                p1 = wallPositions[i + 1];
                var h0 = maximumHeights[i];
                var h1 = maximumHeights[i + 1];
                var pos = PolylinePipeline.generateArc({
                    positions: [p0, p1],
                    height: [h0, h1],
                    granularity: granularity,
                    ellipsoid: ellipsoid
                });
                topPositions.set(pos, offset);


                h0 = minimumHeights[i];
                h1 = minimumHeights[i + 1];

                bottomPositions.set(PolylinePipeline.generateArc({
                    positions: [p0, p1],
                    height: [h0, h1],
                    granularity: granularity,
                    ellipsoid: ellipsoid
                }), offset);
                offset += pos.length;
            }
        } else {
            topPositions = new Float64Array(PolylinePipeline.generateArc({
                positions: wallPositions,
                height: maximumHeights,
                granularity: granularity,
                ellipsoid: ellipsoid
            }));
            bottomPositions = new Float64Array(PolylinePipeline.generateArc({
                positions: wallPositions,
                height: minimumHeights,
                granularity: granularity,
                ellipsoid: ellipsoid
            }));
        }

        return {
            bottomPositions: bottomPositions,
            topPositions: topPositions
        };
    };

    return WallGeometryLibrary;
});
