define([
        '../Core/AttributeCompression',
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
        while (tile && (tile._lastSelectionResultFrame !== currentFrameNumber || tile._lastSelectionResult === TileSelectionResult.KICKED)) {
            // This wasn't visited or it was visited and then kicked, so walk up to find the closest ancestor that was rendered.
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
                sourceMesh = sourceTile.data.fill.mesh;
            }
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

        var west = getEdgeVertices(tile, fill.westTiles, fill.westMeshes, lastSelectionFrameNumber, TileEdge.EAST, westScratch);
        var south = getEdgeVertices(tile, fill.southTiles, fill.southMeshes, lastSelectionFrameNumber, TileEdge.NORTH, southScratch);
        var east = getEdgeVertices(tile, fill.eastTiles, fill.eastMeshes, lastSelectionFrameNumber, TileEdge.WEST, eastScratch);
        var north = getEdgeVertices(tile, fill.northTiles, fill.northMeshes, lastSelectionFrameNumber, TileEdge.SOUTH, northScratch);

        var hasVertexNormals = tileProvider.terrainProvider.hasVertexNormals;
        var hasWebMercatorT = true; // TODO
        var stride = 6 + (hasWebMercatorT ? 1 : 0) + (hasVertexNormals ? 2 : 0);

        var minimumHeight = Number.MAX_VALUE;
        var maximumHeight = -Number.MAX_VALUE;
        var hasAnyVertices = false;

        if (west.vertices.length > 0) {
            minimumHeight = Math.min(minimumHeight, west.minimumHeight);
            maximumHeight = Math.max(maximumHeight, west.maximumHeight);
            hasAnyVertices = true;
        }

        if (south.vertices.length > 0) {
            minimumHeight = Math.min(minimumHeight, south.minimumHeight);
            maximumHeight = Math.max(maximumHeight, south.maximumHeight);
            hasAnyVertices = true;
        }

        if (east.vertices.length > 0) {
            minimumHeight = Math.min(minimumHeight, east.minimumHeight);
            maximumHeight = Math.max(maximumHeight, east.maximumHeight);
            hasAnyVertices = true;
        }

        if (north.vertices.length > 0) {
            minimumHeight = Math.min(minimumHeight, north.minimumHeight);
            maximumHeight = Math.max(maximumHeight, north.maximumHeight);
            hasAnyVertices = true;
        }

        if (!hasAnyVertices) {
            var tileBoundingRegion = surfaceTile.tileBoundingRegion;
            minimumHeight = tileBoundingRegion.minimumHeight;
            maximumHeight = tileBoundingRegion.maximumHeight;
        }

        var middleHeight = (minimumHeight + maximumHeight) * 0.5;

        var tileVertices = tileVerticesScratch;
        tileVertices.length = 0;

        var ellipsoid = tile.tilingScheme.ellipsoid;
        var rectangle = tile.rectangle;

        var northwestIndex = 0;
        addCornerVertexIfNecessary(ellipsoid, 0.0, 1.0, rectangle.west, rectangle.north, middleHeight, west, north, hasVertexNormals, hasWebMercatorT, tileVertices);
        addVerticesToFillTile(west, stride, tileVertices);
        var southwestIndex = tileVertices.length / stride;
        addCornerVertexIfNecessary(ellipsoid, 0.0, 0.0, rectangle.west, rectangle.south, middleHeight, south, west, hasVertexNormals, hasWebMercatorT, tileVertices);
        addVerticesToFillTile(south, stride, tileVertices);
        var southeastIndex = tileVertices.length / stride;
        addCornerVertexIfNecessary(ellipsoid, 1.0, 0.0, rectangle.east, rectangle.south, middleHeight, east, south, hasVertexNormals, hasWebMercatorT, tileVertices);
        addVerticesToFillTile(east, stride, tileVertices);
        var northeastIndex = tileVertices.length / stride;
        addCornerVertexIfNecessary(ellipsoid, 1.0, 1.0, rectangle.east, rectangle.north, middleHeight, north, east, hasVertexNormals, hasWebMercatorT, tileVertices);
        addVerticesToFillTile(north, stride, tileVertices);

        // Add a single vertex at the center of the tile.
        var obb = OrientedBoundingBox.fromRectangle(tile.rectangle, minimumHeight, maximumHeight, tile.tilingScheme.ellipsoid);
        var center = obb.center;

        ellipsoid.cartesianToCartographic(center, cartographicScratch);
        cartographicScratch.height = middleHeight;
        var centerVertexPosition = ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch);

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

        return result;
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
