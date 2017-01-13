/*global defineSuite*/
defineSuite([
        'Core/sampleTerrainMostDetailed',
        'Core/Cartographic',
        'Core/CesiumTerrainProvider',
        'Core/GeographicTilingScheme',
        'Core/Rectangle',
        'ThirdParty/when'
    ], function(
        sampleTerrainMostDetailed,
        Cartographic,
        CesiumTerrainProvider,
        GeographicTilingScheme,
        Rectangle,
        when) {
    "use strict";

    var terrainProvider = new CesiumTerrainProvider({
        url : '//assets.agi.com/stk-terrain/world'
    });

    // function RectangleQuadtreeNode(tilingScheme, parent, level, x, y) {
    //     this.tilingScheme = tilingScheme;
    //     this.parent = parent;
    //     this.level = level;
    //     this.x = x;
    //     this.y = y;
    //     this.extent = tilingScheme.tileXYToRectangle(x, y, level);

    //     this.rectangles = [];
    //     this._sw = undefined;
    //     this._se = undefined;
    //     this._nw = undefined;
    //     this._ne = undefined;
    // }

    // Object.defineProperties(RectangleQuadtreeNode.prototype, {
    //     nw: {
    //         get: function() {
    //             if (!this._nw) {
    //                 this._nw = new RectangleQuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2, this.y * 2);
    //             }
    //             return this._nw;
    //         }
    //     },

    //     ne: {
    //         get: function() {
    //             if (!this._ne) {
    //                 this._ne = new RectangleQuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2 + 1, this.y * 2);
    //             }
    //             return this._ne;
    //         }
    //     },

    //     sw: {
    //         get: function() {
    //             if (!this._sw) {
    //                 this._sw = new RectangleQuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2, this.y * 2 + 1);
    //             }
    //             return this._sw;
    //         }
    //     },

    //     se: {
    //         get: function() {
    //             if (!this._se) {
    //                 this._se = new RectangleQuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2 + 1, this.y * 2 + 1);
    //             }
    //             return this._se;
    //         }
    //     }
    // });

    // function RectangleWithLevel(level, west, south, east, north) {
    //     this.level = level;
    //     this.west = west;
    //     this.south = south;
    //     this.east = east;
    //     this.north = north;
    // }

    // function rectangleContainsRectangle(potentialContainer, rectangleToTest) {
    //     return rectangleToTest.west >= potentialContainer.west &&
    //            rectangleToTest.east <= potentialContainer.east &&
    //            rectangleToTest.south >= potentialContainer.south &&
    //            rectangleToTest.north <= potentialContainer.north;
    // }

    // var checks = 0;

    // function rectangleContainsPosition(potentialContainer, positionToTest) {
    //     ++checks;
    //     return positionToTest.longitude >= potentialContainer.west &&
    //            positionToTest.longitude <= potentialContainer.east &&
    //            positionToTest.latitude >= potentialContainer.south &&
    //            positionToTest.latitude <= potentialContainer.north;
    // }

    it('queries heights', function() {
    //     var maxDepthReached = 0;
    //     var maxRectanglesInANode = 0;
    //     function putRectangleInQuadtree(maxDepth, node, rectangle) {
    //         while (node.level < maxDepth) {
    //             if (rectangleContainsRectangle(node.nw.extent, rectangle)) {
    //                 node = node.nw;
    //             } else if (rectangleContainsRectangle(node.ne.extent, rectangle)) {
    //                 node = node.ne;
    //             } else if (rectangleContainsRectangle(node.sw.extent, rectangle)) {
    //                 node = node.sw;
    //             } else if (rectangleContainsRectangle(node.se.extent, rectangle)) {
    //                 node = node.se;
    //             } else {
    //                 break;
    //             }
    //         }

    //         maxDepthReached = Math.max(maxDepthReached, node.level);

    //         node.rectangles.push(rectangleWithLevel);
    //         maxRectanglesInANode = Math.max(maxRectanglesInANode, node.rectangles.length);
    //     }

    //     function findMaxLevelAtPoint(node, position) {
    //         // Find the deepest quadtree node containing this point.
    //         while (true) {
    //             if (node._nw && rectangleContainsPosition(node._nw.extent, position)) {
    //                 node = node._nw;
    //             } else if (node._ne && rectangleContainsPosition(node._ne.extent, position)) {
    //                 node = node._ne;
    //             } else if (node._sw && rectangleContainsPosition(node._sw.extent, position)) {
    //                 node = node._sw;
    //             } else if (node._se && rectangleContainsPosition(node._se.extent, position)) {
    //                 node = node._se;
    //             } else {
    //                 break;
    //             }
    //         }

    //         // Work up the tree until we find a rectangle that contains this point.
    //         var maxLevel = 0;
    //         while (node) {
    //             var rectangles = node.rectangles;

    //             // Rectangles are sorted by level, lowest first.
    //             for (var i = rectangles.length - 1; i >= 0 && rectangles[i].level > maxLevel; --i) {
    //                 var rectangle = rectangles[i];
    //                 if (rectangleContainsPosition(rectangle, position)) {
    //                     maxLevel = rectangle.level;
    //                 }
    //             }

    //             node = node.parent;
    //         }
    //         return maxLevel;
    //     }

    //     var intersectionScratch = new Rectangle();

    //     function subtractRectangle(rectangleList, rectangleToSubtract) {
    //         var result = [];
    //         for (var i = 0; i < rectangleList.length; ++i) {
    //             var rectangle = rectangleList[i];
    //             var intersection = Rectangle.simpleIntersection(rectangle, rectangleToSubtract, intersectionScratch);
                
    //             if (!intersection) {
    //                 // Disjoint rectangles.  Original rectangle is unmodified.
    //                 result.push(rectangle);
    //             } else {
    //                 // rectangleToSubtract partially or completely overlaps rectangle.
    //                 if (rectangle.west < rectangleToSubtract.west) {
    //                     result.push(new Rectangle(rectangle.west, rectangle.south, rectangleToSubtract.west, rectangle.north));
    //                 }
    //                 if (rectangle.east > rectangleToSubtract.east) {
    //                     result.push(new Rectangle(rectangleToSubtract.east, rectangle.south, rectangle.east, rectangle.north));
    //                 }
    //                 if (rectangle.south < rectangleToSubtract.south) {
    //                     result.push(new Rectangle(Math.max(rectangleToSubtract.west, rectangle.west), rectangle.south, Math.min(rectangleToSubtract.east, rectangle.east), rectangleToSubtract.south));
    //                 }
    //                 if (rectangle.north > rectangleToSubtract.north) {
    //                     result.push(new Rectangle(Math.max(rectangleToSubtract.west, rectangle.west), rectangleToSubtract.north, Math.min(rectangleToSubtract.east, rectangle.east), rectangle.north));
    //                 }
    //             }
    //         }

    //         return result;
    //     }

    //     function findMaxLevelForRectangle(nodes, rectangle) {
    //         // TODO: split rectangle at IDL
    //         var remainingToCoverByLevel = [];

    //         var i;
    //         for (i = 0; i < nodes.length; ++i) {
    //             updateCoverageWithNode(remainingToCoverByLevel, nodes[i], rectangle);
    //         }

    //         for (i = remainingToCoverByLevel.length - 1; i >= 0; --i) {
    //             if (remainingToCoverByLevel[i] && remainingToCoverByLevel[i].length === 0) {
    //                 return i;
    //             }
    //         }

    //         return 0;
    //     }

    //     function updateCoverageWithNode(remainingToCoverByLevel, node, rectangleToCover) {
    //         if (!node || !Rectangle.intersection(node.extent, rectangleToCover, intersectionScratch)) {
    //             // This node is not applicable to the rectangle.
    //             return;
    //         }

    //         var rectangles = node.rectangles;
    //         for (var i = 0; i < rectangles.length; ++i) {
    //             var rectangle = rectangles[i];

    //             if (!remainingToCoverByLevel[rectangle.level]) {
    //                 remainingToCoverByLevel[rectangle.level] = [rectangleToCover];
    //             }

    //             remainingToCoverByLevel[rectangle.level] = subtractRectangle(remainingToCoverByLevel[rectangle.level], rectangle);
    //         }

    //         // Update with child nodes.
    //         updateCoverageWithNode(remainingToCoverByLevel, node._nw, rectangleToCover);
    //         updateCoverageWithNode(remainingToCoverByLevel, node._ne, rectangleToCover);
    //         updateCoverageWithNode(remainingToCoverByLevel, node._sw, rectangleToCover);
    //         updateCoverageWithNode(remainingToCoverByLevel, node._se, rectangleToCover);
    //     }

    //     var tilingScheme = new GeographicTilingScheme();
    //     var westernHemisphere = new RectangleQuadtreeNode(tilingScheme, undefined, 0, 0, 0);
    //     var easternHemisphere = new RectangleQuadtreeNode(tilingScheme, undefined, 0, 1, 0);

    //     var rectangleScratch = new Rectangle();

    //     for (var level = 0; level < terrainProvider._availableTiles.length; ++level) {
    //         var levelRanges = terrainProvider._availableTiles[level];
    //         var yTiles = tilingScheme.getNumberOfYTilesAtLevel(level);

    //         for (var i = 0; i < levelRanges.length; ++i) {
    //             var levelRange = levelRanges[i];

    //             tilingScheme.tileXYToRectangle(levelRange.startX, yTiles - levelRange.endY - 1, level, rectangleScratch);
    //             var west = rectangleScratch.west;
    //             var north = rectangleScratch.north;

    //             tilingScheme.tileXYToRectangle(levelRange.endX, yTiles - levelRange.startY - 1, level, rectangleScratch);
    //             var east = rectangleScratch.east;
    //             var south = rectangleScratch.south;

    //             var rectangleWithLevel = new RectangleWithLevel(level, west, south, east, north);

    //             if (rectangleContainsRectangle(westernHemisphere.extent, rectangleWithLevel)) {
    //                 putRectangleInQuadtree(terrainProvider._availableTiles.length, westernHemisphere, rectangleWithLevel);
    //             } else if (rectangleContainsRectangle(easternHemisphere.extent, rectangleWithLevel)) {
    //                 putRectangleInQuadtree(terrainProvider._availableTiles.length, easternHemisphere, rectangleWithLevel);
    //             } else {
    //                 // Rectangle spans both hemispheres, so add it to both.
    //                 westernHemisphere.rectangles.push(rectangleWithLevel);
    //                 easternHemisphere.rectangles.push(rectangleWithLevel);
    //                 // maxRectanglesInANode = Math.max(maxRectanglesInANode, westernHemisphere.rectangles.length);
    //                 // maxRectanglesInANode = Math.max(maxRectanglesInANode, easternHemisphere.rectangles.length);
    //             }                
    //         }
    //     }

    //     console.log('Max depth reached: ' + maxDepthReached);
    //     console.log('Max rectangles in a node: ' + maxRectanglesInANode);

        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        // for (var i = 0; i < positions.length; ++i) {
        //     var position = positions[i];

        //     var rectangle = westernHemisphere.extent;
        //     var maxLevel = 0;
        //     if (rectangleContainsPosition(rectangle, position)) {
        //         maxLevel = findMaxLevelAtPoint(westernHemisphere, position);
        //     }

        //     rectangle = easternHemisphere.extent;
        //     if (rectangleContainsPosition(rectangle, position)) {
        //         maxLevel = findMaxLevelAtPoint(easternHemisphere, position);
        //     }

        //     var realMaxLevel = terrainProvider.getMaximumTileLevel(new Rectangle(position.longitude, position.latitude, position.longitude, position.latitude));
        //     expect(maxLevel).toBe(realMaxLevel);

        //     console.log('rectangle comparisons: ' + checks);
        //     checks = 0;
        // }

        // console.log(findMaxLevelForRectangle([westernHemisphere, easternHemisphere], Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0)));

        return sampleTerrainMostDetailed(terrainProvider, positions).then(function(passedPositions) {
            expect(passedPositions).toBe(positions);
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeGreaterThan(5000);
            expect(positions[1].height).toBeLessThan(10000);
        });
    });

    it('should throw querying heights from Small Terrain', function() {
        var terrainProvider = new CesiumTerrainProvider({
            url : '//cesiumjs.org/smallTerrain'
        });

        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        return sampleTerrainMostDetailed(terrainProvider, positions).then(function() {
            fail('the promise should not resolve');
        }).otherwise(function() {
        });
    });

    it('uses a suitable common tile height for a range of locations', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        return sampleTerrainMostDetailed(terrainProvider, positions).then(function() {
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeGreaterThan(5000);
            expect(positions[1].height).toBeLessThan(10000);
        });
    });

    it('requires terrainProvider and positions', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        expect(function() {
            sampleTerrainMostDetailed(undefined, positions);
        }).toThrowDeveloperError();

        expect(function() {
            sampleTerrainMostDetailed(terrainProvider, undefined);
        }).toThrowDeveloperError();

    });

    it('works for a dodgy point right near the edge of a tile', function() {
        var stkWorldTerrain = new CesiumTerrainProvider({
            url : '//assets.agi.com/stk-terrain/world'
        });

        var positions = [new Cartographic(0.33179290856829535, 0.7363107781851078)];

        return sampleTerrainMostDetailed(stkWorldTerrain, positions).then(function() {
            expect(positions[0].height).toBeDefined();
        });
    });

});
