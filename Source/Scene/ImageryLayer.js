/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/Extent',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/MipmapHint',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureWrap',
        './GeographicTilingScheme',
        './Imagery',
        './ImageryState',
        './TileImagery',
        './TexturePool',
        '../ThirdParty/when',
        '../Shaders/ReprojectWebMercatorVS',
        '../Shaders/ReprojectWebMercatorFS'
    ], function(
        BoundingRectangle,
        ComponentDatatype,
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Cartesian4,
        Color,
        Extent,
        PrimitiveType,
        BufferUsage,
        MipmapHint,
        TextureMinificationFilter,
        TextureMagnificationFilter,
        TextureWrap,
        GeographicTilingScheme,
        Imagery,
        ImageryState,
        TileImagery,
        TexturePool,
        when,
        ReprojectWebMercatorVS,
        ReprojectWebMercatorFS) {
    "use strict";

    /**
     * An imagery layer that display tiled image data from a single imagery provider
     * on a central body.
     *
     * @name ImageryLayer
     *
     * @param {ImageryProvider} imageryProvider the imagery provider to use.
     * @param {Extent} [description.extent=imageryProvider.extent] The extent of the layer.
     * @param {Number} [description.maxScreenSpaceError=1.0] DOC_TBA
     * @param {Number} [description.alpha=1.0] The alpha blending value of this layer, from 0.0 to 1.0.
     */
    function ImageryLayer(imageryProvider, description) {
        this.imageryProvider = imageryProvider;

        description = defaultValue(description, {});

        /**
         * DOC_TBA
         *
         * @type {Extent}
         */
        this.extent = defaultValue(description.extent, Extent.MAX_VALUE);

        /**
         * DOC_TBA
         *
         * @type {Number}
         */
        this.maxScreenSpaceError = defaultValue(description.maxScreenSpaceError, 1.0);

        /**
         * The alpha blending value of this layer, from 0.0 to 1.0.
         *
         * @type {Number}
         */
        this.alpha = defaultValue(description.alpha, 1.0);

        this._imageryCache = {};
        this._texturePool = new TexturePool();

        this._levelZeroMaximumTexelSpacing = undefined;

        this._spReproject = undefined;
        this._vaReproject = undefined;
        this._fbReproject = undefined;

        this._skeletonPlaceholder = new TileImagery(Imagery.createPlaceholder(this));

        this._isBaseLayer = false;

        // delay construction of scratch Float32Array since the setup function needs to run
        // regardless of whether WebGL is supported.
        if (typeof float32ArrayScratch === 'undefined') {
            float32ArrayScratch = new Float32Array(1);
        }
    }

    /**
     * Gets a value indicating whether this layer is the base layer in the
     * {@link ImageryLayerCollection}.  The base layer is the one that underlies all
     * others.  It is special in that it is treated as if it has global extent, even if
     * it actually does not, by stretching the texels at the edges over the entire
     * globe.
     *
     * @returns {Boolean}
     */
    ImageryLayer.prototype.isBaseLayer = function() {
        return this._isBaseLayer;
    };

    /**
     * Gets the level with the specified world coordinate spacing between texels, or less.
     *
     * @param {Number} texelSpacing The texel spacing for which to find a corresponding level.
     * @param {Number} latitudeClosestToEquator The latitude closest to the equator that we're concerned with.
     * @returns {Number} The level with the specified texel spacing or less.
     */
    ImageryLayer.prototype._getLevelWithMaximumTexelSpacing = function(texelSpacing, latitudeClosestToEquator) {
        var levelZeroMaximumTexelSpacing = this._levelZeroMaximumTexelSpacing;
        var imageryProvider = this.imageryProvider;
        var tilingScheme = imageryProvider.getTilingScheme();
        var ellipsoid = tilingScheme.getEllipsoid();
        var latitudeFactor = Math.cos(latitudeClosestToEquator);
        var tilingSchemeExtent = tilingScheme.getExtent();
        levelZeroMaximumTexelSpacing = ellipsoid.getMaximumRadius() * (tilingSchemeExtent.east - tilingSchemeExtent.west) * latitudeFactor / (imageryProvider.getTileWidth() * tilingScheme.getNumberOfXTilesAtLevel(0));
        this._levelZeroMaximumTexelSpacing = levelZeroMaximumTexelSpacing;

        var twoToTheLevelPower = this._levelZeroMaximumTexelSpacing / texelSpacing;
        var level = Math.log(twoToTheLevelPower) / Math.log(2);

        // Round the level up, unless it's really close to the lower integer.
//        var ceiling = Math.ceil(level);
//        if (ceiling - level > 0.99) {
//            ceiling -= 1;
//        }
//        return ceiling | 0;
        var rounded = Math.round(level);
        return rounded | 0;
    };

    ImageryLayer.prototype.createTileImagerySkeletons = function(tile, terrainProvider, insertionPoint) {
        var imageryProvider = this.imageryProvider;

        if (typeof insertionPoint === 'undefined') {
            insertionPoint = tile.imagery.length;
        }

        if (!imageryProvider.isReady()) {
            // The imagery provider is not ready, so we can't create skeletons, yet.
            // Instead, add a placeholder so that we'll know to create
            // the skeletons once the provider is ready.
            this._skeletonPlaceholder.imagery.addReference();
            tile.imagery.splice(insertionPoint, 0, this._skeletonPlaceholder);
            return true;
        }

        // Compute the extent of the imagery from this imageryProvider that overlaps
        // the geometry tile.  The ImageryProvider and ImageryLayer both have the
        // opportunity to constrain the extent.  The imagery TilingScheme's extent
        // always fully contains the ImageryProvider's extent.
        var extent = tile.extent.intersectWith(imageryProvider.getExtent());
        extent = extent.intersectWith(this.extent);

        if (extent.east <= extent.west || extent.north <= extent.south) {
            // There is no overlap between this terrain tile and this imagery
            // provider, so no skeletons need to be created.
            return false;
        }

        var latitudeClosestToEquator = 0.0;
        if (extent.south > 0.0) {
            latitudeClosestToEquator = extent.south;
        } else if (extent.north < 0.0) {
            latitudeClosestToEquator = extent.north;
        }

        // Compute the required level in the imagery tiling scheme.
        // TODO: this should be imagerySSE / terrainSSE.
        var errorRatio = 1.0;
        var targetGeometricError = errorRatio * terrainProvider.getLevelMaximumGeometricError(tile.level);
        var imageryLevel = this._getLevelWithMaximumTexelSpacing(targetGeometricError, latitudeClosestToEquator);
        imageryLevel = Math.max(0, Math.min(imageryProvider.getMaximumLevel(), imageryLevel));

        var imageryTilingScheme = imageryProvider.getTilingScheme();
        var northwestTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getNorthwest(), imageryLevel);
        var southeastTileCoordinates = imageryTilingScheme.positionToTileXY(extent.getSoutheast(), imageryLevel);

        // If the southeast corner of the extent lies very close to the north or west side
        // of the southeast tile, we don't actually need the southernmost or easternmost
        // tiles.
        // Similarly, if the northwest corner of the extent list very close to the south or east side
        // of the northwest tile, we don't actually need the northernmost or westernmost tiles.
        // TODO: The northwest corner is especially sketchy...  Should we be doing something
        // elsewhere to ensure better alignment?
        // TODO: Is CesiumMath.EPSILON10 the right epsilon to use?
        var northwestTileExtent = imageryTilingScheme.tileXYToExtent(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        if (Math.abs(northwestTileExtent.south - extent.north) < CesiumMath.EPSILON10) {
            ++northwestTileCoordinates.y;
        }
        if (Math.abs(northwestTileExtent.east - extent.west) < CesiumMath.EPSILON10) {
            ++northwestTileCoordinates.x;
        }

        var southeastTileExtent = imageryTilingScheme.tileXYToExtent(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
        if (Math.abs(southeastTileExtent.north - extent.south) < CesiumMath.EPSILON10) {
            --southeastTileCoordinates.y;
        }
        if (Math.abs(southeastTileExtent.west - extent.east) < CesiumMath.EPSILON10) {
            --southeastTileCoordinates.x;
        }

        var imageryMaxX = imageryTilingScheme.getNumberOfXTilesAtLevel(imageryLevel);
        var imageryMaxY = imageryTilingScheme.getNumberOfYTilesAtLevel(imageryLevel);

        // Create TileImagery instances for each imagery tile overlapping this terrain tile.
        // We need to do all texture coordinate computations in the imagery tile's tiling scheme.

        var terrainExtent = tile.extent;
        var imageryExtent = imageryTilingScheme.tileXYToExtent(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);

        var minU;
        var maxU = 0.0;

        var minV = 1.0;
        var maxV;

        // If this is the northern-most or western-most tile in the imagery tiling scheme,
        // it may not start at the northern or western edge of the terrain tile.
        // Calculate where it does start.
        if (!this.isBaseLayer() && northwestTileCoordinates.x === 0) {
            maxU = Math.min(1.0, (imageryExtent.west - terrainExtent.west) / (terrainExtent.east - terrainExtent.west));
        }

        if (!this.isBaseLayer() && northwestTileCoordinates.y === 0) {
            minV = Math.max(0.0, (imageryExtent.north - terrainExtent.south) / (terrainExtent.north - terrainExtent.south));
        }

        var initialMinV = minV;

        for ( var i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
            minU = maxU;

            imageryExtent = imageryTilingScheme.tileXYToExtent(i, northwestTileCoordinates.y, imageryLevel);
            maxU = Math.min(1.0, (imageryExtent.east - terrainExtent.west) / (terrainExtent.east - terrainExtent.west));

            // If this is the eastern-most imagery tile mapped to this terrain tile,
            // and there are more imagery tiles to the east of this one, the maxU
            // should be 1.0 to make sure rounding errors don't make the last
            // image fall shy of the edge of the terrain tile.
            if (i === southeastTileCoordinates.x && (this.isBaseLayer() || i < imageryMaxX - 1)) {
                maxU = 1.0;
            }

            minV = initialMinV;

            for ( var j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
                maxV = minV;

                imageryExtent = imageryTilingScheme.tileXYToExtent(i, j, imageryLevel);
                minV = Math.max(0.0, (imageryExtent.south - terrainExtent.south) / (terrainExtent.north - terrainExtent.south));

                // If this is the southern-most imagery tile mapped to this terrain tile,
                // and there are more imagery tiles to the south of this one, the minV
                // should be 0.0 to make sure rounding errors don't make the last
                // image fall shy of the edge of the terrain tile.
                if (j === southeastTileCoordinates.y && (this.isBaseLayer() || j < imageryMaxY - 1)) {
                    minV = 0.0;
                }

                var texCoordsExtent = new Cartesian4(minU, minV, maxU, maxV);
                var imagery = this.getImageryFromCache(i, j, imageryLevel, imageryExtent);
                tile.imagery.splice(insertionPoint, 0, new TileImagery(imagery, texCoordsExtent));
                ++insertionPoint;
            }
        }

        return true;
    };

    ImageryLayer.prototype.calculateTextureTranslationAndScale = function(tile, tileImagery) {
        var imageryExtent = tileImagery.imagery.extent;
        var terrainExtent = tile.extent;
        var terrainWidth = terrainExtent.east - terrainExtent.west;
        var terrainHeight = terrainExtent.north - terrainExtent.south;

        var scaleX = terrainWidth / (imageryExtent.east - imageryExtent.west);
        var scaleY = terrainHeight / (imageryExtent.north - imageryExtent.south);
        return new Cartesian4(
                scaleX * (terrainExtent.west - imageryExtent.west) / terrainWidth,
                scaleY * (terrainExtent.south - imageryExtent.south) / terrainHeight,
                scaleX,
                scaleY);
    };

    ImageryLayer.prototype.requestImagery = function(imagery) {
        var imageryProvider = this.imageryProvider;

        var imagePromise = imageryProvider.requestImage(imagery.x, imagery.y, imagery.level);

        if (typeof imagePromise === 'undefined') {
            // Too many parallel requests, so postpone loading tile.
            imagery.state = ImageryState.UNLOADED;
            return;
        }

        when(imagePromise, function(image) {
            imagery.image = image;

            if (typeof image === 'undefined') {
                imagery.state = ImageryState.INVALID;
            } else {
                imagery.state = ImageryState.RECEIVED;
            }
        }, function(e) {
            /*global console*/
            console.error('failed to load imagery: ' + e);
            imagery.state = ImageryState.FAILED;
        });
    };

    ImageryLayer.prototype.createTexture = function(context, imagery) {
        var imageryProvider = this.imageryProvider;

        // If this imagery provider has a discard policy, use it to check if this
        // image should be discarded.
        if (typeof imageryProvider.getTileDiscardPolicy !== 'undefined') {
            var discardPolicy = imageryProvider.getTileDiscardPolicy();
            if (typeof discardPolicy !== 'undefined') {
                // If the discard policy is not ready yet, transition back to the
                // RECEIVED state and we'll try again next time.
                if (!discardPolicy.isReady()) {
                    imagery.state = ImageryState.RECEIVED;
                    return;
                }

                // Mark discarded imagery tiles invalid.  Parent imagery will be used instead.
                if (discardPolicy.shouldDiscardImage(imagery.image)) {
                    imagery.state = ImageryState.INVALID;
                    return;
                }
            }
        }

        // Imagery does not need to be discarded, so upload it to WebGL.
        var texture = this._texturePool.createTexture2D(context, {
            source : imagery.image
        });

        imagery.texture = texture;
        imagery.image = undefined;
        imagery.state = ImageryState.TEXTURE_LOADED;
    };

    ImageryLayer.prototype.reprojectTexture = function(context, imagery) {
        var texture = imagery.texture;
        var extent = imagery.extent;

        // Reproject this texture if it is not already in a geographic projection and
        // the pixels are more than 1e-5 radians apart.  The pixel spacing cutoff
        // avoids precision problems in the reprojection transformation while making
        // no noticeable difference in the georeferencing of the image.
        if (!(this.imageryProvider.getTilingScheme() instanceof GeographicTilingScheme) &&
            (extent.east - extent.west) / texture.getWidth() > 1e-5) {
                var reprojectedTexture = reprojectToGeographic(this, context, texture, imagery.extent);
                texture.destroy();
                imagery.texture = texture = reprojectedTexture;
        }

        texture.generateMipmap(MipmapHint.NICEST);
        texture.setSampler({
            wrapS : TextureWrap.CLAMP,
            wrapT : TextureWrap.CLAMP,
            minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
            magnificationFilter : TextureMagnificationFilter.LINEAR,
            maximumAnisotropy : context.getMaximumTextureFilterAnisotropy()
        });

        imagery.state = ImageryState.READY;
    };

    var uniformMap = {
        u_textureDimensions : function() {
            return this.textureDimensions;
        },
        u_texture : function() {
            return this.texture;
        },
        u_northLatitude : function() {
            return this.northLatitude;
        },
        u_southLatitude : function() {
            return this.southLatitude;
        },
        u_southMercatorYLow : function() {
            return this.southMercatorYLow;
        },
        u_southMercatorYHigh : function() {
            return this.southMercatorYHigh;
        },
        u_oneOverMercatorHeight : function() {
            return this.oneOverMercatorHeight;
        },

        textureDimensions : new Cartesian2(0.0, 0.0),
        texture : undefined,
        northLatitude : 0,
        southLatitude : 0,
        southMercatorYHigh : 0,
        southMercatorYLow : 0,
        oneOverMercatorHeight : 0
    };

    var float32ArrayScratch;

    function reprojectToGeographic(imageryLayer, context, texture, extent) {
        if (typeof imageryLayer._fbReproject === 'undefined') {
            imageryLayer._fbReproject = context.createFramebuffer();
            imageryLayer._fbReproject.destroyAttachments = false;

            var reprojectMesh = {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]
                    }
                }
            };

            var reprojectAttribInds = {
                position : 0
            };

            imageryLayer._vaReproject = context.createVertexArrayFromMesh({
                mesh : reprojectMesh,
                attributeIndices : reprojectAttribInds,
                bufferUsage : BufferUsage.STATIC_DRAW
            });

            imageryLayer._spReproject = context.getShaderCache().getShaderProgram(
                ReprojectWebMercatorVS,
                ReprojectWebMercatorFS,
                reprojectAttribInds);

            imageryLayer._rsColor = context.createRenderState({
                cull : {
                    enabled : false
                }
            });
        }

        texture.setSampler({
            wrapS : TextureWrap.CLAMP,
            wrapT : TextureWrap.CLAMP,
            minificationFilter : TextureMinificationFilter.LINEAR,
            magnificationFilter : TextureMagnificationFilter.LINEAR
        });

        var width = texture.getWidth();
        var height = texture.getHeight();

        uniformMap.textureDimensions.x = width;
        uniformMap.textureDimensions.y = height;
        uniformMap.texture = texture;

        uniformMap.northLatitude = extent.north;
        uniformMap.southLatitude = extent.south;

        var sinLatitude = Math.sin(extent.south);
        var southMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));

        float32ArrayScratch[0] = southMercatorY;
        uniformMap.southMercatorYHigh = float32ArrayScratch[0];
        uniformMap.southMercatorYLow = southMercatorY - float32ArrayScratch[0];

        sinLatitude = Math.sin(extent.north);
        var northMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));
        uniformMap.oneOverMercatorHeight = 1.0 / (northMercatorY - southMercatorY);

        var outputTexture = imageryLayer._texturePool.createTexture2D(context, {
            width : width,
            height : height,
            pixelFormat : texture.getPixelFormat(),
            pixelDatatype : texture.getPixelDatatype(),
            preMultiplyAlpha : texture.getPreMultiplyAlpha()
        });

        // Allocate memory for the mipmaps.  Failure to do this before rendering
        // to the texture via the FBO, and calling generateMipmap later,
        // will result in the texture appearing blank.  I can't pretend to
        // understand exactly why this is.
        outputTexture.generateMipmap(MipmapHint.NICEST);

        imageryLayer._fbReproject.setColorTexture(outputTexture);

        context.clear(context.createClearState({
            framebuffer : imageryLayer._fbReproject,
            color : new Color(0.0, 0.0, 0.0, 0.0)
        }));

        var renderState = imageryLayer._rsColor;
        var viewport = renderState.viewport;
        if (typeof viewport === 'undefined') {
            viewport = new BoundingRectangle();
            renderState.viewport = viewport;
        }
        viewport.width = width;
        viewport.height = height;

        context.draw({
            framebuffer : imageryLayer._fbReproject,
            shaderProgram : imageryLayer._spReproject,
            renderState : renderState,
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            vertexArray : imageryLayer._vaReproject,
            uniformMap : uniformMap
        });

        return outputTexture;
    }

    ImageryLayer.prototype.getImageryFromCache = function(x, y, level, imageryExtent) {
        var cacheKey = getImageryCacheKey(x, y, level);
        var imagery = this._imageryCache[cacheKey];

        if (typeof imagery === 'undefined') {
            imagery = new Imagery(this, x, y, level, imageryExtent);
            this._imageryCache[cacheKey] = imagery;
        }

        imagery.addReference();
        return imagery;
    };

    ImageryLayer.prototype.removeImageryFromCache = function(imagery) {
        var cacheKey = getImageryCacheKey(imagery.x, imagery.y, imagery.level);
        delete this._imageryCache[cacheKey];
    };

    function getImageryCacheKey(x, y, level) {
        return JSON.stringify([x, y, level]);
    }

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof ImageryLayer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see ImageryLayer#destroy
     */
    ImageryLayer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof ImageryLayer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ImageryLayer#isDestroyed
     *
     * @example
     * imageryLayer = imageryLayer && imageryLayer.destroy();
     */
    ImageryLayer.prototype.destroy = function() {
        this._texturePool = this._texturePool && this._texturePool.destroy();

        return destroyObject(this);
    };

    return ImageryLayer;
});