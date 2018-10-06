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
        '../Core/Rectangle',
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
        Rectangle,
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
        this.westMeshes = []; // north to south (CCW)
        this.westTiles = [];
        this.southMeshes = []; // west to east (CCW)
        this.southTiles = [];
        this.eastMeshes = []; // south to north (CCW)
        this.eastTiles = [];
        this.northMeshes = []; // east to west (CCW)
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
        return undefined;
    };

    var traversalQueueScratch = new Queue();

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

        var traversalQueue = traversalQueueScratch;
        traversalQueue.clear();

        // Add the tiles with real geometry to the traversal queue.
        for (var i = 0; i < renderedTiles.length; ++i) {
            var renderedTile = renderedTiles[i];
            if (defined(renderedTile.data.vertexArray)) {
                traversalQueue.enqueue(renderedTiles[i]);
            }
        }

        var tile = traversalQueue.dequeue();

        while (tile !== undefined) {
            var tileToWest = tile.findTileToWest(levelZeroTiles);
            var tileToSouth = tile.findTileToSouth(levelZeroTiles);
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
            // This tile wasn't visited or it was visited and then kicked, so walk up to find the closest ancestor that was rendered.
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
        if (defined(destinationTile.data.vertexArray)) {
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
            // Source is a fill, create/update it if necessary.
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
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.northwestMesh !== sourceMesh;
                destinationFill.northwestMesh = sourceMesh;
                destinationFill.northwestTile = sourceTile;
                return;
            case TileEdge.NORTHEAST:
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.northeastMesh !== sourceMesh;
                destinationFill.northeastMesh = sourceMesh;
                destinationFill.northeastTile = sourceTile;
                return;
            case TileEdge.SOUTHWEST:
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.southwestMesh !== sourceMesh;
                destinationFill.southwestMesh = sourceMesh;
                destinationFill.southwestTile = sourceTile;
                return;
            case TileEdge.SOUTHEAST:
                destinationFill.changedThisFrame = destinationFill.changedThisFrame || destinationFill.southeastMesh !== sourceMesh;
                destinationFill.southeastMesh = sourceMesh;
                destinationFill.southeastTile = sourceTile;
                return;
        }

        if (sourceTile.level <= destinationTile.level) {
            // Source edge completely spans the destination edge.
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

        var epsilon;
        var destinationRectangle = destinationTile.rectangle;

        switch (tileEdge) {
            case TileEdge.WEST:
                epsilon = (destinationRectangle.north - destinationRectangle.south) * CesiumMath.EPSILON5;

                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsGreaterThanRight(sourceRectangle.north, existingRectangle.south, epsilon)) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsGreaterThanOrEqualToRight(sourceRectangle.south, existingRectangle.north, epsilon)) {
                        break;
                    }
                }
                break;
            case TileEdge.SOUTH:
                epsilon = (destinationRectangle.east - destinationRectangle.west) * CesiumMath.EPSILON5;

                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsLessThanRight(sourceRectangle.west, existingRectangle.east, epsilon)) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsLessThanOrEqualToRight(sourceRectangle.east, existingRectangle.west, epsilon)) {
                        break;
                    }
                }
                break;
            case TileEdge.EAST:
                epsilon = (destinationRectangle.north - destinationRectangle.south) * CesiumMath.EPSILON5;

                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsLessThanRight(sourceRectangle.south, existingRectangle.north, epsilon)) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsLessThanOrEqualToRight(sourceRectangle.north, existingRectangle.south, epsilon)) {
                        break;
                    }
                }
                break;
            case TileEdge.NORTH:
                epsilon = (destinationRectangle.east - destinationRectangle.west) * CesiumMath.EPSILON5;

                for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
                    existingTile = edgeTiles[startIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsGreaterThanRight(sourceRectangle.east, existingRectangle.west, epsilon)) {
                        break;
                    }
                }
                for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
                    existingTile = edgeTiles[endIndex];
                    existingRectangle = existingTile.rectangle;
                    if (CesiumMath.leftIsGreaterThanOrEqualToRight(sourceRectangle.west, existingRectangle.east, epsilon)) {
                        break;
                    }
                }
                break;
        }

        if (endIndex - startIndex === 1) {
            destinationFill.changedThisFrame = destinationFill.changedThisFrame || edgeMeshes[startIndex] !== sourceMesh;
            edgeMeshes[startIndex] = sourceMesh;
            edgeTiles[startIndex] = sourceTile;
        } else {
            destinationFill.changedThisFrame = true;
            edgeMeshes.splice(startIndex, endIndex - startIndex, sourceMesh);
            edgeTiles.splice(startIndex, endIndex - startIndex, sourceTile);
        }
    }

    var tileVerticesScratch = [];
    var cartographicScratch = new Cartographic();
    var cartesianScratch = new Cartesian3();
    var normalScratch = new Cartesian3();
    var octEncodedNormalScratch = new Cartesian2();

    function createFillMesh(tileProvider, frameState, tile) {
        var surfaceTile = tile.data;
        var fill = surfaceTile.fill;

        var tileVertices = tileVerticesScratch;
        tileVertices.length = 0;

        var ellipsoid = tile.tilingScheme.ellipsoid;
        var hasVertexNormals = tileProvider.terrainProvider.hasVertexNormals;
        var hasWebMercatorT = true; // TODO
        var stride = 6 + (hasWebMercatorT ? 1 : 0) + (hasVertexNormals ? 2 : 0);

        var northwestIndex = 0;
        addCorner(fill, ellipsoid, 0.0, 1.0, fill.northwestTile, fill.northwestMesh, fill.northTiles, fill.northMeshes, fill.westTiles, fill.westMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);
        addEdge(fill, ellipsoid, fill.westTiles, fill.westMeshes, TileEdge.EAST, stride, tileVertices);
        var southwestIndex = tileVertices.length / stride;
        addCorner(fill, ellipsoid, 0.0, 0.0, fill.southwestTile, fill.southwestMesh, fill.westTiles, fill.westMeshes, fill.southTiles, fill.southMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);
        addEdge(fill, ellipsoid, fill.southTiles, fill.southMeshes, TileEdge.NORTH, stride, tileVertices);
        var southeastIndex = tileVertices.length / stride;
        addCorner(fill, ellipsoid, 1.0, 0.0, fill.southeastTile, fill.southeastMesh, fill.southTiles, fill.southMeshes, fill.eastTiles, fill.eastMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);
        addEdge(fill, ellipsoid, fill.eastTiles, fill.eastMeshes, TileEdge.WEST, stride, tileVertices);
        var northeastIndex = tileVertices.length / stride;
        addCorner(fill, ellipsoid, 1.0, 1.0, fill.northeastTile, fill.northeastMesh, fill.eastTiles, fill.eastMeshes, fill.northTiles, fill.northMeshes, hasVertexNormals, hasWebMercatorT, tileVertices);
        addEdge(fill, ellipsoid, fill.northTiles, fill.northMeshes, TileEdge.SOUTH, stride, tileVertices);

        // TODO: slight optimization: track min/max as we're adding vertices.
        var southwestHeight = tileVertices[southwestIndex * stride + 3];
        var southeastHeight = tileVertices[southeastIndex * stride + 3];
        var northwestHeight = tileVertices[northwestIndex * stride + 3];
        var northeastHeight = tileVertices[northeastIndex * stride + 3];

        var minimumHeight = Math.min(southwestHeight, southeastHeight, northwestHeight, northeastHeight);
        var maximumHeight = Math.max(southwestHeight, southeastHeight, northwestHeight, northeastHeight);

        var middleHeight = (minimumHeight + maximumHeight) * 0.5;

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

        var southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(rectangle.south);
        var oneOverMercatorHeight = 1.0 / (WebMercatorProjection.geodeticLatitudeToMercatorAngle(rectangle.north) - southMercatorY);
        tileVertices.push((WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographicScratch.latitude) - southMercatorY) * oneOverMercatorHeight);

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

            typedArray[write++] = tileVertices[read++];

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

    var sourceRectangleScratch = new Rectangle();

    function transformTextureCoordinates(sourceTile, targetTile, coordinates, result) {
        var sourceRectangle = sourceTile.rectangle;
        var targetRectangle = targetTile.rectangle;

        // Handle transforming across the anti-meridian.
        if (targetTile.x === 0 && coordinates.x === 1.0 && sourceTile.x === sourceTile.tilingScheme.getNumberOfXTilesAtLevel(sourceTile.level) - 1) {
            sourceRectangle = Rectangle.clone(sourceTile.rectangle, sourceRectangleScratch);
            sourceRectangle.west -= CesiumMath.TWO_PI;
            sourceRectangle.east -= CesiumMath.TWO_PI;
        } else if (sourceTile.x === 0 && coordinates.x === 0.0 && targetTile.x === targetTile.tilingScheme.getNumberOfXTilesAtLevel(targetTile.level) - 1) {
            sourceRectangle = Rectangle.clone(sourceTile.rectangle, sourceRectangleScratch);
            sourceRectangle.west += CesiumMath.TWO_PI;
            sourceRectangle.east += CesiumMath.TWO_PI;
        }

        var sourceWidth = sourceRectangle.east - sourceRectangle.west;
        var umin = (targetRectangle.west - sourceRectangle.west) / sourceWidth;
        var umax = (targetRectangle.east - sourceRectangle.west) / sourceWidth;

        var sourceHeight = sourceRectangle.north - sourceRectangle.south;
        var vmin = (targetRectangle.south - sourceRectangle.south) / sourceHeight;
        var vmax = (targetRectangle.north - sourceRectangle.south) / sourceHeight;

        var u = (coordinates.x - umin) / (umax - umin);
        var v = (coordinates.y - vmin) / (vmax - vmin);

        // Ensure that coordinates very near the corners are at the corners.
        if (Math.abs(u) < Math.EPSILON5) {
            u = 0.0;
        } else if (Math.abs(u - 1.0) < Math.EPSILON5) {
            u = 1.0;
        }

        if (Math.abs(v) < Math.EPSILON5) {
            v = 0.0;
        } else if (Math.abs(v - 1.0) < Math.EPSILON5) {
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

        // At the corners, the geographic and web mercator vertical texture coordinates
        // are the same: either 0.0 or 1.0;
        tileVertices.push(v);

        if (sourceEncoding.hasVertexNormals) {
            sourceEncoding.getOctEncodedNormal(sourceVertices, sourceIndex, encodedNormalScratch);
            tileVertices.push(encodedNormalScratch.x, encodedNormalScratch.y);
        }
    }

    var uvScratch2 = new Cartesian2();
    var encodedNormalScratch2 = new Cartesian2();
    var cartesianScratch2 = new Cartesian3();

    function addInterpolatedVertexAtCorner(ellipsoid, sourceTile, targetTile, sourceMesh, previousIndex, nextIndex, u, v, interpolateU, tileVertices) {
        var sourceEncoding = sourceMesh.encoding;
        var sourceVertices = sourceMesh.vertices;

        var previousUv = transformTextureCoordinates(sourceTile, targetTile, sourceEncoding.decodeTextureCoordinates(sourceVertices, previousIndex, uvScratch), uvScratch);
        var nextUv = transformTextureCoordinates(sourceTile, targetTile, sourceEncoding.decodeTextureCoordinates(sourceVertices, nextIndex, uvScratch2), uvScratch2);

        var ratio;
        if (interpolateU) {
            ratio = (u - previousUv.x) / (nextUv.x - previousUv.x);
        } else {
            ratio = (v - previousUv.y) / (nextUv.y - previousUv.y);
        }

        var height1 = sourceEncoding.decodeHeight(sourceVertices, previousIndex);
        var height2 = sourceEncoding.decodeHeight(sourceVertices, nextIndex);

        var targetRectangle = targetTile.rectangle;
        cartographicScratch.longitude = CesiumMath.lerp(targetRectangle.west, targetRectangle.east, u);
        cartographicScratch.latitude = CesiumMath.lerp(targetRectangle.south, targetRectangle.north, v);
        cartographicScratch.height = CesiumMath.lerp(height1, height2, ratio);
        var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesianScratch);

        tileVertices.push(position.x, position.y, position.z);
        tileVertices.push(cartographicScratch.height, u, v);

        // At the corners, the geographic and web mercator vertical texture coordinates
        // are the same: either 0.0 or 1.0;
        tileVertices.push(v);

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

        // At the corners, the geographic and web mercator vertical texture coordinate
        // is the same: either 0.0 or 1.0;
        tileVertices.push(v);

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
        var gotCorner =
            addCornerFromEdge(terrainFillMesh, ellipsoid, previousEdgeMeshes, previousEdgeTiles, false, u, v, tileVertices) ||
            addCornerFromEdge(terrainFillMesh, ellipsoid, nextEdgeMeshes, nextEdgeTiles, true, u, v, tileVertices);
        if (gotCorner) {
            return;
        }

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

        // There is no precise vertex available from the corner or from either adjacent edge.
        // So use the height from the closest vertex anywhere on the perimeter of this tile.
        var height;
        if (u === 0.0) {
            if (v === 0.0) {
                // southwest
                height = getClosestHeightToCorner(
                    terrainFillMesh.southMeshes, terrainFillMesh.southTiles, TileEdge.NORTH,
                    terrainFillMesh.westMeshes, terrainFillMesh.westTiles, TileEdge.EAST,
                    terrainFillMesh.southeastMesh, terrainFillMesh.southeastTile, TileEdge.NORTHWEST,
                    terrainFillMesh.northwestMesh, terrainFillMesh.northwestTile, TileEdge.SOUTHEAST,
                    terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, TileEdge.WEST,
                    terrainFillMesh.northMeshes, terrainFillMesh.northTiles, TileEdge.SOUTH,
                    terrainFillMesh.northeastMesh, terrainFillMesh.northeastTile, TileEdge.SOUTHWEST,
                    u, v);
            } else {
                // northwest
                height = getClosestHeightToCorner(
                    terrainFillMesh.northMeshes, terrainFillMesh.northTiles, TileEdge.SOUTH,
                    terrainFillMesh.westMeshes, terrainFillMesh.westTiles, TileEdge.EAST,
                    terrainFillMesh.southwestMesh, terrainFillMesh.southwestTile, TileEdge.NORTHEAST,
                    terrainFillMesh.northeastMesh, terrainFillMesh.northeastTile, TileEdge.SOUTHWEST,
                    terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, TileEdge.WEST,
                    terrainFillMesh.southMeshes, terrainFillMesh.southTiles, TileEdge.NORTH,
                    terrainFillMesh.southeastMesh, terrainFillMesh.southeastTile, TileEdge.NORTHWEST,
                    u, v);
            }
        } else if (v === 0.0) {
            // southeast
            height = getClosestHeightToCorner(
                terrainFillMesh.southMeshes, terrainFillMesh.southTiles, TileEdge.NORTH,
                terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, TileEdge.WEST,
                terrainFillMesh.southwestMesh, terrainFillMesh.southwestTile, TileEdge.NORTHEAST,
                terrainFillMesh.northeastMesh, terrainFillMesh.northeastTile, TileEdge.SOUTHWEST,
                terrainFillMesh.westMeshes, terrainFillMesh.westTiles, TileEdge.EAST,
                terrainFillMesh.northMeshes, terrainFillMesh.northTiles, TileEdge.SOUTH,
                terrainFillMesh.northwestMesh, terrainFillMesh.northwestTile, TileEdge.SOUTHEAST,
                u, v);
        } else {
            // northeast
            height = getClosestHeightToCorner(
                terrainFillMesh.northMeshes, terrainFillMesh.northTiles, TileEdge.SOUTH,
                terrainFillMesh.eastMeshes, terrainFillMesh.eastTiles, TileEdge.WEST,
                terrainFillMesh.southeastMesh, terrainFillMesh.southeastTile, TileEdge.NORTHWEST,
                terrainFillMesh.northwestMesh, terrainFillMesh.northwestTile, TileEdge.SOUTHEAST,
                terrainFillMesh.westMeshes, terrainFillMesh.westTiles, TileEdge.EAST,
                terrainFillMesh.southMeshes, terrainFillMesh.southTiles,TileEdge.NORTH,
                terrainFillMesh.southwestMesh, terrainFillMesh.southwestTile, TileEdge.NORTHEAST,
                u, v);
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

    function getClosestHeightToCorner(
        adjacentEdge1Meshes, adjacentEdge1Tiles, adjacentEdge1,
        adjacentEdge2Meshes, adjacentEdge2Tiles, adjacentEdge2,
        adjacentCorner1Mesh, adjacentCorner1Tile, adjacentCorner1,
        adjacentCorner2Mesh, adjacentCorner2Tile, adjacentCorner2,
        oppositeEdge1Meshes, oppositeEdge1Tiles, oppositeEdge1,
        oppositeEdge2Meshes, oppositeEdge2Tiles, oppositeEdge2,
        oppositeCornerMesh, oppositeCornerTile, oppositeCorner,
        u, v
    ) {
        // To find a height to use for this corner, we'll first look at the two adjacent edges,
        // then the two adjacent corners, then the two opposite edges, then the two opposite
        // corners. When e.g. both adjacent edges have a height, it would be better to choose
        // the closest height rather than always choosing adjacentEdge1's height, as we're
        // doing here, but it probably doesn't matter too much.
        var height = getNearestHeightOnEdge(adjacentEdge1Meshes, adjacentEdge1Tiles, false, adjacentEdge1, u, v);
        if (defined(height)) {
            return height;
        }

        height = getNearestHeightOnEdge(adjacentEdge2Meshes, adjacentEdge2Tiles, true, adjacentEdge2, u, v);
        if (defined(height)) {
            return height;
        }

        height = getHeightAtCorner(adjacentCorner1Mesh, adjacentCorner1Tile, adjacentCorner1, u, v);
        if (defined(height)) {
            return height;
        }

        height = getHeightAtCorner(adjacentCorner2Mesh, adjacentCorner2Tile, adjacentCorner2, u, v);
        if (defined(height)) {
            return height;
        }

        height = getNearestHeightOnEdge(oppositeEdge1Meshes, oppositeEdge1Tiles, false, oppositeEdge1, u, v);
        if (defined(height)) {
            return height;
        }

        height = getNearestHeightOnEdge(oppositeEdge2Meshes, oppositeEdge2Tiles, true, oppositeEdge2, u, v);
        if (defined(height)) {
            return height;
        }

        return getHeightAtCorner(oppositeCornerMesh, oppositeCornerTile, oppositeCorner, u, v);
    }

    function addEdge(terrainFillMesh, ellipsoid, edgeTiles, edgeMeshes, tileEdge, stride, tileVertices) {
        for (var i = 0; i < edgeTiles.length; ++i) {
            addEdgeMesh(terrainFillMesh, ellipsoid, edgeTiles[i], edgeMeshes[i], tileEdge, stride, tileVertices);
        }
    }

    var edgeDetailsScratch = new TerrainTileEdgeDetails();

    function addEdgeMesh(terrainFillMesh, ellipsoid, edgeTile, edgeMesh, tileEdge, stride, tileVertices) {
        var terrainMesh = edgeMesh;

        // Handle copying edges across the anti-meridian.
        var sourceRectangle = edgeTile.rectangle;
        if (tileEdge === TileEdge.EAST && terrainFillMesh.tile.x === 0) {
            sourceRectangle = Rectangle.clone(edgeTile.rectangle, sourceRectangleScratch);
            sourceRectangle.west -= CesiumMath.TWO_PI;
            sourceRectangle.east -= CesiumMath.TWO_PI;
        } else if (tileEdge === TileEdge.WEST && edgeTile.x === 0) {
            sourceRectangle = Rectangle.clone(edgeTile.rectangle, sourceRectangleScratch);
            sourceRectangle.west += CesiumMath.TWO_PI;
            sourceRectangle.east += CesiumMath.TWO_PI;
        }

        edgeDetailsScratch.clear();
        var edgeDetails = terrainMesh.getEdgeVertices(tileEdge, sourceRectangle, terrainFillMesh.tile.rectangle, ellipsoid, edgeDetailsScratch);

        var vertices = edgeDetails.vertices;

        var previousVertexIndex = tileVertices.length - stride;

        // Copy all except the corner vertices.
        var i;
        var u;
        var v;
        var lastU = tileVertices[previousVertexIndex + 4];
        var lastV = tileVertices[previousVertexIndex + 5];
        for (i = 0; i < vertices.length; i += stride) {
            u = vertices[i + 4];
            v = vertices[i + 5];
            if (Math.abs(u - lastU) < CesiumMath.EPSILON5 && Math.abs(v - lastV) < CesiumMath.EPSILON5) {
                // Vertex is very close to the previous one, so skip it.
                continue;
            }

            var nearlyEdgeU = Math.abs(u) < CesiumMath.EPSILON5 || Math.abs(u - 1.0) < CesiumMath.EPSILON5;
            var nearlyEdgeV = Math.abs(v) < CesiumMath.EPSILON5 || Math.abs(v - 1.0) < CesiumMath.EPSILON5;

            if (nearlyEdgeU && nearlyEdgeV) {
                // Corner vertex - skip it.
                continue;
            }

            var end = i + stride;
            for (var j = i; j < end; ++j) {
                tileVertices.push(vertices[j]);
            }

            lastU = u;
            lastV = v;
        }
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

            var terrainMesh = mesh;

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

        var terrainMesh = mesh;

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
                    edgeVertices = isNext ? sourceTerrainMesh.northIndicesWestToEast : sourceTerrainMesh.eastIndicesNorthToSouth;
                    compareU = isNext;
                    increasing = isNext;
                } else {
                    // northwest
                    edgeVertices = isNext ? sourceTerrainMesh.eastIndicesNorthToSouth : sourceTerrainMesh.southIndicesEastToWest;
                    compareU = !isNext;
                    increasing = false;
                }
            } else if (v === 0.0) {
                // southeast
                edgeVertices = isNext ? sourceTerrainMesh.westIndicesSouthToNorth : sourceTerrainMesh.northIndicesWestToEast;
                compareU = !isNext;
                increasing = true;
            } else {
                // northeast
                edgeVertices = isNext ? sourceTerrainMesh.southIndicesEastToWest : sourceTerrainMesh.westIndicesSouthToNorth;
                compareU = isNext;
                increasing = !isNext;
            }

            if (edgeVertices.length > 0) {
                // The vertex we want will very often be the first/last vertex so check that first.
                var sourceTile = edgeTiles[isNext ? 0 : edgeTiles.length - 1];
                vertexIndexIndex = isNext ? 0 : edgeVertices.length - 1;
                vertexIndex = edgeVertices[vertexIndexIndex];
                sourceTerrainMesh.encoding.decodeTextureCoordinates(sourceTerrainMesh.vertices, vertexIndex, uvScratch);
                var targetUv = transformTextureCoordinates(sourceTile, terrainFillMesh.tile, uvScratch, uvScratch);
                if (targetUv.x === u && targetUv.y === v) {
                    // Vertex is good!
                    addVertexFromTileAtCorner(sourceTerrainMesh, vertexIndex, u, v, tileVertices);
                    return true;
                }

                // The last vertex is not the one we need, try binary searching for the right one.
                vertexIndexIndex = binarySearch(edgeVertices, compareU ? u : v, function(vertexIndex, textureCoordinate) {
                    sourceTerrainMesh.encoding.decodeTextureCoordinates(sourceTerrainMesh.vertices, vertexIndex, uvScratch);
                    var targetUv = transformTextureCoordinates(sourceTile, terrainFillMesh.tile, uvScratch, uvScratch);
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
                        addInterpolatedVertexAtCorner(ellipsoid, sourceTile, terrainFillMesh.tile, sourceTerrainMesh, edgeVertices[vertexIndexIndex - 1], edgeVertices[vertexIndexIndex], u, v, compareU, tileVertices);
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
