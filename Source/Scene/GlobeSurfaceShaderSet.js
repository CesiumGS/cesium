/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Scene/SceneMode',
        '../Scene/terrainAttributeLocations'
    ], function(
        defined,
        destroyObject,
        SceneMode,
        terrainAttributeLocations) {
    "use strict";

    function GlobeSurfaceShader(numberOfDayTextures, flags, shaderProgram) {
        this.numberOfDayTextures = numberOfDayTextures;
        this.flags = flags;
        this.shaderProgram = shaderProgram;
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
        this._attributeLocations = terrainAttributeLocations;

        this._shadersByTexturesFlags = [];
    }

    GlobeSurfaceShaderSet.prototype.getShaderProgram = function(context, sceneMode, surfaceTile, numberOfDayTextures, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha, showReflectiveOcean, showOceanWaves, enableLighting, hasVertexNormals, useWebMercatorProjection) {
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
                    (hasVertexNormals << 11) |
                    (useWebMercatorProjection << 12);

        var surfaceShader = surfaceTile.surfaceShader;
        if (defined(surfaceShader) &&
            surfaceShader.numberOfDayTextures === numberOfDayTextures &&
            surfaceShader.flags === flags) {

            return surfaceShader.shaderProgram;
        }

        // New tile, or tile changed number of textures or flags.
        var shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures];
        if (!defined(shadersByFlags)) {
            shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures] = [];
        }

        surfaceShader = shadersByFlags[flags];
        if (!defined(surfaceShader)) {
            // Cache miss - we've never seen this combination of numberOfDayTextures and flags before.
            var vs = this.baseVertexShaderSource.clone();
            var fs = this.baseFragmentShaderSource.clone();

            fs.defines.push('TEXTURE_UNITS ' + numberOfDayTextures);

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

            var computeDayColor = '\
    vec4 computeDayColor(vec4 initialColor, vec2 textureCoordinates)\n\
    {\n\
        vec4 color = initialColor;\n';

            for (var i = 0; i < numberOfDayTextures; ++i) {
                computeDayColor += '\
    color = sampleAndBlend(\n\
        color,\n\
        u_dayTextures[' + i + '],\n\
        textureCoordinates,\n\
        u_dayTextureTexCoordsRectangle[' + i + '],\n\
        u_dayTextureTranslationAndScale[' + i + '],\n\
        ' + (applyAlpha ? 'u_dayTextureAlpha[' + i + ']' : '1.0') + ',\n\
        ' + (applyBrightness ? 'u_dayTextureBrightness[' + i + ']' : '0.0') + ',\n\
        ' + (applyContrast ? 'u_dayTextureContrast[' + i + ']' : '0.0') + ',\n\
        ' + (applyHue ? 'u_dayTextureHue[' + i + ']' : '0.0') + ',\n\
        ' + (applySaturation ? 'u_dayTextureSaturation[' + i + ']' : '0.0') + ',\n\
        ' + (applyGamma ? 'u_dayTextureOneOverGamma[' + i + ']' : '0.0') + '\n\
    );\n';
            }

            computeDayColor += '\
        return color;\n\
    }';

            fs.sources.push(computeDayColor);

            var getPosition3DMode = 'vec4 getPosition(vec3 position3DWC) { return getPosition3DMode(position3DWC); }';
            var getPosition2DMode = 'vec4 getPosition(vec3 position3DWC) { return getPosition2DMode(position3DWC); }';
            var getPositionColumbusViewMode = 'vec4 getPosition(vec3 position3DWC) { return getPositionColumbusViewMode(position3DWC); }';
            var getPositionMorphingMode = 'vec4 getPosition(vec3 position3DWC) { return getPositionMorphingMode(position3DWC); }';

            var getPositionMode;

            switch (sceneMode) {
            case SceneMode.SCENE3D:
                getPositionMode = getPosition3DMode;
                break;
            case SceneMode.SCENE2D:
                getPositionMode = getPosition2DMode;
                break;
            case SceneMode.COLUMBUS_VIEW:
                getPositionMode = getPositionColumbusViewMode;
                break;
            case SceneMode.MORPHING:
                getPositionMode = getPositionMorphingMode;
                break;
            }

            vs.sources.push(getPositionMode);

            var get2DYPositionFractionGeographicProjection = 'float get2DYPositionFraction() { return get2DGeographicYPositionFraction(); }';
            var get2DYPositionFractionMercatorProjection = 'float get2DYPositionFraction() { return get2DMercatorYPositionFraction(); }';

            var get2DYPositionFraction;

            if (useWebMercatorProjection) {
                get2DYPositionFraction = get2DYPositionFractionMercatorProjection;
            } else {
                get2DYPositionFraction = get2DYPositionFractionGeographicProjection;
            }

            vs.sources.push(get2DYPositionFraction);

            var shader = context.createShaderProgram(vs, fs, this._attributeLocations);
            surfaceShader = shadersByFlags[flags] = new GlobeSurfaceShader(numberOfDayTextures, flags, shader);
        }

        surfaceTile.surfaceShader = surfaceShader;
        return surfaceShader.shaderProgram;
    };

    GlobeSurfaceShaderSet.prototype.destroy = function() {
        var shadersByTexturesFlags = this._shadersByTexturesFlags;
        for (var textureCount in shadersByTexturesFlags) {
            if (shadersByTexturesFlags.hasOwnProperty(textureCount)) {
                var shadersByFlags = shadersByTexturesFlags[textureCount];
                if (!defined(shadersByFlags)) {
                    continue;
                }

                for (var flags in shadersByFlags) {
                    if (shadersByFlags.hasOwnProperty(flags)) {
                        var shader = shadersByFlags[flags];
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