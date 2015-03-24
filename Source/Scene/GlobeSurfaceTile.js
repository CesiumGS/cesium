/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/getTimestamp',
        '../Core/IndexDatatype',
        '../Core/IntersectionTests',
        '../Core/PixelFormat',
        '../Core/Rectangle',
        '../Core/TileProviderError',
        '../Renderer/BufferUsage',
        '../Renderer/PixelDatatype',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './ImageryState',
        './QuadtreeTileLoadState',
        './SceneMode',
        './terrainAttributeLocations',
        './TerrainState',
        './TileTerrain',
        '../ThirdParty/when'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        getTimestamp,
        IndexDatatype,
        IntersectionTests,
        PixelFormat,
        Rectangle,
        TileProviderError,
        BufferUsage,
        PixelDatatype,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        ImageryState,
        QuadtreeTileLoadState,
        SceneMode,
        terrainAttributeLocations,
        TerrainState,
        TileTerrain,
        when) {
    "use strict";

    /**
     * Contains additional information about a {@link QuadtreeTile} of the globe's surface, and
     * encapsulates state transition logic for loading tiles.
     *
     * @constructor
     * @alias GlobeSurfaceTile
     * @private
     */
    var GlobeSurfaceTile = function() {
        /**
         * Gets or sets the state of terrain loading.
         * @type {TerrainState}
         */
        this.terrainState = TerrainState.UNLOADED;

        /**
         * The {@link TileImagery} attached to this tile.
         * @type {TileImagery[]}
         * @default []
         */
        this.imagery = [];

        /**
         * The world coordinates of the southwest corner of the tile's rectangle.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southwestCornerCartesian = new Cartesian3();

        /**
         * The world coordinates of the northeast corner of the tile's rectangle.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northeastCornerCartesian = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.westNormal = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.eastNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northNormal = new Cartesian3();

        this.waterMaskTexture = undefined;

        this.waterMaskTranslationAndScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

        this.terrainData = undefined;
        this.center = new Cartesian3();
        this.vertexArray = undefined;
        this.minimumHeight = 1e30;
        this.maximumHeight = -1e30;
        this.boundingSphere3D = new BoundingSphere();
        this.boundingSphere2D = new BoundingSphere();
        this.occludeePointInScaledSpace = new Cartesian3();

        this.pickBoundingSphere = new BoundingSphere();

        this.surfaceShader = undefined;

        /**
         * Gets or sets the ancestor tile providing the vertex array for this tile.  If this property is a reference to the tile
         * itself, this tile has its own vertex array.
         * @type {QuadtreeTile}
         */
        this.vertexArrayFromTile = undefined;

        /**
         * Gets or sets the ancestor tile providing the bounding information (minimum height, maximum height, bounding spheres) for this
         * tile.  If this property is a reference to the tile itself, this tile has its own bounding information.
         * @type {QuadtreeTile}
         */
        this.boundingDataFromTile = undefined;

        /**
         * Gets or sets the range of texture coordinates for which to render this tile's vertexArray.  If the tile is loaded with its own
         * data (that is vertexArrayFromTile points to the tile itself), this property is ignored.  If the vertexArray belongs to
         * an ancestor tile, it specifies the range of parent texture coordinates, where x=west, y=south, z=east, w=north, that fall
         * within this tile's extent.
         * @type {Cartesian4}
         */
        this.textureCoordinateSubset = new Cartesian4(0.0, 0.0, 1.0, 1.0);
    };

    defineProperties(GlobeSurfaceTile.prototype, {
        /**
         * Gets a value indicating whether or not this tile is eligible to be unloaded.
         * Typically, a tile is ineligible to be unloaded while an asynchronous operation,
         * such as a request for data, is in progress on it.  A tile will never be
         * unloaded while it is needed for rendering, regardless of the value of this
         * property.
         * @memberof GlobeSurfaceTile.prototype
         * @type {Boolean}
         */
        eligibleForUnloading : {
            get : function() {
                // Do not remove tiles that are transitioning or that have imagery that is transitioning.
                var shouldRemoveTile = this.terrainState !== TerrainState.RECEIVING && this.terrainState !== TerrainState.TRANSFORMING;

                var imagery = this.imagery;
                for (var i = 0, len = imagery.length; shouldRemoveTile && i < len; ++i) {
                    var tileImagery = imagery[i];
                    shouldRemoveTile = !defined(tileImagery.loadingImagery) || tileImagery.loadingImagery.state !== ImageryState.TRANSITIONING;
                }

                return shouldRemoveTile;
            }
        }
    });

    function getPosition(tile, scene, vertices, stride, index, result) {
        Cartesian3.unpack(vertices, index * stride, result);
        Cartesian3.add(tile.center, result, result);

        if (defined(scene) && scene.mode !== SceneMode.SCENE3D) {
            var projection = scene.mapProjection;
            var ellipsoid = projection.ellipsoid;
            var positionCart = ellipsoid.cartesianToCartographic(result);
            projection.project(positionCart, result);
            Cartesian3.fromElements(result.z, result.x, result.y, result);
        }

        return result;
    }

    var scratchV0 = new Cartesian3();
    var scratchV1 = new Cartesian3();
    var scratchV2 = new Cartesian3();
    var scratchResult = new Cartesian3();

    GlobeSurfaceTile.prototype.pick = function(ray, scene, cullBackFaces, result) {
        var mesh = this.mesh;
        if (!defined(mesh)) {
            return undefined;
        }

        var vertices = mesh.vertices;
        var stride = mesh.stride;
        var indices = mesh.indices;

        var length = indices.length;
        for (var i = 0; i < length; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var v0 = getPosition(this, scene, vertices, stride, i0, scratchV0);
            var v1 = getPosition(this, scene, vertices, stride, i1, scratchV1);
            var v2 = getPosition(this, scene, vertices, stride, i2, scratchV2);

            var intersection = IntersectionTests.rayTriangle(ray, v0, v1, v2, cullBackFaces, scratchResult);
            if (defined(intersection)) {
                return Cartesian3.clone(intersection, result);
            }
        }

        return undefined;
    };

    GlobeSurfaceTile.prototype.freeResources = function() {
        if (defined(this.waterMaskTexture)) {
            --this.waterMaskTexture.referenceCount;
            if (this.waterMaskTexture.referenceCount === 0) {
                this.waterMaskTexture.destroy();
            }
            this.waterMaskTexture = undefined;
        }

        this.terrainState = TerrainState.UNLOADED;
        this.terrainData = undefined;
        this.mesh = undefined;

        var i, len;

        var imageryList = this.imagery;
        for (i = 0, len = imageryList.length; i < len; ++i) {
            imageryList[i].freeResources();
        }
        this.imagery.length = 0;

        this.freeVertexArray();
    };

    GlobeSurfaceTile.prototype.freeVertexArray = function() {
        var indexBuffer;

        if (defined(this.vertexArray)) {
            --this.vertexArray.referenceCount;
            if (this.vertexArray.referenceCount === 0) {
                indexBuffer = this.vertexArray.indexBuffer;
                this.vertexArray = this.vertexArray.destroy();

                if (!indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                    --indexBuffer.referenceCount;
                    if (indexBuffer.referenceCount === 0) {
                        indexBuffer.destroy();
                    }
                }
            }

            this.vertexArray = undefined;
        }

        if (defined(this.wireframeVertexArray)) {
            indexBuffer = this.wireframeVertexArray.indexBuffer;

            this.wireframeVertexArray = this.wireframeVertexArray.destroy();

            if (!indexBuffer.isDestroyed() && defined(indexBuffer.referenceCount)) {
                --indexBuffer.referenceCount;
                if (indexBuffer.referenceCount === 0) {
                    indexBuffer.destroy();
                }
            }
        }

        this.vertexArrayFromTile = undefined;
        this.boundingDataFromTile = undefined;
    };

    GlobeSurfaceTile.prepareNewTile = function(tile, terrainProvider, imageryLayerCollection) {
        if (tile.state === QuadtreeTileLoadState.START) {
            prepareNewTile(tile, terrainProvider, imageryLayerCollection);
            tile.state = QuadtreeTileLoadState.LOADING;
        }
    };

    GlobeSurfaceTile.processStateMachine = function(tile, context, terrainProvider, imageryLayerCollection) {
        if (tile.state === QuadtreeTileLoadState.START) {
            prepareNewTile(tile, terrainProvider, imageryLayerCollection);
            tile.state = QuadtreeTileLoadState.LOADING;
        }

        if (tile.state === QuadtreeTileLoadState.LOADING) {
            processTerrainStateMachine(tile, context, terrainProvider);
        }

        var surfaceTile = tile.data;

        // The terrain is renderable as soon as we have a valid vertex array.
        var isRenderable = defined(surfaceTile.vertexArray);

        // But it's not done loading until our two state machines are terminated.
        var isDoneLoading = surfaceTile.terrainState === TerrainState.READY;

        var isUpsampledOnly = surfaceTile.isUpsampledOnly;

        // Transition imagery states
        var tileImageryCollection = surfaceTile.imagery;
        for (var i = 0, len = tileImageryCollection.length; i < len; ++i) {
            var tileImagery = tileImageryCollection[i];
            if (!defined(tileImagery.loadingImagery)) {
                isUpsampledOnly = false;
                continue;
            }

            if (tileImagery.loadingImagery.state === ImageryState.PLACEHOLDER) {
                var imageryLayer = tileImagery.loadingImagery.imageryLayer;
                if (imageryLayer.imageryProvider.ready) {
                    // Remove the placeholder and add the actual skeletons (if any)
                    // at the same position.  Then continue the loop at the same index.
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    imageryLayer._createTileImagerySkeletons(tile, terrainProvider, i);
                    --i;
                    len = tileImageryCollection.length;
                    continue;
                } else {
                    isUpsampledOnly = false;
                }
            }

            var thisTileDoneLoading = tileImagery.processStateMachine(tile, context);
            isDoneLoading = isDoneLoading && thisTileDoneLoading;

            // The imagery is renderable as soon as we have any renderable imagery for this region.
            isRenderable = isRenderable && (thisTileDoneLoading || defined(tileImagery.readyImagery));

            isUpsampledOnly = isUpsampledOnly && defined(tileImagery.loadingImagery) &&
                             (tileImagery.loadingImagery.state === ImageryState.FAILED || tileImagery.loadingImagery.state === ImageryState.INVALID);
        }

        tile.upsampledFromParent = isUpsampledOnly;

        // The tile becomes renderable when the terrain and all imagery data are loaded.
        if (i === len) {
            if (isRenderable) {
                tile.renderable = true;
            }

            if (isDoneLoading) {
                tile.state = QuadtreeTileLoadState.DONE;
            }
        }
    };

    var cartesian3Scratch = new Cartesian3();
    var cartesian3Scratch2 = new Cartesian3();
    var westernMidpointScratch = new Cartesian3();
    var easternMidpointScratch = new Cartesian3();
    var cartographicScratch = new Cartographic();

    function prepareNewTile(tile, terrainProvider, imageryLayerCollection) {
        var surfaceTile = tile.data;
        if (!defined(surfaceTile)) {
            surfaceTile = tile.data = new GlobeSurfaceTile();
        }

        // If this tile is not available, start in the INVALID state so we'll upsample without
        // wasting time trying to load first.
        var tileDataAvailable = terrainProvider.getTileDataAvailable(tile.x, tile.y, tile.level);
        if (defined(tileDataAvailable) && !tileDataAvailable) {
            surfaceTile.terrainState = TerrainState.INVALID;
        }

        // Map imagery tiles to this terrain tile
        for (var i = 0, len = imageryLayerCollection.length; i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                layer._createTileImagerySkeletons(tile, terrainProvider);
            }
        }

        var ellipsoid = tile.tilingScheme.ellipsoid;

        // Compute tile rectangle boundaries for estimating the distance to the tile.
        var rectangle = tile.rectangle;

        ellipsoid.cartographicToCartesian(Rectangle.southwest(rectangle), surfaceTile.southwestCornerCartesian);
        ellipsoid.cartographicToCartesian(Rectangle.northeast(rectangle), surfaceTile.northeastCornerCartesian);

        // The middle latitude on the western edge.
        cartographicScratch.longitude = rectangle.west;
        cartographicScratch.latitude = (rectangle.south + rectangle.north) * 0.5;
        cartographicScratch.height = 0.0;
        var westernMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, westernMidpointScratch);

        // Compute the normal of the plane on the western edge of the tile.
        var westNormal = Cartesian3.cross(westernMidpointCartesian, Cartesian3.UNIT_Z, cartesian3Scratch);
        Cartesian3.normalize(westNormal, surfaceTile.westNormal);

        // The middle latitude on the eastern edge.
        cartographicScratch.longitude = rectangle.east;
        var easternMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, easternMidpointScratch);

        // Compute the normal of the plane on the eastern edge of the tile.
        var eastNormal = Cartesian3.cross(Cartesian3.UNIT_Z, easternMidpointCartesian, cartesian3Scratch);
        Cartesian3.normalize(eastNormal, surfaceTile.eastNormal);

        // Compute the normal of the plane bounding the southern edge of the tile.
        var southeastCornerNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.southeast(rectangle), cartesian3Scratch2);
        var westVector = Cartesian3.subtract(westernMidpointCartesian, easternMidpointCartesian, cartesian3Scratch);
        var southNormal = Cartesian3.cross(southeastCornerNormal, westVector, cartesian3Scratch2);
        Cartesian3.normalize(southNormal, surfaceTile.southNormal);

        // Compute the normal of the plane bounding the northern edge of the tile.
        var northwestCornerNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.northwest(rectangle), cartesian3Scratch2);
        var northNormal = Cartesian3.cross(westVector, northwestCornerNormal, cartesian3Scratch2);
        Cartesian3.normalize(northNormal, surfaceTile.northNormal);
    }

    function processTerrainStateMachine(tile, context, terrainProvider) {
        var surfaceTile = tile.data;

        if (surfaceTile.terrainState === TerrainState.UNLOADED) {
            requestTileGeometry(tile, terrainProvider);
        }

        if (surfaceTile.terrainState === TerrainState.RECEIVED) {
            transform(tile, context, terrainProvider);
        }

        if (surfaceTile.terrainState === TerrainState.TRANSFORMED) {
            createResources(tile, context, terrainProvider);
        }

        if (surfaceTile.terrainState === TerrainState.FAILED || surfaceTile.terrainState === TerrainState.INVALID) {
            upsample(tile, terrainProvider);
        }
    }

    function requestTileGeometry(tile, terrainProvider) {
        function success(terrainData) {
            tile.data.terrainData = terrainData;
            tile.data.terrainState = TerrainState.RECEIVED;
        }

        function failure() {
            // Initially assume failure.  handleError may retry, in which case the state will
            // change to RECEIVING or UNLOADED.
            tile.data.state = TerrainState.FAILED;

            var message = 'Failed to obtain terrain tile X: ' + tile.x + ' Y: ' + tile.y + ' Level: ' + tile.level + '.';
            terrainProvider._requestError = TileProviderError.handleError(
                    terrainProvider._requestError,
                    terrainProvider,
                    terrainProvider.errorEvent,
                    message,
                    tile.x, tile.y, tile.level,
                    doRequest);
        }

        function doRequest() {
            // Request the terrain from the terrain provider.
            var promise = terrainProvider.requestTileGeometry(tile.x, tile.y, tile.level);

            // If the request method returns undefined (instead of a promise), the request
            // has been deferred.
            if (defined(promise)) {
                tile.data.terrainState = TerrainState.RECEIVING;

                when(promise, success, failure);
            } else {
                // Deferred - try again later.
                tile.data.terrainState = TerrainState.UNLOADED;
            }
        }

        doRequest();
    }

    function transform(tile, context, terrainProvider) {
        var tilingScheme = terrainProvider.tilingScheme;

        var terrainData = tile.data.terrainData;
        var meshPromise = terrainData.createMesh(tilingScheme, tile.x, tile.y, tile.level);

        if (!defined(meshPromise)) {
            // Postponed.
            return;
        }

        tile.data.terrainState = TerrainState.TRANSFORMING;

        when(meshPromise, function(mesh) {
            tile.data.mesh = mesh;
            tile.data.minimumHeight = mesh.minimumHeight;
            tile.data.maximumHeight = mesh.maximumHeight;
            tile.data.boundingSphere3D = BoundingSphere.clone(mesh.boundingSphere3D, tile.data.boundingSphere3D);
            tile.data.occludeePointInScaledSpace = Cartesian3.clone(mesh.occludeePointInScaledSpace, tile.data.occludeePointInScaledSpace);
            tile.data.boundingDataFromTile = tile;
            tile.data.terrainState = TerrainState.TRANSFORMED;
        }, function() {
            tile.data.terrainState = TerrainState.FAILED;
        });
    }

    function createResources(tile, context, terrainProvider) {
        var datatype = ComponentDatatype.FLOAT;
        var stride;
        var numTexCoordComponents;
        var typedArray = tile.data.mesh.vertices;
        var buffer = context.createVertexBuffer(typedArray, BufferUsage.STATIC_DRAW);
        if (terrainProvider.hasVertexNormals) {
            stride = 7 * ComponentDatatype.getSizeInBytes(datatype);
            numTexCoordComponents = 3;
        } else {
            stride = 6 * ComponentDatatype.getSizeInBytes(datatype);
            numTexCoordComponents = 2;
        }

        var position3DAndHeightLength = 4;

        var attributes = [{
            index : terrainAttributeLocations.position3DAndHeight,
            vertexBuffer : buffer,
            componentDatatype : datatype,
            componentsPerAttribute : position3DAndHeightLength,
            offsetInBytes : 0,
            strideInBytes : stride
        }, {
            index : terrainAttributeLocations.textureCoordAndEncodedNormals,
            vertexBuffer : buffer,
            componentDatatype : datatype,
            componentsPerAttribute : numTexCoordComponents,
            offsetInBytes : position3DAndHeightLength * ComponentDatatype.getSizeInBytes(datatype),
            strideInBytes : stride
        }];

        var indexBuffers = tile.data.mesh.indices.indexBuffers || {};
        var indexBuffer = indexBuffers[context.id];
        if (!defined(indexBuffer) || indexBuffer.isDestroyed()) {
            var indices = tile.data.mesh.indices;
            var indexDatatype = (indices.BYTES_PER_ELEMENT === 2) ?  IndexDatatype.UNSIGNED_SHORT : IndexDatatype.UNSIGNED_INT;
            indexBuffer = context.createIndexBuffer(indices, BufferUsage.STATIC_DRAW, indexDatatype);
            indexBuffer.vertexArrayDestroyable = false;
            indexBuffer.referenceCount = 1;
            indexBuffers[context.id] = indexBuffer;
            tile.data.mesh.indices.indexBuffers = indexBuffers;
        } else {
            ++indexBuffer.referenceCount;
        }

        tile.data.vertexArray = context.createVertexArray(attributes, indexBuffer);
        tile.data.vertexArray.referenceCount = 1;
        tile.data.vertexArrayFromTile = tile;
        tile.data.center = Cartesian3.clone(tile.data.mesh.center, tile.data.center);

        var children = tile.children;
        for (var i = 0; i < children.length; ++i) {
            children[i].renderable = true;
        }

        tile.data.terrainState = TerrainState.READY;
    }

    function upsample(tile, terrainProvider) {
        var parent = tile.parent;

        if (!defined(parent) || !defined(parent.data) || !defined(parent.data.terrainData)) {
            // Can't upsample until our parent has data to upsample from.
            return;
        }

        var parentData = parent.data.terrainData;
        var promise = parentData.upsample(terrainProvider.tilingScheme, parent.x, parent.y, parent.level, tile.x, tile.y, tile.level);
        if (!defined(promise)) {
            // Postponed.
            return;
        }

        tile.data.terrainState = TerrainState.UPSAMPLING;

        promise.then(function(upsampledTerrainData) {
            tile.data.terrainData = upsampledTerrainData;
            tile.data.terrainState = TerrainState.RECEIVED;
        }).otherwise(function() {
            tile.data.terrainState = TerrainState.FAILED;
        });
    }

    var vertices = [];

    function estimateBoundingSphere(ellipsoid, rectangle, minimumHeight, maximumHeight, result) {
        vertices.length = 0;

        addVertex(ellipsoid, rectangle.west, rectangle.south, minimumHeight);
        addVertex(ellipsoid, rectangle.west, rectangle.south, maximumHeight);
        addVertex(ellipsoid, rectangle.west, rectangle.north, minimumHeight);
        addVertex(ellipsoid, rectangle.west, rectangle.north, maximumHeight);
        addVertex(ellipsoid, rectangle.east, rectangle.south, minimumHeight);
        addVertex(ellipsoid, rectangle.east, rectangle.south, maximumHeight);
        addVertex(ellipsoid, rectangle.east, rectangle.north, minimumHeight);
        addVertex(ellipsoid, rectangle.east, rectangle.north, maximumHeight);

        var centerLongitude = (rectangle.east + rectangle.west) * 0.5; 
        addVertex(ellipsoid, centerLongitude, rectangle.north, minimumHeight);
        addVertex(ellipsoid, centerLongitude, rectangle.north, maximumHeight);
        addVertex(ellipsoid, centerLongitude, rectangle.south, minimumHeight);
        addVertex(ellipsoid, centerLongitude, rectangle.south, maximumHeight);

        BoundingSphere.fromVertices(vertices, Cartesian3.ZERO, 3, result);
    }

    function addVertex(ellipsoid, longitude, latitude, height) {
        cartographicScratch.longitude = longitude;
        cartographicScratch.latitude = latitude;
        cartographicScratch.height = height; //terrainData.interpolateHeight(rectangle, longitude, latitude);

        var cartesian = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
        vertices.push(cartesian.x);
        vertices.push(cartesian.y);
        vertices.push(cartesian.z);
    }

    function isDataAvailable(tile, terrainProvider) {
        var tileDataAvailable = terrainProvider.getTileDataAvailable(tile.x, tile.y, tile.level);
        if (defined(tileDataAvailable)) {
            return tileDataAvailable;
        }

        var parent = tile.parent;
        if (!defined(parent)) {
            // Data is assumed to be available for root tiles.
            return true;
        }

        if (!defined(parent.data) || !defined(parent.data.terrainData)) {
            // Parent tile data is not yet received or upsampled, so assume (for now) that this
            // child tile is not available.
            return false;
        }

        return parent.data.terrainData.isChildAvailable(parent.x, parent.y, tile.x, tile.y);
    }

    function getContextWaterMaskData(context) {
        var data = context.cache.tile_waterMaskData;

        if (!defined(data)) {
            var allWaterTexture = context.createTexture2D({
                pixelFormat : PixelFormat.LUMINANCE,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    arrayBufferView : new Uint8Array([255]),
                    width : 1,
                    height : 1
                }
            });
            allWaterTexture.referenceCount = 1;

            var sampler = context.createSampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.LINEAR,
                magnificationFilter : TextureMagnificationFilter.LINEAR
            });

            data = {
                allWaterTexture : allWaterTexture,
                sampler : sampler,
                destroy : function() {
                    this.allWaterTexture.destroy();
                }
            };

            context.cache.tile_waterMaskData = data;
        }

        return data;
    }

    function createWaterMaskTextureIfNeeded(context, surfaceTile) {
        var previousTexture = surfaceTile.waterMaskTexture;
        if (defined(previousTexture)) {
            --previousTexture.referenceCount;
            if (previousTexture.referenceCount === 0) {
                previousTexture.destroy();
            }
            surfaceTile.waterMaskTexture = undefined;
        }

        var waterMask = surfaceTile.terrainData.waterMask;
        if (!defined(waterMask)) {
            return;
        }

        var waterMaskData = getContextWaterMaskData(context);
        var texture;

        var waterMaskLength = waterMask.length;
        if (waterMaskLength === 1) {
            // Length 1 means the tile is entirely land or entirely water.
            // A value of 0 indicates entirely land, a value of 1 indicates entirely water.
            if (waterMask[0] !== 0) {
                texture = waterMaskData.allWaterTexture;
            } else {
                // Leave the texture undefined if the tile is entirely land.
                return;
            }
        } else {
            var textureSize = Math.sqrt(waterMaskLength);
            texture = context.createTexture2D({
                pixelFormat : PixelFormat.LUMINANCE,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    width : textureSize,
                    height : textureSize,
                    arrayBufferView : waterMask
                }
            });

            texture.referenceCount = 0;
            texture.sampler = waterMaskData.sampler;
        }

        ++texture.referenceCount;
        surfaceTile.waterMaskTexture = texture;

        Cartesian4.fromElements(0.0, 0.0, 1.0, 1.0, surfaceTile.waterMaskTranslationAndScale);
    }

    function upsampleWaterMask(tile) {
        var surfaceTile = tile.data;

        // Find the nearest ancestor with loaded terrain.
        var sourceTile = tile.parent;
        while (defined(sourceTile) && !defined(sourceTile.data.terrainData) || sourceTile.data.terrainData.wasCreatedByUpsampling()) {
            sourceTile = sourceTile.parent;
        }

        if (!defined(sourceTile) || !defined(sourceTile.data.waterMaskTexture)) {
            // No ancestors have a water mask texture - try again later.
            return;
        }

        surfaceTile.waterMaskTexture = sourceTile.data.waterMaskTexture;
        ++surfaceTile.waterMaskTexture.referenceCount;

        // Compute the water mask translation and scale
        var sourceTileRectangle = sourceTile.rectangle;
        var tileRectangle = tile.rectangle;
        var tileWidth = tileRectangle.width;
        var tileHeight = tileRectangle.height;

        var scaleX = tileWidth / sourceTileRectangle.width;
        var scaleY = tileHeight / sourceTileRectangle.height;
        surfaceTile.waterMaskTranslationAndScale.x = scaleX * (tileRectangle.west - sourceTileRectangle.west) / tileWidth;
        surfaceTile.waterMaskTranslationAndScale.y = scaleY * (tileRectangle.south - sourceTileRectangle.south) / tileHeight;
        surfaceTile.waterMaskTranslationAndScale.z = scaleX;
        surfaceTile.waterMaskTranslationAndScale.w = scaleY;
    }

    return GlobeSurfaceTile;
});
