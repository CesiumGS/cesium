/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/FeatureDetection',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/Rectangle',
        '../Core/WebMercatorProjection',
        './GlobeSurfaceTile',
        './QuadtreeTileState',
        './SceneMode'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        FeatureDetection,
        Intersect,
        Matrix4,
        Rectangle,
        WebMercatorProjection,
        GlobeSurfaceTile,
        QuadtreeTileState,
        SceneMode) {
    "use strict";

    /**
     * Provides general quadtree tiles to be displayed on or near the surface of an ellipsoid.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias GlobeSurfaceTileProvider
     * @constructor
     */
    var GlobeSurfaceTileProvider = function GlobeSurfaceTileProvider(options) {
        this._terrainProvider = options.terrainProvider;
        this._imageryLayers = options.imageryLayers;

        this._errorEvent = new Event();
    };

    defineProperties(GlobeSurfaceTileProvider.prototype, {
        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof GlobeSurfaceTileProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return this._terrainProvider.ready && (this._imageryLayers.length === 0 || this._imageryLayers.get(0).imageryProvider.ready);
            }
        },

        /**
         * Gets the tiling scheme used by the provider.  This function should
         * not be called before {@link GlobeSurfaceTileProvider#ready} returns true.
         * @memberof GlobeSurfaceTileProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : function() {
                return this._terrainProvider.tilingScheme;
            }
        },

        /**
         * Gets an event that is raised when the geometry provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof GlobeSurfaceTileProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets the credit to display when this geometry provider is active.  Typically this is used to credit
         * the source of the geometry. This function should
         * not be called before {@link GlobeSurfaceTileProvider#ready} returns true.
         * @memberof GlobeSurfaceTileProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : function() {
                return undefined;
            }
        }
    });

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.  This function should not be
     * called before {@link GlobeSurfaceTileProvider#ready} returns true.
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    GlobeSurfaceTileProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._terrainProvider.getLevelMaximumGeometricError(level);
    };

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the geometry provider is ready.
     */
    GlobeSurfaceTileProvider.prototype.getTileCredits = function(tile) {
        // TODO
    };

    /**
     * Loads, or continues loading, a given tile.  This function will continue to be called
     * until {@link GlobeSurfaceTileProvider#isTileDoneLoading} returns true.  This function should
     * not be called before {@link GlobeSurfaceTileProvider#isReady} returns true.
     *
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Context} context The rendering context.
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Object} tile The tile instance returned from a previous invocation, if any.
     *
     * @returns {Object} The tile instance, which may be undefined if the tile cannot begin
     *                   loading yet, perhaps because too many requests to the same server
     *                   are already in flight.
     *
     * @exception {DeveloperError} <code>loadTile</code> must not be called before the tile provider is ready.
     */
    GlobeSurfaceTileProvider.prototype.loadTile = function(context, x, y, level, tile) {
        if (!defined(tile)) {
            tile = new GlobeSurfaceTile();
        }

        tile.processStateMachine(context, this._terrainProvider, this._imageryLayers);
    };

    /**
     * Gets the current state of the given tile.
     *
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {QuadtreeTileState} The current state of the tile.
     */
    GlobeSurfaceTileProvider.prototype.getTileState = function(tile) {
        if (!defined(tile)) {
            return QuadtreeTileState.LOADING;
        }

        return tile.state;
    };

    /**
     * Returns true if the tile is renderable.  Tiles that are both visible and renderable will be rendered by a call to
     * {@link GlobeSurfaceTileProvider#renderTile}
     *
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     *
     * @returns {Boolean} true if the tile is renderable; otherwise, false.
     */
    GlobeSurfaceTileProvider.prototype.isTileRenderable = function(tile) {
        return defined(tile) && tile.isRenderable;
    };

    var boundingSphereScratch = new BoundingSphere();

    /**
     * Returns true if the tile is visible.  Tiles that are both visible and renderable will be rendered by a call to
     * {@link GlobeSurfaceTileProvider#renderTile}
     *
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {FrameState} frameState The state information about the current frame.
     * @param {QuadtreeOccluders} occluders The objects that may occlude this tile.
     *
     * @returns {Boolean} true if the tile is visible; otherwise, false.
     */
    GlobeSurfaceTileProvider.prototype.isTileVisible = function(tile, frameState, occluders) {
        var cullingVolume = frameState.cullingVolume;

        var boundingVolume = tile.boundingSphere3D;

        if (frameState.mode !== SceneMode.SCENE3D) {
            boundingVolume = boundingSphereScratch;
            BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, frameState.scene2D.projection, tile.minimumHeight, tile.maximumHeight, boundingVolume);
            Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

            if (frameState.mode === SceneMode.MORPHING) {
                boundingVolume = BoundingSphere.union(tile.boundingSphere3D, boundingVolume, boundingVolume);
            }
        }

        if (cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE) {
            return false;
        }

        if (frameState.mode === SceneMode.SCENE3D) {
            var occludeePointInScaledSpace = tile.occludeePointInScaledSpace;
            if (!defined(occludeePointInScaledSpace)) {
                return true;
            }

            return occluders.ellipsoid.isScaledSpacePointVisible(occludeePointInScaledSpace);
        }

        return true;
    };

    var float32ArrayScratch = FeatureDetection.supportsTypedArrays() ? new Float32Array(1) : undefined;
    var modifiedModelViewScratch = new Matrix4();
    var tileRectangleScratch = new Cartesian4();
    var rtcScratch = new Cartesian3();
    var centerEyeScratch = new Cartesian4();
    var southwestScratch = new Cartesian3();
    var northeastScratch = new Cartesian3();

    /**
     * Renders a given tile.
     *
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {Context} context The rendering context.
     * @param {FrameState} frameState The state information of the current rendering frame.
     * @param {Command[]} commandList The list of rendering commands.  This method should add additional commands to this list.
     */
    GlobeSurfaceTileProvider.prototype.renderTile = function(tile, context, frameState, commandList) {
        var viewMatrix = frameState.camera.viewMatrix;

        var rtc = tile.center;

        // Not used in 3D.
        var tileRectangle = tileRectangleScratch;

        // Only used for Mercator projections.
        var southLatitude = 0.0;
        var northLatitude = 0.0;
        var southMercatorYHigh = 0.0;
        var southMercatorYLow = 0.0;
        var oneOverMercatorHeight = 0.0;

        if (frameState.mode !== SceneMode.SCENE3D) {
            var projection = frameState.scene2D.projection;
            var southwest = projection.project(Rectangle.getSouthwest(tile.rectangle), southwestScratch);
            var northeast = projection.project(Rectangle.getNortheast(tile.rectangle), northeastScratch);

            tileRectangle.x = southwest.x;
            tileRectangle.y = southwest.y;
            tileRectangle.z = northeast.x;
            tileRectangle.w = northeast.y;

            // In 2D and Columbus View, use the center of the tile for RTC rendering.
            if (frameState.mode !== SceneMode.MORPHING) {
                rtc = rtcScratch;
                rtc.x = 0.0;
                rtc.y = (tileRectangle.z + tileRectangle.x) * 0.5;
                rtc.z = (tileRectangle.w + tileRectangle.y) * 0.5;
                tileRectangle.x -= rtc.y;
                tileRectangle.y -= rtc.z;
                tileRectangle.z -= rtc.y;
                tileRectangle.w -= rtc.z;
            }

            if (projection instanceof WebMercatorProjection) {
                southLatitude = tile.rectangle.south;
                northLatitude = tile.rectangle.north;

                var southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(southLatitude);
                var northMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(northLatitude);

                float32ArrayScratch[0] = southMercatorY;
                southMercatorYHigh = float32ArrayScratch[0];
                southMercatorYLow = southMercatorY - float32ArrayScratch[0];

                oneOverMercatorHeight = 1.0 / (northMercatorY - southMercatorY);
            }
        }

        var centerEye = centerEyeScratch;
        centerEye.x = rtc.x;
        centerEye.y = rtc.y;
        centerEye.z = rtc.z;
        centerEye.w = 1.0;

        Matrix4.multiplyByVector(viewMatrix, centerEye, centerEye);
        Matrix4.setColumn(viewMatrix, 3, centerEye, modifiedModelViewScratch);

        var tileImageryCollection = tile.imagery;
        var imageryIndex = 0;
        var imageryLen = tileImageryCollection.length;

        do {
            var numberOfDayTextures = 0;

            ++tileCommandIndex;
            var command = tileCommands[tileCommandIndex];
            if (!defined(command)) {
                command = new DrawCommand();
                command.owner = tile;
                command.cull = false;
                command.boundingVolume = new BoundingSphere();
                tileCommands[tileCommandIndex] = command;
                tileCommandUniformMaps[tileCommandIndex] = createTileUniformMap(globeUniformMap);
            }
            command.owner = tile;

            command.debugShowBoundingVolume = (tile === surface._debug.boundingSphereTile);

            var uniformMap = tileCommandUniformMaps[tileCommandIndex];

            uniformMap.center3D = tile.center;

            Cartesian4.clone(tileRectangle, uniformMap.tileRectangle);
            uniformMap.southAndNorthLatitude.x = southLatitude;
            uniformMap.southAndNorthLatitude.y = northLatitude;
            uniformMap.southMercatorYLowAndHighAndOneOverHeight.x = southMercatorYLow;
            uniformMap.southMercatorYLowAndHighAndOneOverHeight.y = southMercatorYHigh;
            uniformMap.southMercatorYLowAndHighAndOneOverHeight.z = oneOverMercatorHeight;
            Matrix4.clone(modifiedModelViewScratch, uniformMap.modifiedModelView);

            var applyBrightness = false;
            var applyContrast = false;
            var applyHue = false;
            var applySaturation = false;
            var applyGamma = false;
            var applyAlpha = false;

            while (numberOfDayTextures < maxTextures && imageryIndex < imageryLen) {
                var tileImagery = tileImageryCollection[imageryIndex];
                var imagery = tileImagery.readyImagery;
                ++imageryIndex;

                if (!defined(imagery) || imagery.state !== ImageryState.READY || imagery.imageryLayer.alpha === 0.0) {
                    continue;
                }

                var imageryLayer = imagery.imageryLayer;

                if (!defined(tileImagery.textureTranslationAndScale)) {
                    tileImagery.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, tileImagery);
                }

                uniformMap.dayTextures[numberOfDayTextures] = imagery.texture;
                uniformMap.dayTextureTranslationAndScale[numberOfDayTextures] = tileImagery.textureTranslationAndScale;
                uniformMap.dayTextureTexCoordsRectangle[numberOfDayTextures] = tileImagery.textureCoordinateRectangle;

                if (typeof imageryLayer.alpha === 'function') {
                    uniformMap.dayTextureAlpha[numberOfDayTextures] = imageryLayer.alpha(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                } else {
                    uniformMap.dayTextureAlpha[numberOfDayTextures] = imageryLayer.alpha;
                }
                applyAlpha = applyAlpha || uniformMap.dayTextureAlpha[numberOfDayTextures] !== 1.0;

                if (typeof imageryLayer.brightness === 'function') {
                    uniformMap.dayTextureBrightness[numberOfDayTextures] = imageryLayer.brightness(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                } else {
                    uniformMap.dayTextureBrightness[numberOfDayTextures] = imageryLayer.brightness;
                }
                applyBrightness = applyBrightness || uniformMap.dayTextureBrightness[numberOfDayTextures] !== ImageryLayer.DEFAULT_BRIGHTNESS;

                if (typeof imageryLayer.contrast === 'function') {
                    uniformMap.dayTextureContrast[numberOfDayTextures] = imageryLayer.contrast(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                } else {
                    uniformMap.dayTextureContrast[numberOfDayTextures] = imageryLayer.contrast;
                }
                applyContrast = applyContrast || uniformMap.dayTextureContrast[numberOfDayTextures] !== ImageryLayer.DEFAULT_CONTRAST;

                if (typeof imageryLayer.hue === 'function') {
                    uniformMap.dayTextureHue[numberOfDayTextures] = imageryLayer.hue(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                } else {
                    uniformMap.dayTextureHue[numberOfDayTextures] = imageryLayer.hue;
                }
                applyHue = applyHue || uniformMap.dayTextureHue[numberOfDayTextures] !== ImageryLayer.DEFAULT_HUE;

                if (typeof imageryLayer.saturation === 'function') {
                    uniformMap.dayTextureSaturation[numberOfDayTextures] = imageryLayer.saturation(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                } else {
                    uniformMap.dayTextureSaturation[numberOfDayTextures] = imageryLayer.saturation;
                }
                applySaturation = applySaturation || uniformMap.dayTextureSaturation[numberOfDayTextures] !== ImageryLayer.DEFAULT_SATURATION;

                if (typeof imageryLayer.gamma === 'function') {
                    uniformMap.dayTextureOneOverGamma[numberOfDayTextures] = 1.0 / imageryLayer.gamma(frameState, imageryLayer, imagery.x, imagery.y, imagery.level);
                } else {
                    uniformMap.dayTextureOneOverGamma[numberOfDayTextures] = 1.0 / imageryLayer.gamma;
                }
                applyGamma = applyGamma || uniformMap.dayTextureOneOverGamma[numberOfDayTextures] !== 1.0 / ImageryLayer.DEFAULT_GAMMA;

                if (defined(imagery.credits)) {
                    var creditDisplay = frameState.creditDisplay;
                    var credits = imagery.credits;
                    for (var creditIndex = 0, creditLength = credits.length; creditIndex < creditLength; ++creditIndex) {
                        creditDisplay.addCredit(credits[creditIndex]);
                    }
                }

                ++numberOfDayTextures;
            }

            // trim texture array to the used length so we don't end up using old textures
            // which might get destroyed eventually
            uniformMap.dayTextures.length = numberOfDayTextures;
            uniformMap.waterMask = tile.waterMaskTexture;
            Cartesian4.clone(tile.waterMaskTranslationAndScale, uniformMap.waterMaskTranslationAndScale);

            commandList.push(command);

            command.shaderProgram = shaderSet.getShaderProgram(context, tileSetIndex, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha);
            command.renderState = renderState;
            command.primitiveType = PrimitiveType.TRIANGLES;
            command.vertexArray = tile.vertexArray;
            command.uniformMap = uniformMap;
            command.pass = Pass.OPAQUE;

            if (surface._debug.wireframe) {
                createWireframeVertexArrayIfNecessary(context, surface, tile);
                if (defined(tile.wireframeVertexArray)) {
                    command.vertexArray = tile.wireframeVertexArray;
                    command.primitiveType = PrimitiveType.LINES;
                }
            }

            var boundingVolume = command.boundingVolume;

            if (frameState.mode !== SceneMode.SCENE3D) {
                BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, frameState.scene2D.projection, tile.minimumHeight, tile.maximumHeight, boundingVolume);
                Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

                if (frameState.mode === SceneMode.MORPHING) {
                    boundingVolume = BoundingSphere.union(tile.boundingSphere3D, boundingVolume, boundingVolume);
                }
            } else {
                BoundingSphere.clone(tile.boundingSphere3D, boundingVolume);
            }

        } while (imageryIndex < imageryLen);
    };

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
     *
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     *
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    GlobeSurfaceTileProvider.prototype.getDistanceToTile = DeveloperError.throwInstantiationError;

    /**
     * Releases the geometry for a given tile.
     *
     * @memberof GlobeSurfaceTileProvider
     * @function
     *
     * @param {Object} tile The tile instance.
     */
    GlobeSurfaceTileProvider.prototype.releaseTile = DeveloperError.throwInstantiationError;

    return GlobeSurfaceTileProvider;
});
