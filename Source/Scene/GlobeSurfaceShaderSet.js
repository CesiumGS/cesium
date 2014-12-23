/*global define*/
define([
        '../Core/defined',
        '../Scene/terrainAttributeLocations'
    ], function(
        defined,
        terrainAttributeLocations) {
    "use strict";

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
    }

    GlobeSurfaceShaderSet.prototype.getShaderProgram = function(context, sceneMode, surfaceTile, numberOfDayTextures, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha, showReflectiveOcean, showOceanWaves) {
        if (defined(surfaceTile.shaderProgram) &&
            ((surfaceTile.numberOfDayTextures === numberOfDayTextures) &&
             (surfaceTile.sceneMode === sceneMode) &&
             (surfaceTile.applyBrightness === applyBrightness) &&
             (surfaceTile.applyContrast === applyContrast) &&
             (surfaceTile.applyHue === applyHue) &&
             (surfaceTile.applySaturation === applySaturation) &&
             (surfaceTile.applyGamma === applyGamma) &&
             (surfaceTile.applyAlpha === applyAlpha) &&
             (surfaceTile.showReflectiveOcean === showReflectiveOcean) &&
             (surfaceTile.showOceanWaves === showOceanWaves))) {

            return surfaceTile.shaderProgram;
        }

        // Cache miss.
        surfaceTile.shaderProgram = surfaceTile.shaderProgram && surfaceTile.shaderProgram.destroy();
        surfaceTile.numberOfDayTextures = numberOfDayTextures;
        surfaceTile.sceneMode = sceneMode;
        surfaceTile.applyBrightness = applyBrightness;
        surfaceTile.applyContrast = applyContrast;
        surfaceTile.applyHue = applyHue;
        surfaceTile.applySaturation = applySaturation;
        surfaceTile.applyGamma = applyGamma;
        surfaceTile.applyAlpha = applyAlpha;
        surfaceTile.showReflectiveOcean = showReflectiveOcean;
        surfaceTile.showOceanWaves = showOceanWaves;

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

// TODO: Surface tile should destroy this.
        var shader = context.createShaderProgram(vs, fs, this._attributeLocations);
        surfaceTile.shaderProgram = shader;
        return shader;
    };

    return GlobeSurfaceShaderSet;
});