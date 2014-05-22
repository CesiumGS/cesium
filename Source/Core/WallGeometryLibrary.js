/*global define*/
define([
        './Cartesian3',
        './Cartographic',
        './defined',
        './DeveloperError',
        './EllipsoidTangentPlane',
        './Math',
        './PolygonPipeline',
        './PolylinePipeline',
        './WindingOrder'
    ], function(
        Cartesian3,
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

    function subdivideHeights(p0, p1, h0, h1, granularity) {
        var angleBetween = Cartesian3.angleBetween(p0, p1);
        var numPoints = Math.ceil(angleBetween/granularity);
        var heights = new Array(numPoints);
        var i;
        if (h0 === h1) {
            for (i = 0; i < numPoints; i++) {
                heights[i] = h0;
            }
            return heights;
        }

        var dHeight = h1 - h0;
        var heightPerVertex = dHeight / (numPoints);

        for (i = 1; i < numPoints; i++) {
            var h = h0 + i*heightPerVertex;
            heights[i] = h;
        }

        heights[0] = h0;
        return heights;
    }

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
        var cleanedBottomHeights = hasBottomHeights ? [] : undefined;

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

        var hasMinHeights = (defined(minimumHeights));

        if (wallPositions.length >= 3) {
            // Order positions counter-clockwise
            var tangentPlane = EllipsoidTangentPlane.fromPoints(wallPositions, ellipsoid);
            var positions2D = tangentPlane.projectPointsOntoPlane(wallPositions);

            if (PolygonPipeline.computeWindingOrder2D(positions2D) === WindingOrder.CLOCKWISE) {
                wallPositions.reverse();
                maximumHeights.reverse();

                if (hasMinHeights) {
                    minimumHeights.reverse();
                }
            }
        }

        var i;
        var length = wallPositions.length;
        var newMaxHeights = [];
        var newMinHeights = (hasMinHeights) ? [] : undefined;
        var newWallPositions = [];
        for (i = 0; i < length-1; i++) {
            var p1 = wallPositions[i];
            var p2 = wallPositions[i + 1];
            var h1 = maximumHeights[i];
            var h2 = maximumHeights[i + 1];
            newMaxHeights = newMaxHeights.concat(subdivideHeights(p1, p2, h1, h2, granularity));
            if (duplicateCorners) {
                newMaxHeights.push(h2);
            }

            if (hasMinHeights) {
                p1 = wallPositions[i];
                p2 = wallPositions[i + 1];
                h1 = minimumHeights[i];
                h2 = minimumHeights[i + 1];
                newMinHeights = newMinHeights.concat(subdivideHeights(p1, p2, h1, h2, granularity));
                if (duplicateCorners) {
                    newMinHeights.push(h2);
                }
            }

            if (duplicateCorners) {
                newWallPositions = newWallPositions.concat(PolylinePipeline.scaleToSurface([p1, p2], granularity, ellipsoid));
            }
        }

        if (!duplicateCorners) {
            newWallPositions = PolylinePipeline.scaleToSurface(wallPositions, granularity, ellipsoid);
            newMaxHeights.push(maximumHeights[length-1]);
            if (hasMinHeights) {
                newMinHeights.push(minimumHeights[length-1]);
            }
        }
        var bottomPositions = (hasMinHeights) ? PolylinePipeline.scaleToGeodeticHeight(newWallPositions, newMinHeights, ellipsoid) : newWallPositions.slice(0);
        var topPositions = PolylinePipeline.scaleToGeodeticHeight(newWallPositions, newMaxHeights, ellipsoid);

        return {
            newWallPositions: newWallPositions,
            bottomPositions: bottomPositions,
            topPositions: topPositions
        };
    };

    return WallGeometryLibrary;
});
