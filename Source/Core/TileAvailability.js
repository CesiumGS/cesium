/*global define*/
define([
    '../ThirdParty/when',
    './Cartographic',
    './defined',
    './sampleTerrain',
    './DeveloperError',
    './Rectangle'
], function(
    when,
    Cartographic,
    defined,
    sampleTerrain,
    DeveloperError,
    Rectangle) {
    "use strict";

    function TileAvailability(tilingScheme, maximumLevel) {
        this._tilingScheme = tilingScheme;
        this._maximumLevel = maximumLevel;
        
        this._rootNodes = [];
        for (var y = 0; y < tilingScheme.getNumberOfYTilesAtLevel(); ++y) {
            for (var x = 0; x < tilingScheme.getNumberOfXTilesAtLevel(); ++x) {
                this._rootNodes.push(new QuadtreeNode(tilingScheme, undefined, 0, x, y));
            }
        }
    }

    var rectangleScratch = new Rectangle();

    TileAvailability.prototype.addAvailableTileRange = function(level, startX, startY, endX, endY) {
        var tilingScheme = this._tilingScheme;

        tilingScheme.tileXYToRectangle(startX, startY, level, rectangleScratch);
        var west = rectangleScratch.west;
        var north = rectangleScratch.north;

        tilingScheme.tileXYToRectangle(endX, endY, level, rectangleScratch);
        var east = rectangleScratch.east;
        var south = rectangleScratch.south;

        var rectangleWithLevel = new RectangleWithLevel(level, west, south, east, north);

        for (var i = 0; i < this._rootNodes.length; ++i) {
            var rootNode = this._rootNodes[i];
            if (rectanglesOverlap(rootNode.extent, rectangleWithLevel)) {
                putRectangleInQuadtree(this._maximumLevel, rootNode, rectangleWithLevel);
            }
        }
    };

    TileAvailability.prototype.findMaximumLevelAtPosition = function(position) {
        // Find the root node that contains this position.
        var node;
        for (var nodeIndex = 0; nodeIndex < this._rootNodes.length; ++nodeIndex) {
            var rootNode = this._rootNodes[nodeIndex];
            if (rectangleContainsPosition(rootNode.extent, position)) {
                node = rootNode;
                break;
            }
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(node)) {
            throw new DeveloperError('The specified position does not exist in any root node of the tiling scheme.');
        }
        //>>includeEnd('debug');

        // Find the deepest quadtree node containing this point.
        while (true) {
            if (node._nw && rectangleContainsPosition(node._nw.extent, position)) {
                node = node._nw;
            } else if (node._ne && rectangleContainsPosition(node._ne.extent, position)) {
                node = node._ne;
            } else if (node._sw && rectangleContainsPosition(node._sw.extent, position)) {
                node = node._sw;
            } else if (node._se && rectangleContainsPosition(node._se.extent, position)) {
                node = node._se;
            } else {
                break;
            }
        }

        // Work up the tree until we find a rectangle that contains this point.
        var maxLevel = 0;

        while (node) {
            var rectangles = node.rectangles;

            // Rectangles are sorted by level, lowest first.
            for (var i = rectangles.length - 1; i >= 0 && rectangles[i].level > maxLevel; --i) {
                var rectangle = rectangles[i];
                if (rectangleContainsPosition(rectangle, position)) {
                    maxLevel = rectangle.level;
                }
            }

            node = node.parent;
        }

        return maxLevel;
    };

    var rectanglesScratch = [];

    TileAvailability.prototype.findMinimumAvailableLevelOverRectangles = function(rectangle) {
        var rectangles = rectanglesScratch;
        rectangles.length = 0;

        if (rectangle.east < rectangle.west) {
            // Rectangle crosses the IDL, make it two rectangles.
            rectangles.push(new Rectangle(-Math.PI, rectangle.south, rectangle.east, rectangle.north));
            rectangles.push(new Rectangle(rectangle.west, rectangle.south, Math.PI, rectangle.north));
        } else {
            rectangles.push(rectangle);
        }

        // TODO: split rectangle at IDL
        var remainingToCoverByLevel = [];

        var i;
        for (i = 0; i < this._rootNodes.length; ++i) {
            updateCoverageWithNode(remainingToCoverByLevel, this._rootNodes[i], rectangles);
        }

        for (i = remainingToCoverByLevel.length - 1; i >= 0; --i) {
            if (remainingToCoverByLevel[i] && remainingToCoverByLevel[i].length === 0) {
                return i;
            }
        }

        return 0;
    };

    var cartographicScratch = new Cartographic();

    TileAvailability.prototype.isTileAvailable = function(level, x, y) {
        // Get the center of the tile and find the maximum level at that position.
        // Because availability is by tile, if the level is available at that point, it
        // is sure to be available for the whole tile.  We assume that if a tile at level n exists,
        // then all its parent tiles back to level 0 exist too.  This isn't really enforced
        // anywhere, but Cesium would never load a tile for which this is not true.
        var rectangle = this._tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch);
        Rectangle.center(rectangle, cartographicScratch);
        return this.findMaximumLevelAtPosition(cartographicScratch) >= level;
    };

    TileAvailability.prototype.getChildMaskForTile = function(level, x, y) {
        var childLevel = level + 1;
        if (childLevel >= this._maximumLevel) {
            return 0;
        }

        var mask = 0;

        mask |= this.isTileAvailable(childLevel, 2 * x, 2 * y + 1) ? 1 : 0;
        mask |= this.isTileAvailable(childLevel, 2 * x + 1, 2 * y + 1) ? 2 : 0;
        mask |= this.isTileAvailable(childLevel, 2 * x, 2 * y) ? 4 : 0;
        mask |= this.isTileAvailable(childLevel, 2 * x + 1, 2 * y) ? 8 : 0;

        return mask;
    };

    function QuadtreeNode(tilingScheme, parent, level, x, y) {
        this.tilingScheme = tilingScheme;
        this.parent = parent;
        this.level = level;
        this.x = x;
        this.y = y;
        this.extent = tilingScheme.tileXYToRectangle(x, y, level);

        this.rectangles = [];
        this._sw = undefined;
        this._se = undefined;
        this._nw = undefined;
        this._ne = undefined;
    }

    Object.defineProperties(QuadtreeNode.prototype, {
        nw: {
            get: function() {
                if (!this._nw) {
                    this._nw = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2, this.y * 2);
                }
                return this._nw;
            }
        },

        ne: {
            get: function() {
                if (!this._ne) {
                    this._ne = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2 + 1, this.y * 2);
                }
                return this._ne;
            }
        },

        sw: {
            get: function() {
                if (!this._sw) {
                    this._sw = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2, this.y * 2 + 1);
                }
                return this._sw;
            }
        },

        se: {
            get: function() {
                if (!this._se) {
                    this._se = new QuadtreeNode(this.tilingScheme, this, this.level + 1, this.x * 2 + 1, this.y * 2 + 1);
                }
                return this._se;
            }
        }
    });

    function RectangleWithLevel(level, west, south, east, north) {
        this.level = level;
        this.west = west;
        this.south = south;
        this.east = east;
        this.north = north;
    }

    function rectanglesOverlap(rectangle1, rectangle2) {
        var west = Math.max(rectangle1.west, rectangle2.west);
        var south = Math.max(rectangle1.south, rectangle2.south);
        var east = Math.min(rectangle1.east, rectangle2.east);
        var north = Math.min(rectangle1.north, rectangle2.north);
        return south < north && west < east;
    }

    function putRectangleInQuadtree(maxDepth, node, rectangle) {
        while (node.level < maxDepth) {
            if (rectangleFullyContainsRectangle(node.nw.extent, rectangle)) {
                node = node.nw;
            } else if (rectangleFullyContainsRectangle(node.ne.extent, rectangle)) {
                node = node.ne;
            } else if (rectangleFullyContainsRectangle(node.sw.extent, rectangle)) {
                node = node.sw;
            } else if (rectangleFullyContainsRectangle(node.se.extent, rectangle)) {
                node = node.se;
            } else {
                break;
            }
        }

        node.rectangles.push(rectangle);
    }

    function rectangleFullyContainsRectangle(potentialContainer, rectangleToTest) {
        return rectangleToTest.west >= potentialContainer.west &&
               rectangleToTest.east <= potentialContainer.east &&
               rectangleToTest.south >= potentialContainer.south &&
               rectangleToTest.north <= potentialContainer.north;
    }

    function rectangleContainsPosition(potentialContainer, positionToTest) {
        return positionToTest.longitude >= potentialContainer.west &&
               positionToTest.longitude <= potentialContainer.east &&
               positionToTest.latitude >= potentialContainer.south &&
               positionToTest.latitude <= potentialContainer.north;
    }

    function updateCoverageWithNode(remainingToCoverByLevel, node, rectanglesToCover) {
        if (!node) {
            return;
        }

        var i;
        var anyOverlap = false;
        for (i = 0; i < rectanglesToCover.length; ++i) {
            anyOverlap = anyOverlap || rectanglesOverlap(node.extent, rectanglesToCover[i]);
        }

        if (!anyOverlap) {
            // This node is not applicable to the rectangle(s).
            return;
        }

        var rectangles = node.rectangles;
        for (i = 0; i < rectangles.length; ++i) {
            var rectangle = rectangles[i];

            if (!remainingToCoverByLevel[rectangle.level]) {
                remainingToCoverByLevel[rectangle.level] = rectanglesToCover;
            }

            remainingToCoverByLevel[rectangle.level] = subtractRectangle(remainingToCoverByLevel[rectangle.level], rectangle);
        }

        // Update with child nodes.
        updateCoverageWithNode(remainingToCoverByLevel, node._nw, rectanglesToCover);
        updateCoverageWithNode(remainingToCoverByLevel, node._ne, rectanglesToCover);
        updateCoverageWithNode(remainingToCoverByLevel, node._sw, rectanglesToCover);
        updateCoverageWithNode(remainingToCoverByLevel, node._se, rectanglesToCover);
    }

    var intersectionScratch = new Rectangle();

    function subtractRectangle(rectangleList, rectangleToSubtract) {
        var result = [];
        for (var i = 0; i < rectangleList.length; ++i) {
            var rectangle = rectangleList[i];
            var intersection = Rectangle.simpleIntersection(rectangle, rectangleToSubtract, intersectionScratch);
            
            if (!intersection) {
                // Disjoint rectangles.  Original rectangle is unmodified.
                result.push(rectangle);
            } else {
                // rectangleToSubtract partially or completely overlaps rectangle.
                if (rectangle.west < rectangleToSubtract.west) {
                    result.push(new Rectangle(rectangle.west, rectangle.south, rectangleToSubtract.west, rectangle.north));
                }
                if (rectangle.east > rectangleToSubtract.east) {
                    result.push(new Rectangle(rectangleToSubtract.east, rectangle.south, rectangle.east, rectangle.north));
                }
                if (rectangle.south < rectangleToSubtract.south) {
                    result.push(new Rectangle(Math.max(rectangleToSubtract.west, rectangle.west), rectangle.south, Math.min(rectangleToSubtract.east, rectangle.east), rectangleToSubtract.south));
                }
                if (rectangle.north > rectangleToSubtract.north) {
                    result.push(new Rectangle(Math.max(rectangleToSubtract.west, rectangle.west), rectangleToSubtract.north, Math.min(rectangleToSubtract.east, rectangle.east), rectangle.north));
                }
            }
        }

        return result;
    }

    return TileAvailability;
});
