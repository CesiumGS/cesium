define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/TerrainQuantization',
        '../Renderer/ShaderProgram',
        './getClippingFunction',
        './SceneMode'
    ], function(
        defined,
        destroyObject,
        TerrainQuantization,
        ShaderProgram,
        getClippingFunction,
        SceneMode) {
    'use strict';

    function GlobeSurfaceShader(numberOfDayTextures, flags, material, shaderProgram, clippingShaderState, arbitraryProjectedImagery) {
        this.numberOfDayTextures = numberOfDayTextures;
        this.flags = flags;
        this.material = material;
        this.shaderProgram = shaderProgram;
        this.clippingShaderState = clippingShaderState;
        this.arbitraryProjectedImagery = arbitraryProjectedImagery;
    }

    function generateArbitraryProjectionKey(flags, dayTextureLayerIds) {
        return JSON.stringify(dayTextureLayerIds) + flags;
    }

    /**
     * Manages the shaders used to shade the surface of a {@link Globe}.
     *
     * @alias GlobeSurfaceShaderSet
     * @private
     */
    function GlobeSurfaceShaderSet() {
        this.baseVertexShaderSource = undefined;
        this.baseFragmentShaderSource = undefined;

        this._shadersByTexturesFlags = [];

        this._arbitraryProjectionShaders = [];

        this.material = undefined;
    }

    function getPositionMode(sceneMode) {
        var getPosition3DMode = 'vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPosition3DMode(position, height, textureCoordinates); }';
        var getPositionColumbusViewAnd2DMode = 'vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionColumbusViewMode(position, height, textureCoordinates); }';
        var getPositionMorphingMode = 'vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionMorphingMode(position, height, textureCoordinates); }';

        var positionMode;

        switch (sceneMode) {
        case SceneMode.SCENE3D:
            positionMode = getPosition3DMode;
            break;
        case SceneMode.SCENE2D:
        case SceneMode.COLUMBUS_VIEW:
            positionMode = getPositionColumbusViewAnd2DMode;
            break;
        case SceneMode.MORPHING:
            positionMode = getPositionMorphingMode;
            break;
        }

        return positionMode;
    }

    function get2DYPositionFraction(useWebMercatorProjection) {
        var get2DYPositionFractionGeographicProjection = 'float get2DYPositionFraction(vec2 textureCoordinates) { return get2DGeographicYPositionFraction(textureCoordinates); }';
        var get2DYPositionFractionMercatorProjection = 'float get2DYPositionFraction(vec2 textureCoordinates) { return get2DMercatorYPositionFraction(textureCoordinates); }';
        return useWebMercatorProjection ? get2DYPositionFractionMercatorProjection : get2DYPositionFractionGeographicProjection;
    }

    GlobeSurfaceShaderSet.prototype.getShaderProgram = function(options) {
        var frameState = options.frameState;
        var surfaceTile = options.surfaceTile;
        var numberOfDayTextures = options.numberOfDayTextures;
        var applyBrightness = options.applyBrightness;
        var applyContrast = options.applyContrast;
        var applyHue = options.applyHue;
        var applySaturation = options.applySaturation;
        var applyGamma = options.applyGamma;
        var applyAlpha = options.applyAlpha;
        var applySplit = options.applySplit;
        var showReflectiveOcean = options.showReflectiveOcean;
        var showOceanWaves = options.showOceanWaves;
        var enableLighting = options.enableLighting;
        var showGroundAtmosphere = options.showGroundAtmosphere;
        var perFragmentGroundAtmosphere = options.perFragmentGroundAtmosphere;
        var hasVertexNormals = options.hasVertexNormals;
        var useWebMercatorProjection = options.useWebMercatorProjection;
        var enableFog = options.enableFog;
        var enableClippingPlanes = options.enableClippingPlanes;
        var clippingPlanes = options.clippingPlanes;
        var clippedByBoundaries = options.clippedByBoundaries;
        var hasImageryLayerCutout = options.hasImageryLayerCutout;
        var colorCorrect = options.colorCorrect;
        var numberOfImageryLayers = options.numberOfImageryLayers;
        var dayTextureLayerIds = options.dayTextureLayerIds;
        var arbitraryProjectedImagery = options.arbitraryProjectedImagery;

        var quantization = 0;
        var quantizationDefine = '';

        var terrainEncoding = surfaceTile.pickTerrain.mesh.encoding;
        var quantizationMode = terrainEncoding.quantization;
        if (quantizationMode === TerrainQuantization.BITS12) {
            quantization = 1;
            quantizationDefine = 'QUANTIZATION_BITS12';
        }

        var vertexLogDepth = 0;
        var vertexLogDepthDefine = '';
        if (surfaceTile.terrainData._createdByUpsampling) {
            vertexLogDepth = 1;
            vertexLogDepthDefine = 'DISABLE_GL_POSITION_LOG_DEPTH';
        }

        var positions2d = 0;
        var positions2dDefine = '';
        if (!frameState.mapProjection.isNormalCylindrical) {
            positions2d = 1;
            positions2dDefine = 'POSITIONS_2D';
        }

        var cartographicLimitRectangleFlag = 0;
        var cartographicLimitRectangleDefine = '';
        if (clippedByBoundaries) {
            cartographicLimitRectangleFlag = 1;
            cartographicLimitRectangleDefine = 'TILE_LIMIT_RECTANGLE';
        }

        var imageryCutoutFlag = 0;
        var imageryCutoutDefine = '';
        if (hasImageryLayerCutout) {
            imageryCutoutFlag = 1;
            imageryCutoutDefine = 'APPLY_IMAGERY_CUTOUT';
        }

        var sceneMode = frameState.mode;
        var flags = sceneMode |
                    (applyBrightness << 2) |
                    (applyContrast << 3) |
                    (applyHue << 4) |
                    (applySaturation << 5) |
                    (applyGamma << 6) |
                    (applyAlpha << 7) |
                    (showReflectiveOcean << 8) |
                    (showOceanWaves << 9) |
                    (enableLighting << 10) |
                    (showGroundAtmosphere << 11) |
                    (perFragmentGroundAtmosphere << 12) |
                    (hasVertexNormals << 13) |
                    (useWebMercatorProjection << 14) |
                    (enableFog << 15) |
                    (quantization << 16) |
                    (applySplit << 17) |
                    (enableClippingPlanes << 18) |
                    (vertexLogDepth << 19) |
                    (cartographicLimitRectangleFlag << 20) |
                    (imageryCutoutFlag << 21) |
                    (colorCorrect << 22) |
                    (positions2d << 23);

        var currentClippingShaderState = 0;
        if (defined(clippingPlanes) && clippingPlanes.length > 0) {
            currentClippingShaderState = enableClippingPlanes ? clippingPlanes.clippingPlanesState : 0;
        }
        var surfaceShader = surfaceTile.surfaceShader;
        if (defined(surfaceShader) &&
            surfaceShader.numberOfDayTextures === numberOfDayTextures &&
            surfaceShader.flags === flags &&
            surfaceShader.material === this.material &&
            surfaceShader.clippingShaderState === currentClippingShaderState &&
            surfaceShader.arbitraryProjectedImagery === arbitraryProjectedImagery) {

            return surfaceShader.shaderProgram;
        }

        var shadersByFlags;
        var arbitraryProjectionKey;
        var arbitraryProjectionShaders;
        if (!arbitraryProjectedImagery) {
            // New tile, or tile changed number of textures, flags, or clipping planes
            shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures];
            if (!defined(shadersByFlags)) {
                shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures] = [];
            }

            surfaceShader = shadersByFlags[flags];
        } else {
            arbitraryProjectionKey = generateArbitraryProjectionKey(flags, dayTextureLayerIds);
            arbitraryProjectionShaders = this._arbitraryProjectionShaders[numberOfDayTextures];
            if (!defined(arbitraryProjectionShaders)) {
                arbitraryProjectionShaders = this._arbitraryProjectionShaders[numberOfDayTextures] = {};
            }

            surfaceShader = arbitraryProjectionShaders[arbitraryProjectionKey];
        }
        if (!defined(surfaceShader) || surfaceShader.material !== this.material || surfaceShader.clippingShaderState !== currentClippingShaderState) {
            // Cache miss - we've never seen this combination of numberOfDayTextures and flags before.
            var vs = this.baseVertexShaderSource.clone();
            var fs = this.baseFragmentShaderSource.clone();

            if (currentClippingShaderState !== 0) {
                fs.sources.unshift(getClippingFunction(clippingPlanes, frameState.context)); // Need to go before GlobeFS
            }

            vs.defines.push(quantizationDefine, vertexLogDepthDefine, positions2dDefine);
            fs.defines.push('TEXTURE_UNITS ' + numberOfDayTextures, cartographicLimitRectangleDefine, imageryCutoutDefine);

            if (applyBrightness) {
                fs.defines.push('APPLY_BRIGHTNESS');
            }
            if (applyContrast) {
                fs.defines.push('APPLY_CONTRAST');
            }
            if (applyHue) {
                fs.defines.push('APPLY_HUE');
            }
            if (applySaturation) {
                fs.defines.push('APPLY_SATURATION');
            }
            if (applyGamma) {
                fs.defines.push('APPLY_GAMMA');
            }
            if (applyAlpha) {
                fs.defines.push('APPLY_ALPHA');
            }
            if (showReflectiveOcean) {
                fs.defines.push('SHOW_REFLECTIVE_OCEAN');
                vs.defines.push('SHOW_REFLECTIVE_OCEAN');
            }
            if (showOceanWaves) {
                fs.defines.push('SHOW_OCEAN_WAVES');
            }

            if (enableLighting) {
                if (hasVertexNormals) {
                    vs.defines.push('ENABLE_VERTEX_LIGHTING');
                    fs.defines.push('ENABLE_VERTEX_LIGHTING');
                } else {
                    vs.defines.push('ENABLE_DAYNIGHT_SHADING');
                    fs.defines.push('ENABLE_DAYNIGHT_SHADING');
                }
            }

            if (showGroundAtmosphere) {
                vs.defines.push('GROUND_ATMOSPHERE');
                fs.defines.push('GROUND_ATMOSPHERE');
                if (perFragmentGroundAtmosphere) {
                    fs.defines.push('PER_FRAGMENT_GROUND_ATMOSPHERE');
                }
            }

            vs.defines.push('INCLUDE_WEB_MERCATOR_Y');
            fs.defines.push('INCLUDE_WEB_MERCATOR_Y');

            if (enableFog) {
                vs.defines.push('FOG');
                fs.defines.push('FOG');
            }

            if (applySplit) {
                fs.defines.push('APPLY_SPLIT');
            }

            if (enableClippingPlanes) {
                fs.defines.push('ENABLE_CLIPPING_PLANES');
            }

            if (colorCorrect) {
                fs.defines.push('COLOR_CORRECT');
            }

            var computeDayColor = '\
    vec4 computeDayColor(vec4 initialColor, vec3 textureCoordinates)\n\
    {\n\
        vec4 color = initialColor;\n';

        if (hasImageryLayerCutout || arbitraryProjectedImagery) {
            computeDayColor += '\
        vec4 computeDayColorResult;\n\
        bool updateColor = true;\n';
        }

        if (arbitraryProjectedImagery) {
            computeDayColor += '\
        bool layersUsed[' + Math.max(numberOfImageryLayers, 1) + '];\n';
        }

            for (var i = 0; i < numberOfDayTextures; ++i) {
                var dayTextureLayerId = dayTextureLayerIds[i];

                if (hasImageryLayerCutout) {
                    computeDayColor += '\
        computeDayColorResult = u_dayTextureCutoutRectangles[' + i + '];\n\
        updateColor = v_textureCoordinates.x < computeDayColorResult.x || computeDayColorResult.z < v_textureCoordinates.x || v_textureCoordinates.y < computeDayColorResult.y || computeDayColorResult.w < v_textureCoordinates.y;\n';
                }
                if (arbitraryProjectedImagery) {
                    computeDayColor += '\
        updateColor = !(layersUsed[' + dayTextureLayerId + '])' + (hasImageryLayerCutout ? ' && updateColor;\n' : ';\n');
                }
                if (hasImageryLayerCutout || arbitraryProjectedImagery) {
                    computeDayColor += '\
        computeDayColorResult = sampleAndBlend(\n';
                } else {
                    computeDayColor += '\
        color = sampleAndBlend(\n';
                }
        computeDayColor += '\
            color,\n\
            u_dayTextures[' + i + '],\n\
            u_dayTextureUseWebMercatorT[' + i + '] ? textureCoordinates.xz : textureCoordinates.xy,\n\
            u_dayTextureTexCoordsRectangle[' + i + '],\n\
            u_dayTextureTranslationAndScale[' + i + '],\n\
            ' + (applyAlpha ? 'u_dayTextureAlpha[' + i + ']' : '1.0') + ',\n\
            ' + (applyBrightness ? 'u_dayTextureBrightness[' + i + ']' : '0.0') + ',\n\
            ' + (applyContrast ? 'u_dayTextureContrast[' + i + ']' : '0.0') + ',\n\
            ' + (applyHue ? 'u_dayTextureHue[' + i + ']' : '0.0') + ',\n\
            ' + (applySaturation ? 'u_dayTextureSaturation[' + i + ']' : '0.0') + ',\n\
            ' + (applyGamma ? 'u_dayTextureOneOverGamma[' + i + ']' : '0.0') + ',\n\
            ' + (applySplit ? 'u_dayTextureSplit[' + i + ']' : '0.0') + '\n\
        );\n';

        if (arbitraryProjectedImagery) {
            computeDayColor += '\
        layersUsed[' + dayTextureLayerId + '] = (computeDayColorResult != color) || !(updateColor);\n';
        }
        if (hasImageryLayerCutout || arbitraryProjectedImagery) {
            computeDayColor += '\
        color = czm_branchFreeTernary(updateColor, computeDayColorResult, color);\n';
            }
        }

            computeDayColor += '\
        return color;\n\
    }';

            fs.sources.push(computeDayColor);

            vs.sources.push(getPositionMode(sceneMode));
            vs.sources.push(get2DYPositionFraction(useWebMercatorProjection));

            var shader = ShaderProgram.fromCache({
                context : frameState.context,
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : terrainEncoding.getAttributeLocations()
            });

            surfaceShader = new GlobeSurfaceShader(numberOfDayTextures, flags, this.material, shader, currentClippingShaderState, arbitraryProjectedImagery);
            if (!arbitraryProjectedImagery) {
                shadersByFlags[flags] = surfaceShader;
            } else {
                arbitraryProjectionShaders[arbitraryProjectionKey] = surfaceShader;
            }
        }

        surfaceTile.surfaceShader = surfaceShader;
        return surfaceShader.shaderProgram;
    };

    GlobeSurfaceShaderSet.prototype.destroy = function() {
        var flags;
        var shader;

        var shadersByTexturesFlags = this._shadersByTexturesFlags;
        for (var textureCount in shadersByTexturesFlags) {
            if (shadersByTexturesFlags.hasOwnProperty(textureCount)) {
                var shadersByFlags = shadersByTexturesFlags[textureCount];
                if (!defined(shadersByFlags)) {
                    continue;
                }

                for (flags in shadersByFlags) {
                    if (shadersByFlags.hasOwnProperty(flags)) {
                        shader = shadersByFlags[flags];
                        if (defined(shader)) {
                            shader.shaderProgram.destroy();
                        }
                    }
                }
            }
        }

        return destroyObject(this);
    };

    return GlobeSurfaceShaderSet;
});
