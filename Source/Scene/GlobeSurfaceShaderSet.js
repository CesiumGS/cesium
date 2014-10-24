/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Scene/terrainAttributeLocations'
    ], function(
        defined,
        destroyObject,
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
        this._shaders = {};
    }

    GlobeSurfaceShaderSet.prototype.invalidateShaders = function() {
        var shaders = this._shaders;
        for ( var keyword in shaders) {
            if (shaders.hasOwnProperty(keyword)) {
                shaders[keyword].destroy();
            }
        }

        this._shaders = {};
    };

    function getShaderKey(textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha) {
        var key = '';
        key += textureCount;

        if (applyBrightness) {
            key += '_brightness';
        }

        if (applyContrast) {
            key += '_contrast';
        }

        if (applyHue) {
            key += '_hue';
        }

        if (applySaturation) {
            key += '_saturation';
        }

        if (applyGamma) {
            key += '_gamma';
        }

        if (applyAlpha) {
            key += '_alpha';
        }

        return key;
    }

    GlobeSurfaceShaderSet.prototype.getShaderProgram = function(context, textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha) {
        var key = getShaderKey(textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha);
        var shader = this._shaders[key];
        if (!defined(shader)) {
            var vs = this.baseVertexShaderSource;

            var fs = this.baseFragmentShaderSource.clone();
            fs.defines.push('TEXTURE_UNITS ' + textureCount);

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

            var computeDayColor = '\
vec4 computeDayColor(vec4 initialColor, vec2 textureCoordinates)\n\
{\n\
    vec4 color = initialColor;\n';

            for (var i = 0; i < textureCount; ++i) {
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

            shader = context.createShaderProgram(vs, fs, this._attributeLocations);
            this._shaders[key] = shader;
        }
        return shader;
    };

    GlobeSurfaceShaderSet.prototype.destroy = function() {
        this.invalidateShaders();
        return destroyObject(this);
    };

    return GlobeSurfaceShaderSet;
});