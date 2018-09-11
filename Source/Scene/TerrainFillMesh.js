define([
        '../Core/AttributeCompression',
        '../Core/binarySearch',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/Math',
        '../Core/DeveloperError',
        '../Core/IndexDatatype',
        '../Core/OrientedBoundingBox',
        '../Core/Queue',
        '../Core/TileEdge',
        '../Core/TerrainEncoding',
        '../Core/TerrainMesh',
        '../Core/TerrainTileEdgeDetails',
        '../Core/WebMercatorProjection',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/VertexArray',
        './ImageryState',
        './TileSelectionResult'
    ], function(
        AttributeCompression,
        binarySearch,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        defined,
        CesiumMath,
        DeveloperError,
        IndexDatatype,
        OrientedBoundingBox,
        Queue,
        TileEdge,
        TerrainEncoding,
        TerrainMesh,
        TerrainTileEdgeDetails,
        WebMercatorProjection,
        Buffer,
        BufferUsage,
        VertexArray,
        ImageryState,
        TileSelectionResult) {
    'use strict';

    function TerrainFillMesh() {
        this.tile = undefined;
        this.frameLastUpdated = undefined;
        this.westMeshes = [];
        this.westTiles = [];
        this.southMeshes = [];
        this.southTiles = [];
        this.eastMeshes = [];
        this.eastTiles = [];
        this.northMeshes = [];
        this.northTiles = [];
        this.southwestMesh = undefined;
        this.southwestTile = undefined;
        this.southeastMesh = undefined;
        this.southeastTile = undefined;
        this.northwestMesh = undefined;
        this.northwestTile = undefined;
        this.northeastMesh = undefined;
        this.northeastTile = undefined;
        this.changedThisFrame = false;
        this.visitedFrame = undefined;
        this.mesh = undefined;
        this.vertexArray = undefined;
    }

    TerrainFillMesh.prototype.update = function(tileProvider, frameState) {
        if (this.changedThisFrame) {
            createFillMesh(tileProvider, frameState, this.tile);
            this.changedThisFrame = false;
        }
    };

    TerrainFillMesh.prototype.destroy = function() {
        this.vertexArray = this.vertexArray && this.vertexArray.destroy();
    };

    TerrainFillMesh.updateFillTiles = function(tileProvider, renderedTiles, frameState) {
        // We want our fill tiles to look natural, which means they should align perfectly with
        // adjacent loaded tiles, and their edges that are not adjacent to loaded tiles should have
        // sensible heights (e.g. the average of the heights of loaded edges). Some fill tiles may
        // be adjacent only to other fill tiles, and in that case heights should be assigned fanning
        // outward from the loaded tiles so that there are no sudden changes in height.

        // We do this with a breadth-first traversal of the rendered tiles, starting with the loaded
        // ones. Graph nodes are tiles and graph edges connect to other rendered tiles that are spatially adjacent
        // to those tiles. As we visit each node, we propagate tile edges to adjacent tiles. If there's no data
        // for a tile edge,  we create an edge with an average height and then propagate it. If an edge is partially defined
        // (e.g. an edge is adjacent to multiple more-detailed tiles and only some of them are loaded), we
        // fill in the rest of the edge with the same height.
        var quadtree = tileProvider._quadtree;
        var levelZeroTiles = quadtree._levelZeroTiles;
        var lastSelectionFrameNumber = quadtree._lastSelectionFrameNumber;

        var traversalQueue = new Queue();

        for (var i = 0; i < renderedTiles.length; ++i) {
            var renderedTile = renderedTiles[i];
            if (renderedTile.renderable) {
                traversalQueue.enqueue(renderedTiles[i]);
            }
        }

        var tile = traversalQueue.dequeue();

        while (tile !== undefined) {
            var tileToWest = tile.findTileToWest(levelZeroTiles);
            var tileToSouth = tile.findTileToSouth(levelZeroTiles)
            var tileToEast = tile.findTileToEast(levelZeroTiles);
            var tileToNorth = tile.findTileToNorth(levelZeroTiles);
            visitRenderedTiles(tileProvider, frameState, tile, tileToWest, lastSelectionFrameNumber, TileEdge.EAST, false, traversalQueue);
            visitRenderedTiles(tileProvider, frameState, tile, tileToSouth, lastSelectionFrameNumber, TileEdge.NORTH, false, traversalQueue);
            visitRenderedTiles(tileProvider, frameState, tile, tileToEast, lastSelectionFrameNumber, TileEdge.WEST, false, traversalQueue);
            visitRenderedTiles(tileProvider, frameState, tile, tileToNorth, lastSelectionFrameNumber, TileEdge.SOUTH, false, traversalQueue);

            var tileToNorthwest = tileToWest.findTileToNorth(levelZeroTiles);
            var tileToSouthwest = tileToWest.findTileToSouth(levelZeroTiles);
            var tileToNortheast = tileToEast.findTileToNorth(levelZeroTiles);
            var tileToSoutheast = tileToEast.findTileToSouth(levelZeroTiles);
            visitRenderedTiles(tileProvider, frameState, tile, tileToNorthwest, lastSelectionFrameNumber, TileEdge.SOUTHEAST, false, traversalQueue);
            visitRenderedTiles(tileProvider, frameState, tile, tileToNortheast, lastSelectionFrameNumber, TileEdge.SOUTHWEST, false, traversalQueue);
            visitRenderedTiles(tileProvider, frameState, tile, tileToSouthwest, lastSelectionFrameNumber, TileEdge.NORTHEAST, false, traversalQueue);
            visitRenderedTiles(tileProvider, frameState, tile, tileToSoutheast, lastSelectionFrameNumber, TileEdge.NORTHWEST, false, traversalQueue);

            tile = traversalQueue.dequeue();
        }
    };

    function visitRenderedTiles(tileProvider, frameState, sourceTile, startTile, currentFrameNumber, tileEdge, downOnly, traversalQueue) {
        if (startTile === undefined) {
            // There are no tiles North or South of the poles.
            return;
        }

        var tile = startTile;
        while (tile && (tile._lastSelectionResultFrame !== currentFrameNumber || tile._lastSelectionResult === TileSelectionResult.KICKED || tile._lastSelectionResult === TileSelectionResult.CULLED)) {
            // This wasn't visited or it was visited and then kicked, so walk up to find the closest ancestor that was rendered.
            // We also walk up if the tile was culled, because if siblings were kicked an ancestor may have been rendered.
            if (downOnly) {
                return;
            }

            var parent = tile.parent;
            if (tileEdge >= TileEdge.NORTHWEST && parent !== undefined) {
                // When we're looking for a corner, verify that the parent tile is still relevant.
                // That is, the parent and child must share the corner in question.
                switch (tileEdge) {
                    case TileEdge.NORTHWEST:
                        tile = tile === parent.northwestChild ? parent : undefined;
                        break;
                    case TileEdge.NORTHEAST:
                        tile = tile === parent.northeastChild ? parent : undefined;
                        break;
                    case TileEdge.SOUTHWEST:
                        tile = tile === parent.southwestChild ? parent : undefined;
                        break;
                    case TileEdge.SOUTHEAST:
                        tile = tile === parent.southeastChild ? parent : undefined;
                        break;
                }
            } else {
                tile = parent;
            }
        }

        if (tile === undefined) {
            return;
        }

        if (tile._lastSelectionResult === TileSelectionResult.RENDERED) {
            visitTile(tileProvider, frameState, sourceTile, tile, tileEdge, currentFrameNumber, traversalQueue);
            return;
        }

        if (startTile._lastSelectionResult === TileSelectionResult.CULLED) {
            return;
        }

        // This tile was refined, so find rendered children, if any.
        // Return the tiles in clockwise order.
        switch (tileEdge) {
            case TileEdge.WEST:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.southwestChild, currentFrameNumber, tileEdge, true, traversalQueue);
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.northwestChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            case TileEdge.EAST:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.northeastChild, currentFrameNumber, tileEdge, true, traversalQueue);
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.southeastChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            case TileEdge.SOUTH:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.southeastChild, currentFrameNumber, tileEdge, true, traversalQueue);
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.southwestChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            case TileEdge.NORTH:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.northwestChild, currentFrameNumber, tileEdge, true, traversalQueue);
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.northeastChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            case TileEdge.NORTHWEST:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.northwestChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            case TileEdge.NORTHEAST:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.northeastChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            case TileEdge.SOUTHWEST:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.southwestChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            case TileEdge.SOUTHEAST:
                visitRenderedTiles(tileProvider, frameState, sourceTile, startTile.southeastChild, currentFrameNumber, tileEdge, true, traversalQueue);
                break;
            default:
                throw new DeveloperError('Invalid edge');
        }
    }

    function visitTile(tileProvider, frameState, sourceTile, destinationTile, tileEdge, frameNumber, traversalQueue) {
        if (destinationTile.renderable) {
            // No further processing necessary for renderable tiles.
            return;
        }

        var destinationSurfaceTile = destinationTile.data;

        if (destinationSurfaceTile.fill === undefined) {
            destinationSurfaceTile.fill = new TerrainFillMesh();
            destinationSurfaceTile.fill.tile = destinationTile;
        }

        if (destinationSurfaceTile.fill.visitedFrame !== frameNumber) {
            // First time visiting this tile this frame, add it to the traversal queue.
            destinationSurfaceTile.fill.visitedFrame = frameNumber;
            destinationSurfaceTile.fill.changedThisFrame = false;
            traversalQueue.enqueue(destinationTile);
        }

        propagateEdge(tileProvider, frameState, sourceTile, destinationTile, tileEdge);
    }

    function propagateEdge(tileProvider, frameState, sourceTile, destinationTile, tileEdge) {
        var destinationFill = destinationTile.data.fill;
        var sourceMesh = sourceTile.data.mesh;

        if (sourceMesh === undefined) {
            var sourceFill = sourceTile.data.fill;
            if (sourceFill.changedThisFrame) {
                createFillMesh(tileProvider, frameState, sourceTile);
                sourceTile.data.fill.changedThisFrame = false;
            }
            sourceMesh = sourceTile.data.fill.mesh;
        }

        var edgeMeshes;
        var edgeTiles;

        switch (tileEdge) {
            case TileEdge.WEST:
                edgeMeshes = destinationFill.westMeshes;
                edgeTiles = destinationFill.westTiles;
                break;
            case TileEdge.SOUTH:
                edgeMeshes = destinationFill.southMeshes;
                edgeTiles = destinationFill.southTiles;
                break;
            case TileEdge.EAST:
                edgeMeshes = destinationFill.eastMeshes;
                edgeTiles = destinationFill.eastTiles;
                break;
            case TileEdge.NORTH:
                edgeMeshes = destinationFill.northMeshes;
                edgeTiles = destinationFill.northTiles;
                break;
            // Corners are simpler.
            case TileEdge.NORTHWEST:
                // if (destinationFill.northwestTile !== sourceTile) {
                //     const from = destinationFill.northwestTile || {};
                //     console.log(`L${destinationTile.level}X${destinationTile.x}Y${destinationTile.y} changed because northwest tile changed from L${from.level}X${from.x}Y${from.y} to L${sourceTile.level}X${sourceTile.x}Y${sourceTile.y}`);
                // }
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.northwestMesh !== sourceMesh;
                destinationFill.northwestMesh = sourceMesh;
                destinationFill.northwestTile = sourceTile;
                return;
            case TileEdge.NORTHEAST:
                // if (destinationFill.northeastTile !== sourceTile) {
                //     const from = destinationFill.northeastTile || {};
                //     console.log(`L${destinationTile.level}X${destinationTile.x}Y${destinationTile.y} changed because northeast tile changed from L${from.level}X${from.x}Y${from.y} to L${sourceTile.level}X${sourceTile.x}Y${sourceTile.y}`);
                // }
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.northeastMesh !== sourceMesh;
                destinationFill.northeastMesh = sourceMesh;
                destinationFill.northeastTile = sourceTile;
                return;
            case TileEdge.SOUTHWEST:
                // if (destinationFill.southwestTile !== sourceTile) {
                //     const from = destinationFill.southwestTile || {};
                //     console.log(`L${destinationTile.level}X${destinationTile.x}Y${destinationTile.y} changed because southwest tile changed from L${from.level}X${from.x}Y${from.y} to L${sourceTile.level}X${sourceTile.x}Y${sourceTile.y}`);
                // }
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.southwestMesh !== sourceMesh;
                destinationFill.southwestMesh = sourceMesh;
                destinationFill.southwestTile = sourceTile;
                return;
            case TileEdge.SOUTHEAST:
                // if (destinationFill.southeastTile !== sourceTile) {
                //     const from = destinationFill.southeastTile || {};
                //     console.log(`L${destinationTile.level}X${destinationTile.x}Y${destinationTile.y} changed because southeast tile changed from L${from.level}X${from.x}Y${from.y} to L${sourceTile.level}X${sourceTile.x}Y${sourceTile.y}`);
                // }
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.southeastMesh !== sourceMesh;
                destinationFill.southeastMesh = sourceMesh;
                destinationFill.southeastTile = sourceTile;
                return;
        }

        if (sourceTile.level <= destinationTile.level) {
            // Source edge completely spans the destination edge.
            // if (edgeTiles[0] !== sourceTile) {
            //     const from = edgeTiles[0] || {};
            //     console.log(`L${destinationTile.level}X${destinationTile.x}Y${destinationTile.y} changed because edge tile changed from L${from.level}X${from.x}Y${from.y} to L${sourceTile.level}X${sourceTile.x}Y${sourceTile.y}`);
            // }
            destinationFill.changedThisFrame = destinationFill.changedThisFrame || edgeMeshes[0] !== sourceMesh || edgeMeshes.length !== 1;
            edgeMeshes[0] = sourceMesh;
            edgeTiles[0] = sourceTile;
            edgeMeshes.length = 1;
            edgeTiles.length = 1;
            return;
        }

        // Source edge is a subset of the destination edge.
        // Figure out the range of meshes we're replacing.
        var startIndex, endIndex, existingTile, existingRectangle;
        var sourceRectangle = sourceTile.rectangle;

        switch (tileEdge) {
            case TileEdge.WEST:
                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.north <= sourceRectangle.north) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.south < sourceRectangle.south) {
                        break;
                    }
                }
                break;
            case TileEdge.SOUTH:
                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.west >= sourceRectangle.west) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.east > sourceRectangle.east) {
                        break;
                    }
                }
                break;
            case TileEdge.EAST:
                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.south >= sourceRectangle.south) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.north > sourceRectangle.north) {
                        break;
                    }
                }
                break;
            case TileEdge.NORTH:
                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.east <= sourceRectangle.east) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (existingRectangle.west < sourceRectangle.west) {
                        break;
                    }
                }
                break;
        }

        if (endIndex - startIndex === 1) {
            // if (edgeTiles[startIndex] !== sourceTile) {
            //     const from = edgeTiles[startIndex] || {};
            //     console.log(`L${destinationTile.level}X${destinationTile.x}Y${destinationTile.y} changed because edge tile changed from L${from.level}X${from.x}Y${from.y} to L${sourceTile.level}X${sourceTile.x}Y${sourceTile.y}`);
            // }
            destinationFill.changedThisFrame = destinationFill.changedThisFrame || edgeMeshes[startIndex] !== sourceMesh;
            edgeMeshes[startIndex] = sourceMesh;
            edgeTiles[startIndex] = sourceTile;
        } else {
            // console.log(`L${destinationTile.level}X${destinationTile.x}Y${destinationTile.y} changed because number of tiles on edge changed`);
            destinationFill.changedThisFrame = true;
            edgeMeshes.splice(startIndex, endIndex - startIndex, sourceMesh);
            edgeTiles.splice(startIndex, endIndex - startIndex, sourceTile);
        }
    }

    var westScratch = new TerrainTileEdgeDetails();
    var southScratch = new TerrainTileEdgeDetails();
    var eastScratch = new TerrainTileEdgeDetails();
    var northScratch = new TerrainTileEdgeDetails();
    var tileVerticesScratch = [];
    var cartographicScratch = new Cartographic();
    var cartesianScratch = new Cartesian3();
    var normalScratch = new Cartesian3();
    var octEncodedNormalScratch = new Cartesian2();

    function createFillMesh(tileProvider, frameState, tile) {
        var surfaceTile = tile.data;
        var fill = surfaceTile.fill;

        var quadtree = tileProvider._quadtree;
        var lastSelectionFrameNumber = quadtree._lastSelectionFrameNumber;

        var tileVertices = tileVerticesScratch;
        tileVertices.length = 0;

        var ellipsoid = tile.tilingScheme.ellipsoid;
        var hasVertexNormals = tileProvider.terrainProvider.hasVertexNormals;
        var hasWebMercatorT = true; // TODO
        var stride = 6 + (hasWebMercatorT ? 1 : 0) + (hasVertexNormals ? 2 : 0);

        var northwestIndex = 0;
        addCorner(fill, ellipsoid, 0.0, 1.0, fill.northwestTile, fill.northwestMesh, fill.westTiles, fill.westMeshes, fill.northTiles, fill.northMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);
        var southwestIndex = 1;
        addCorner(fill, ellipsoid, 0.0, 0.0, fill.southwestTile, fill.southwestMesh, fill.southTiles, fill.southMeshes, fill.westTiles, fill.westMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);
        var southeastIndex = 2;
        addCorner(fill, ellipsoid, 1.0, 0.0, fill.southeastTile, fill.southeastMesh, fill.eastTiles, fill.eastMeshes, fill.southTiles, fill.southMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);
        var northeastIndex = 3;
        addCorner(fill, ellipsoid, 1.0, 1.0, fill.northeastTile, fill.northeastMesh, fill.northTiles, fill.northMeshes, fill.eastTiles, fill.eastMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);

        // TODO: slight optimization: track min/max as we're adding vertices.
        var southwestHeight = tileVertices[southwestIndex * stride + 3];
        var southeastHeight = tileVertices[southeastIndex * stride + 3];
        var northwestHeight = tileVertices[northwestIndex * stride + 3];
        var northeastHeight = tileVertices[northeastIndex * stride + 3];

        var minimumHeight = Math.min(southwestHeight, southeastHeight, northwestHeight, northeastHeight);
        var maximumHeight = Math.max(southwestHeight, southeastHeight, northwestHeight, northeastHeight);

        // var west = getEdgeVertices(tile, fill.westTiles, fill.westMeshes, lastSelectionFrameNumber, TileEdge.EAST, westScratch);
        // var south = getEdgeVertices(tile, fill.southTiles, fill.southMeshes, lastSelectionFrameNumber, TileEdge.NORTH, southScratch);
        // var east = getEdgeVertices(tile, fill.eastTiles, fill.eastMeshes, lastSelectionFrameNumber, TileEdge.WEST, eastScratch);
        // var north = getEdgeVertices(tile, fill.northTiles, fill.northMeshes, lastSelectionFrameNumber, TileEdge.SOUTH, northScratch);

        // var hasVertexNormals = tileProvider.terrainProvider.hasVertexNormals;
        // var hasWebMercatorT = true; // TODO
        // var stride = 6 + (hasWebMercatorT ? 1 : 0) + (hasVertexNormals ? 2 : 0);

        // var minimumHeight = Number.MAX_VALUE;
        // var maximumHeight = -Number.MAX_VALUE;
        // var hasAnyVertices = false;

        // if (west.vertices.length > 0) {
        //     minimumHeight = Math.min(minimumHeight, west.minimumHeight);
        //     maximumHeight = Math.max(maximumHeight, west.maximumHeight);
        //     hasAnyVertices = true;
        // }

        // if (south.vertices.length > 0) {
        //     minimumHeight = Math.min(minimumHeight, south.minimumHeight);
        //     maximumHeight = Math.max(maximumHeight, south.maximumHeight);
        //     hasAnyVertices = true;
        // }

        // if (east.vertices.length > 0) {
        //     minimumHeight = Math.min(minimumHeight, east.minimumHeight);
        //     maximumHeight = Math.max(maximumHeight, east.maximumHeight);
        //     hasAnyVertices = true;
        // }

        // if (north.vertices.length > 0) {
        //     minimumHeight = Math.min(minimumHeight, north.minimumHeight);
        //     maximumHeight = Math.max(maximumHeight, north.maximumHeight);
        //     hasAnyVertices = true;
        // }

        // if (!hasAnyVertices) {
        //     var tileBoundingRegion = surfaceTile.tileBoundingRegion;
        //     minimumHeight = tileBoundingRegion.minimumHeight;
        //     maximumHeight = tileBoundingRegion.maximumHeight;
        // }

        var middleHeight = (minimumHeight + maximumHeight) * 0.5;

        // var tileVertices = tileVerticesScratch;
        // tileVertices.length = 0;

        // var ellipsoid = tile.tilingScheme.ellipsoid;
        // var rectangle = tile.rectangle;

        // var northwestIndex = 0;
        // addCornerVertexIfNecessary(ellipsoid, 0.0, 1.0, rectangle.west, rectangle.north, middleHeight, west, north, hasVertexNormals, hasWebMercatorT, tileVertices);
        // addVerticesToFillTile(west, stride, tileVertices);
        // var southwestIndex = tileVertices.length / stride;
        // addCornerVertexIfNecessary(ellipsoid, 0.0, 0.0, rectangle.west, rectangle.south, middleHeight, south, west, hasVertexNormals, hasWebMercatorT, tileVertices);
        // addVerticesToFillTile(south, stride, tileVertices);
        // var southeastIndex = tileVertices.length / stride;
        // addCornerVertexIfNecessary(ellipsoid, 1.0, 0.0, rectangle.east, rectangle.south, middleHeight, east, south, hasVertexNormals, hasWebMercatorT, tileVertices);
        // addVerticesToFillTile(east, stride, tileVertices);
        // var northeastIndex = tileVertices.length / stride;
        // addCornerVertexIfNecessary(ellipsoid, 1.0, 1.0, rectangle.east, rectangle.north, middleHeight, north, east, hasVertexNormals, hasWebMercatorT, tileVertices);
        // addVerticesToFillTile(north, stride, tileVertices);

        // Add a single vertex at the center of the tile.
        var obb = OrientedBoundingBox.fromRectangle(tile.rectangle, minimumHeight, maximumHeight, tile.tilingScheme.ellipsoid);
        var center = obb.center;

        ellipsoid.cartesianToCartographic(center, cartographicScratch);
        cartographicScratch.height = middleHeight;
        var centerVertexPosition = ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch);

        var rectangle = tile.rectangle;
        tileVertices.push(centerVertexPosition.x, centerVertexPosition.y, centerVertexPosition.z, middleHeight);
        tileVertices.push((cartographicScratch.longitude - rectangle.west) / (rectangle.east - rectangle.west));
        tileVertices.push((cartographicScratch.latitude - rectangle.south) / (rectangle.north - rectangle.south));

        if (hasWebMercatorT) {
            var southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(rectangle.south);
            var oneOverMercatorHeight = 1.0 / (WebMercatorProjection.geodeticLatitudeToMercatorAngle(rectangle.north) - southMercatorY);
            tileVertices.push((WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographicScratch.latitude) - southMercatorY) * oneOverMercatorHeight);
        }

        if (hasVertexNormals) {
            ellipsoid.geodeticSurfaceNormalCartographic(cartographicScratch, normalScratch);
            AttributeCompression.octEncode(normalScratch, octEncodedNormalScratch);
            tileVertices.push(octEncodedNormalScratch.x, octEncodedNormalScratch.y);
        }

        var vertexCount = tileVertices.length / stride;
        var indices = new Uint16Array((vertexCount - 1) * 3); // one triangle per edge vertex
        var centerIndex = vertexCount - 1;

        var indexOut = 0;
        var i;
        for (i = 0; i < vertexCount - 2; ++i) {
            indices[indexOut++] = centerIndex;
            indices[indexOut++] = i;
            indices[indexOut++] = i + 1;
        }

        indices[indexOut++] = centerIndex;
        indices[indexOut++] = i;
        indices[indexOut++] = 0;

        var westIndicesSouthToNorth = [];
        for (i = southwestIndex; i >= northwestIndex; --i) {
            westIndicesSouthToNorth.push(i);
        }

        var southIndicesEastToWest = [];
        for (i = southeastIndex; i >= southwestIndex; --i) {
            southIndicesEastToWest.push(i);
        }

        var eastIndicesNorthToSouth = [];
        for (i = northeastIndex; i >= southeastIndex; --i) {
            eastIndicesNorthToSouth.push(i);
        }

        var northIndicesWestToEast = [];
        northIndicesWestToEast.push(0);
        for (i = centerIndex - 1; i >= northeastIndex; --i) {
            northIndicesWestToEast.push(i);
        }

        var packedStride = hasVertexNormals ? stride - 1 : stride; // normal is packed into 1 float
        var typedArray = new Float32Array(vertexCount * packedStride);

        for (i = 0; i < vertexCount; ++i) {
            var read = i * stride;
            var write = i * packedStride;
            typedArray[write++] = tileVertices[read++] - center.x;
            typedArray[write++] = tileVertices[read++] - center.y;
            typedArray[write++] = tileVertices[read++] - center.z;
            typedArray[write++] = tileVertices[read++];
            typedArray[write++] = tileVertices[read++];
            typedArray[write++] = tileVertices[read++];

            if (hasWebMercatorT) {
                typedArray[write++] = tileVertices[read++];
            }

            if (hasVertexNormals) {
                typedArray[write++] = AttributeCompression.octPackFloat(Cartesian2.fromElements(tileVertices[read++], tileVertices[read++], octEncodedNormalScratch));
            }
        }

        var encoding = new TerrainEncoding(undefined, minimumHeight, maximumHeight, undefined, hasVertexNormals, hasWebMercatorT);
        encoding.center = center;

        var mesh = new TerrainMesh(
            obb.center,
            typedArray,
            indices,
            minimumHeight,
            maximumHeight,
            BoundingSphere.fromOrientedBoundingBox(obb),
            computeOccludeePoint(tileProvider, center, rectangle, maximumHeight),
            encoding.getStride(),
            obb,
            encoding,
            frameState.terrainExaggeration,
            westIndicesSouthToNorth,
            southIndicesEastToWest,
            eastIndicesNorthToSouth,
            northIndicesWestToEast
        );

        fill.mesh = mesh;

        var context = frameState.context;

        if (fill.vertexArray !== undefined) {
            fill.vertexArray.destroy();
            fill.vertexArray = undefined;
        }

        var buffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : typedArray,
            usage : BufferUsage.STATIC_DRAW
        });
        var attributes = mesh.encoding.getAttributes(buffer);

        var indexDatatype = (indices.BYTES_PER_ELEMENT === 2) ?  IndexDatatype.UNSIGNED_SHORT : IndexDatatype.UNSIGNED_INT;
        var indexBuffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : mesh.indices,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : indexDatatype
        });

        fill.vertexArray = new VertexArray({
            context : context,
            attributes : attributes,
            indexBuffer : indexBuffer
        });

        var tileImageryCollection = surfaceTile.imagery;

        var len;
        if (tileImageryCollection.length === 0) {
            var imageryLayerCollection = tileProvider._imageryLayers;
            var terrainProvider = tileProvider.terrainProvider;
            for (i = 0, len = imageryLayerCollection.length; i < len; ++i) {
                var layer = imageryLayerCollection.get(i);
                if (layer.show) {
                    layer._createTileImagerySkeletons(tile, terrainProvider);
                }
            }
        }

        for (i = 0, len = tileImageryCollection.length; i < len; ++i) {
            var tileImagery = tileImageryCollection[i];
            if (!defined(tileImagery.loadingImagery)) {
                continue;
            }

            if (tileImagery.loadingImagery.state === ImageryState.PLACEHOLDER) {
                var imageryLayer = tileImagery.loadingImagery.imageryLayer;
                if (imageryLayer.imageryProvider.ready) {
                    // Remove the placeholder and add the actual skeletons (if any)
                    // at the same position.  Then continue the loop at the same index.
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    imageryLayer._createTileImagerySkeletons(tile, tileProvider.terrainProvider, i);
                    --i;
                    len = tileImageryCollection.length;
                    continue;
                }
            }

            tileImagery.processStateMachine(tile, frameState, true);
        }
    }

    function getEdgeVertices(tile, edgeTiles, edgeMeshes, currentFrameNumber, tileEdge, result) {
        var ellipsoid = tile.tilingScheme.ellipsoid;

        result.clear();

        // TODO: add first corner vertex if it exists.
        // TODO: if a corner is missing, fill it in. When we add a corner, we create an edge
        //       (or two) that didn't exist before. We need to propagate that edge to adjacent tile(s)
        //       but be careful not to trigger regeneration of those adjacent tiles. We can do
        //       that by updating the adjacent tile's list of edge meshes without setting the
        //       changed flag.
        // When creating a new fill mesh, immediately adjust all adjacent fill tiles to know they're in sync
        // with that new mesh (because the new mesh was purposely created to be in sync!).

        for (var i = 0; i < edgeMeshes.length; ++i) {
            var edgeTile = edgeTiles[i];
            var surfaceTile = edgeTile.data;
            if (surfaceTile === undefined) {
                continue;
            }

            var edgeMesh = edgeMeshes[i];
            if (edgeMesh !== undefined) {
                var beforeLength = result.vertices.length;
                edgeMesh.getEdgeVertices(tileEdge, edgeTile.rectangle, tile.rectangle, ellipsoid, result);
                var afterLength = result.vertices.length;
                var numberOfVertices = afterLength - beforeLength;
                if (surfaceTile.mesh === undefined && numberOfVertices > 27) {
                    //console.log(`${numberOfVertices} from L${edgeTile.level}X${edgeTile.x}Y${edgeTile.y}`);
                }
            }
        }

        // TODO: add last corner vertex if it exists

        return result;
    }

    function transformTextureCoordinate(toMin, toMax, fromValue) {
        return (fromValue - toMin) / (toMax - toMin);
    }

    function transformTextureCoordinates(sourceRectangle, targetRectangle, coordinates, result) {
        var sourceWidth = sourceRectangle.east - sourceRectangle.west;
        var umin = (targetRectangle.west - sourceRectangle.west) / sourceWidth;
        var umax = (targetRectangle.east - sourceRectangle.west) / sourceWidth;

        var sourceHeight = sourceRectangle.north - sourceRectangle.south;
        var vmin = (targetRectangle.south - sourceRectangle.south) / sourceHeight;
        var vmax = (targetRectangle.north - sourceRectangle.south) / sourceHeight;

        var u = (coordinates.x - umin) / (umax - umin);
        var v = (coordinates.y - vmin) / (vmax - vmin);

        // Ensure that coordinates very near the corners are at the corners.
        if (Math.abs(u) < Math.EPSILON8) {
            u = 0.0;
        } else if (Math.abs(u - 1.0) < Math.EPSILON8) {
            u = 1.0;
        }

        if (Math.abs(v) < Math.EPSILON8) {
            v = 0.0;
        } else if (Math.abs(v - 1.0) < Math.EPSILON8) {
            v = 1.0;
        }

        if (!defined(result)) {
            return new Cartesian2(u, v);
        }

        result.x = u;
        result.y = v;
        return result;
    }

    var positionScratch = new Cartesian3();
    var encodedNormalScratch = new Cartesian2();
    var uvScratch = new Cartesian2();

    function addVertexFromTileAtCorner(sourceMesh, sourceIndex, u, v, tileVertices) {
        var sourceEncoding = sourceMesh.encoding;
        var sourceVertices = sourceMesh.vertices;

        sourceEncoding.decodePosition(sourceVertices, sourceIndex, positionScratch);
        tileVertices.push(positionScratch.x, positionScratch.y, positionScratch.z);

        tileVertices.push(sourceEncoding.decodeHeight(sourceVertices, sourceIndex), u, v);

        if (sourceEncoding.hasWebMercatorT) {
            // At the corners, the geographic and web mercator vertical texture coordinate
            // is the same: either 0.0 or 1.0;
            tileVertices.push(v);
        }

        if (sourceEncoding.hasVertexNormals) {
            sourceEncoding.getOctEncodedNormal(sourceVertices, sourceIndex, encodedNormalScratch);
            tileVertices.push(encodedNormalScratch.x, encodedNormalScratch.y);
        }
    }

    var uvScratch2 = new Cartesian2();
    var encodedNormalScratch2 = new Cartesian2();
    var cartesianScratch2 = new Cartesian3();

    function addInterpolatedVertexAtCorner(ellipsoid, sourceRectangle, targetRectangle, sourceMesh, previousIndex, nextIndex, u, v, interpolateU, tileVertices) {
        var sourceEncoding = sourceMesh.encoding;
        var sourceVertices = sourceMesh.vertices;

        var previousUv = transformTextureCoordinates(sourceRectangle, targetRectangle, sourceEncoding.decodeTextureCoordinates(sourceVertices, previousIndex, uvScratch), uvScratch);
        var nextUv = transformTextureCoordinates(sourceRectangle, targetRectangle, sourceEncoding.decodeTextureCoordinates(sourceVertices, previousIndex, uvScratch2), uvScratch2);

        var ratio;
        if (interpolateU) {
            ratio = (u - previousUv.x) / (nextUv.x - previousUv.x);
        } else {
            ratio = (v - previousUv.y) / (nextUv.y - previousUv.y);
        }

        var height1 = sourceEncoding.decodeHeight(sourceVertices, previousIndex);
        var height2 = sourceEncoding.decodeHeight(sourceVertices, nextIndex);

        cartographicScratch.longitude = CesiumMath.lerp(targetRectangle.west, targetRectangle.east, u);
        cartographicScratch.latitude = CesiumMath.lerp(targetRectangle.south, targetRectangle.north, v);
        cartographicScratch.height = CesiumMath.lerp(height1, height2, ratio);
        var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch);

        tileVertices.push(position.x, position.y, position.z);
        tileVertices.push(cartographicScratch.height, u, v);

        if (sourceEncoding.hasWebMercatorT) {
            // At the corners, the geographic and web mercator vertical texture coordinate
            // is the same: either 0.0 or 1.0;
            tileVertices.push(v);
        }

        if (sourceEncoding.hasVertexNormals) {
            var encodedNormal1 = sourceEncoding.getOctEncodedNormal(sourceVertices, previousIndex, encodedNormalScratch);
            var encodedNormal2 = sourceEncoding.getOctEncodedNormal(sourceVertices, nextIndex, encodedNormalScratch2);
            var normal1 = AttributeCompression.octDecode(encodedNormal1.x, encodedNormal1.y, cartesianScratch);
            var normal2 = AttributeCompression.octDecode(encodedNormal2.x, encodedNormal2.y, cartesianScratch2);
            var normal = Cartesian3.lerp(normal1, normal2, ratio, cartesianScratch);
            Cartesian3.normalize(normal, normal);
            var encodedNormal = AttributeCompression.octEncode(normal, encodedNormalScratch);
            tileVertices.push(encodedNormal.x, encodedNormal.y);
        }
    }

    function addVertexWithHeightAtCorner(terrainFillMesh, ellipsoid, u, v, height, hasVertexNormals, hasWebMercatorT, tileVertices) {
        var rectangle = terrainFillMesh.tile.rectangle;

        cartographicScratch.longitude = CesiumMath.lerp(rectangle.west, rectangle.east, u);
        cartographicScratch.latitude = CesiumMath.lerp(rectangle.south, rectangle.north, v);
        cartographicScratch.height = height;
        var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch);

        tileVertices.push(position.x, position.y, position.z);
        tileVertices.push(height, u, v);

        if (hasWebMercatorT) {
            // At the corners, the geographic and web mercator vertical texture coordinate
            // is the same: either 0.0 or 1.0;
            tileVertices.push(v);
        }

        if (hasVertexNormals) {
            var normal = ellipsoid.geodeticSurfaceNormalCartographic(cartographicScratch, cartesianScratch);
            var encodedNormal = AttributeCompression.octEncode(normal, encodedNormalScratch);
            tileVertices.push(encodedNormal.x, encodedNormal.y);
        }
    }

    function addCorner(
        terrainFillMesh,
        ellipsoid,
        u, v,
        cornerTile, cornerMesh,
        previousEdgeTiles, previousEdgeMeshes,
        nextEdgeTiles, nextEdgeMeshes,
        hasVertexNormals, hasWebMercatorT,
        tileVertices
    ) {
        var vertexIndex;

        if (cornerMesh !== undefined && !cornerMesh.changedThisFrame) {
            // Corner mesh is valid, copy its corner vertex to this mesh.
            var cornerTerrainMesh = cornerMesh.mesh === undefined ? cornerMesh : cornerMesh.mesh;
            if (u === 0.0) {
                if (v === 0.0) {
                    // southwest destination, northeast source
                    vertexIndex = cornerTerrainMesh.eastIndicesNorthToSouth[0];
                } else {
                    // northwest destination, southeast source
                    vertexIndex = cornerTerrainMesh.southIndicesEastToWest[0];
                }
            } else if (v === 0.0) {
                // southeast destination, northwest source
                vertexIndex = cornerTerrainMesh.northIndicesWestToEast[0];
            } else {
                // northeast destination, southwest source
                vertexIndex = cornerTerrainMesh.westIndicesSouthToNorth[0];
            }
            addVertexFromTileAtCorner(cornerTerrainMesh, vertexIndex, u, v, tileVertices);
            return;
        }

        var gotCorner =
            addCornerFromEdge(terrainFillMesh, ellipsoid, previousEdgeMeshes, previousEdgeTiles, false, u, v, tileVertices) ||
            addCornerFromEdge(terrainFillMesh, ellipsoid, nextEdgeMeshes, nextEdgeTiles, true, u, v, tileVertices);
        if (gotCorner) {
            return;
        }

        // There is no precise vertex available from the corner or from either adjacent edge.
        // So use the height from the closest vertex anywhere on the perimeter of this tile.
        // TODO: would be better to find the closest height rather than favoring a side.
        // TODO: We'll do the wrong thing if the height is exactly 0.0 because that's falsy.
        var height;
        if (u === 0.0) {
            if (v === 0.0) {
                // southwest
                height =
                    getNearestHeightOnEdge(terrainFillMesh.southMeshes, terrainFillMesh.southTiles, false, TileEdge.NORTH, u, v) ||
                    getNearestHeightOnEdge(terrainFillMesh.westMeshes, terrainFillMesh.westTiles, true, TileEdge.EAST, u, v) ||
                    getHeightAtCorner(terrainFillMesh.southeastMesh, terrainFillMesh.southeastTile, TileEdge.NORTHWEST, u, v) ||
                    getHeightAtCorner(terrainFillMesh.northwestMesh, terrainFillMesh.northwestTile, TileEdge.SOUTHEAST, u, v) ||
                    getNearestHeightOnEdge(terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, false, TileEdge.WEST, u, v) ||
                    getNearestHeightOnEdge(terrainFillMesh.northMeshes, terrainFillMesh.northTiles, true, TileEdge.SOUTH, u, v) ||
                    getHeightAtCorner(terrainFillMesh.northeastMesh, terrainFillMesh.northeastTile, TileEdge.SOUTHWEST, u, v);
            } else {
                // northwest
                height =
                    getNearestHeightOnEdge(terrainFillMesh.northMeshes, terrainFillMesh.northTiles, false, TileEdge.SOUTH, u, v) ||
                    getNearestHeightOnEdge(terrainFillMesh.westMeshes, terrainFillMesh.westTiles, true, TileEdge.EAST, u, v) ||
                    getHeightAtCorner(terrainFillMesh.southwestMesh, terrainFillMesh.southwestTile, TileEdge.NORTHEAST, u, v) ||
                    getHeightAtCorner(terrainFillMesh.northeastMesh, terrainFillMesh.northeastTile, TileEdge.SOUTHWEST, u, v) ||
                    getNearestHeightOnEdge(terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, false, TileEdge.WEST, u, v) ||
                    getNearestHeightOnEdge(terrainFillMesh.southMeshes, terrainFillMesh.southTiles, true, TileEdge.NORTH, u, v) ||
                    getHeightAtCorner(terrainFillMesh.southeastMesh, terrainFillMesh.southeastTile, TileEdge.NORTHWEST, u, v);
            }
        } else if (v === 0.0) {
            // southeast
            height =
                getNearestHeightOnEdge(terrainFillMesh.southMeshes, terrainFillMesh.southTiles, false, TileEdge.NORTH, u, v) ||
                getNearestHeightOnEdge(terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, true, TileEdge.WEST, u, v) ||
                getHeightAtCorner(terrainFillMesh.southwestMesh, terrainFillMesh.southwestTile, TileEdge.NORTHEAST, u, v) ||
                getHeightAtCorner(terrainFillMesh.northeastMesh, terrainFillMesh.northeastTile, TileEdge.SOUTHWEST, u, v) ||
                getNearestHeightOnEdge(terrainFillMesh.westMeshes, terrainFillMesh.westTiles, false, TileEdge.EAST, u, v) ||
                getNearestHeightOnEdge(terrainFillMesh.northMeshes, terrainFillMesh.northTiles, true, TileEdge.SOUTH, u, v) ||
                getHeightAtCorner(terrainFillMesh.northwestMesh, terrainFillMesh.northwestTile, TileEdge.SOUTHEAST, u, v);
        } else {
            // northeast
            height =
                getNearestHeightOnEdge(terrainFillMesh.northMeshes, terrainFillMesh.northTiles, false, TileEdge.SOUTH, u, v) ||
                getNearestHeightOnEdge(terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, true, TileEdge.WEST, u, v) ||
                getHeightAtCorner(terrainFillMesh.southeastMesh, terrainFillMesh.southeastTile, TileEdge.NORTHWEST, u, v) ||
                getHeightAtCorner(terrainFillMesh.northwestMesh, terrainFillMesh.northwestTile, TileEdge.SOUTHEAST, u, v) ||
                getNearestHeightOnEdge(terrainFillMesh.westMeshes, terrainFillMesh.westTiles, false, TileEdge.EAST, u, v) ||
                getNearestHeightOnEdge(terrainFillMesh.southMeshes, terrainFillMesh.southTiles, true, TileEdge.NORTH, u, v) ||
                getHeightAtCorner(terrainFillMesh.southwestMesh, terrainFillMesh.southwestTile, TileEdge.NORTHEAST, u, v);
        }

        if (!defined(height)) {
            // No heights available whatsoever, so use the average of this tile's minimum and maximum height.
            var surfaceTile = terrainFillMesh.tile.data;
            var tileBoundingRegion = surfaceTile.tileBoundingRegion;
            var minimumHeight = tileBoundingRegion.minimumHeight;
            var maximumHeight = tileBoundingRegion.maximumHeight;
            height = (minimumHeight + maximumHeight) * 0.5;
        }

        addVertexWithHeightAtCorner(terrainFillMesh, ellipsoid, u, v, height, hasVertexNormals, hasWebMercatorT, tileVertices);
    }

    function getNearestHeightOnEdge(meshes, tiles, isNext, edge, u, v) {
        var meshStart;
        var meshEnd;
        var meshStep;

        if (isNext) {
            meshStart = 0;
            meshEnd = meshes.length;
            meshStep = 1;
        } else {
            meshStart = meshes.length - 1;
            meshEnd = -1;
            meshStep = -1;
        }

        for (var meshIndex = meshStart; meshIndex !== meshEnd; meshIndex += meshStep) {
            var mesh = meshes[meshIndex];
            if (!defined(mesh) || mesh.changedThisFrame) {
                continue;
            }

            var terrainMesh = mesh.mesh ? mesh.mesh : mesh;

            var indices;
            switch (edge) {
                case TileEdge.WEST:
                    indices = terrainMesh.westIndicesSouthToNorth;
                    break;
                case TileEdge.SOUTH:
                    indices = terrainMesh.southIndicesEastToWest;
                    break;
                case TileEdge.EAST:
                    indices = terrainMesh.eastIndicesNorthToSouth;
                    break;
                case TileEdge.NORTH:
                    indices = terrainMesh.northIndicesWestToEast;
                    break;
            }

            var index = indices[isNext ? 0 : indices.length - 1];
            if (defined(index)) {
                return mesh.encoding.decodeHeight(terrainMesh.vertices, index);
            }
        }

        return undefined;
    }

    function getHeightAtCorner(mesh, tile, edge, u, v) {
        if (!defined(mesh) || mesh.changedThisFrame) {
            return undefined;
        }

        var terrainMesh = mesh.mesh ? mesh.mesh : mesh;

        var indices;
        switch (edge) {
            case TileEdge.SOUTHWEST:
                indices = terrainMesh.westIndicesSouthToNorth;
                break;
            case TileEdge.SOUTHEAST:
                indices = terrainMesh.southIndicesEastToWest;
                break;
            case TileEdge.NORTHEAST:
                indices = terrainMesh.eastIndicesNorthToSouth;
                break;
            case TileEdge.NORTHWEST:
                indices = terrainMesh.northIndicesWestToEast;
                break;
        }

        var index = indices[0];
        if (defined(index)) {
            return mesh.encoding.decodeHeight(terrainMesh.vertices, index);
        }

        return undefined;
    }

    function addCornerFromEdge(terrainFillMesh, ellipsoid, edgeMeshes, edgeTiles, isNext, u, v, tileVertices) {
        var edgeVertices;
        var compareU;
        var increasing;
        var vertexIndexIndex;
        var vertexIndex;
        var sourceMesh = edgeMeshes[isNext ? 0 : edgeMeshes.length - 1];

        if (sourceMesh !== undefined && !sourceMesh.changedThisFrame) {
            // Previous mesh is valid, but we don't know yet if it covers this corner.
            var sourceTerrainMesh = sourceMesh.mesh === undefined ? sourceMesh : sourceMesh.mesh;

            if (u === 0.0) {
                if (v === 0.0) {
                    // southwest
                    edgeVertices = isNext ? sourceTerrainMesh.eastIndicesNorthToSouth : sourceTerrainMesh.northIndicesWestToEast;
                    compareU = !isNext;
                    increasing = !isNext;
                } else {
                    // northwest
                    edgeVertices = isNext ? sourceTerrainMesh.southIndicesEastToWest : sourceTerrainMesh.eastIndicesNorthToSouth;
                    compareU = isNext;
                    increasing = false;
                }
            } else if (v === 0.0) {
                // southeast
                edgeVertices = isNext ? sourceTerrainMesh.northIndicesWestToEast : sourceTerrainMesh.westIndicesSouthToNorth;
                compareU = isNext;
                increasing = true;
            } else {
                // northeast
                edgeVertices = isNext ? sourceTerrainMesh.westIndicesSouthToNorth : sourceTerrainMesh.southIndicesEastToWest;
                compareU = !isNext;
                increasing = isNext;
            }

            if (edgeVertices.length > 0) {
                // The vertex we want will very often be the first/last vertex so check that first.
                var sourceTile = edgeTiles[isNext ? 0 : edgeTiles.length - 1];
                vertexIndexIndex = isNext ? edgeVertices.length - 1 : 0;
                vertexIndex = edgeVertices[vertexIndexIndex];
                sourceTerrainMesh.encoding.decodeTextureCoordinates(sourceTerrainMesh.vertices, vertexIndex, uvScratch);
                var targetUv = transformTextureCoordinates(sourceTile.rectangle, terrainFillMesh.tile.rectangle, uvScratch, uvScratch);
                if (targetUv.x === u && targetUv.y === v) {
                    // Vertex is good!
                    addVertexFromTileAtCorner(sourceTerrainMesh, vertexIndex, u, v, tileVertices);
                    return true;
                }

                // The last vertex is not the one we need, try binary searching for the right one.
                vertexIndexIndex = binarySearch(edgeVertices, compareU ? u : v, function(vertexIndex, textureCoordinate) {
                    sourceTerrainMesh.encoding.decodeTextureCoordinates(sourceTerrainMesh.vertices, vertexIndex, uvScratch);
                    var targetUv = transformTextureCoordinates(sourceTile.rectangle, terrainFillMesh.tile.rectangle, uvScratch, uvScratch);
                    if (increasing) {
                        if (compareU) {
                            return u - targetUv.x;
                        }
                        return v - targetUv.y;
                    } else if (compareU) {
                        return targetUv.x - u;
                    }
                    return targetUv.y - v;
                });

                if (vertexIndexIndex < 0) {
                    vertexIndexIndex = ~vertexIndexIndex;

                    if (vertexIndexIndex > 0 && vertexIndexIndex < edgeVertices.length) {
                        // The corner falls between two vertices, so interpolate between them.
                        addInterpolatedVertexAtCorner(ellipsoid, sourceTile.rectangle, terrainFillMesh.tile.rectangle, sourceTerrainMesh, edgeVertices[vertexIndexIndex - 1], edgeVertices[vertexIndexIndex], u, v, compareU, tileVertices);
                        return true;
                    }
                } else {
                    // Found a vertex that fits in the corner exactly.
                    addVertexFromTileAtCorner(sourceTerrainMesh, edgeVertices[vertexIndexIndex], u, v, tileVertices);
                    return true;
                }
            }
        }

        return false;
    }

    function addCornerVertexIfNecessary(ellipsoid, u, v, longitude, latitude, height, edgeDetails, previousEdgeDetails, hasVertexNormals, hasWebMercatorT, tileVertices) {
        var vertices = edgeDetails.vertices;

        if (u === vertices[4] && v === vertices[5]) {
            // First vertex is a corner vertex, as expected.
            return;
        }

        // Can we use the last vertex of the previous edge as the corner vertex?
        var stride = 6 + (hasWebMercatorT ? 1 : 0) + (hasVertexNormals ? 2 : 0);
        var previousVertices = previousEdgeDetails.vertices;
        var lastVertexStart = previousVertices.length - stride;
        var lastU = previousVertices[lastVertexStart + 4];
        var lastV = previousVertices[lastVertexStart + 5];

        if (lastU === u && lastV === v) {
            for (var i = 0; i < stride; ++i) {
                tileVertices.push(previousVertices[lastVertexStart + i]);
            }
            return;
        }

        // Previous edge doesn't contain a suitable vertex either, so fabricate one.
        cartographicScratch.longitude = longitude;
        cartographicScratch.latitude = latitude;
        cartographicScratch.height = height;
        ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch);
        tileVertices.push(cartesianScratch.x, cartesianScratch.y, cartesianScratch.z, height, u, v);

        if (hasWebMercatorT) {
            // Identical to v at 0.0 and 1.0.
            tileVertices.push(v);
        }

        if (hasVertexNormals) {
            ellipsoid.geodeticSurfaceNormalCartographic(cartographicScratch, normalScratch);
            AttributeCompression.octEncode(normalScratch, octEncodedNormalScratch);
            tileVertices.push(octEncodedNormalScratch.x, octEncodedNormalScratch.y);
            //tileVertices.push(AttributeCompression.octPackFloat(octEncodedNormalScratch));
        }
    }

    function addVerticesToFillTile(edgeDetails, stride, tileVertices) {
        var vertices = edgeDetails.vertices;

        // Copy all but the last vertex.
        var i;
        var u;
        var v;
        var lastU;
        var lastV;
        for (i = 0; i < vertices.length - stride; i += stride) {
            u = vertices[i + 4];
            v = vertices[i + 5];
            if (Math.abs(u - lastU) < CesiumMath.EPSILON4 && Math.abs(v - lastV) < CesiumMath.EPSILON4) {
                // Vertex is very close to the previous one, so skip it.
                continue;
            }

            var end = i + stride;
            for (var j = i; j < end; ++j) {
                tileVertices.push(vertices[j]);
            }

            lastU = u;
            lastV = v;
        }

        // Copy the last vertex too if it's _not_ a corner vertex.
        var lastVertexStart = i;
        u = vertices[lastVertexStart + 4];
        v = vertices[lastVertexStart + 5];

        if (lastVertexStart < vertices.length && ((u !== 0.0 && u !== 1.0) || (v !== 0.0 && v !== 1.0))) {
            if (Math.abs(u - lastU) < CesiumMath.EPSILON4 && Math.abs(v - lastV) < CesiumMath.EPSILON4) {
                // Overwrite the previous vertex because it's very close to the last one.
                tileVertices.length -= stride;
            }

            for (; i < vertices.length; ++i) {
                tileVertices.push(vertices[i]);
            }
        }
    }

    var cornerPositionsScratch = [new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3()];

    function computeOccludeePoint(tileProvider, center, rectangle, height, result) {
        var ellipsoidalOccluder = tileProvider.quadtree._occluders.ellipsoid;
        var ellipsoid = ellipsoidalOccluder.ellipsoid;

        var cornerPositions = cornerPositionsScratch;
        Cartesian3.fromRadians(rectangle.west, rectangle.south, height, ellipsoid, cornerPositions[0]);
        Cartesian3.fromRadians(rectangle.east, rectangle.south, height, ellipsoid, cornerPositions[1]);
        Cartesian3.fromRadians(rectangle.west, rectangle.north, height, ellipsoid, cornerPositions[2]);
        Cartesian3.fromRadians(rectangle.east, rectangle.north, height, ellipsoid, cornerPositions[3]);

        return ellipsoidalOccluder.computeHorizonCullingPoint(center, cornerPositions, result);
    }

    return TerrainFillMesh;
});
