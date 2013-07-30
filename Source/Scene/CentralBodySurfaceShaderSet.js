/*global define*/
define([
        '../Core/destroyObject',
        '../Core/defaultValue'
    ], function(
        destroyObject,
        defaultValue) {
    "use strict";

    /**
     * Manages the shaders used to shade the surface of a {@link CentralBody}.
     *
     * @alias CentralBodySurfaceShaderSet
     * @private
     */
    function CentralBodySurfaceShaderSet(attributeIndices) {
        this.baseVertexShaderString = undefined;
        this.baseFragmentShaderString = undefined;
        this._attributeIndices = attributeIndices;
        this._shaders = {};
    }

    CentralBodySurfaceShaderSet.prototype.invalidateShaders = function() {
        var shaders = this._shaders;
        for ( var keyword in shaders) {
            if (shaders.hasOwnProperty(keyword)) {
                shaders[keyword].release();
            }
        }

        this._shaders = {};
    };

    function getShaderKey(textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha) {
        var key = '';
        key += textureCount;
        key += applyBrightness ? '_brightness' : '';
        key += applyContrast ? '_contrast' : '';
        key += applyHue ? '_hue' : '';
        key += applySaturation ? '_saturation' : '';
        key += applyGamma ? '_gamma' : '';
        key += applyAlpha ? '_alpha' : '';

        return key;
    }

    CentralBodySurfaceShaderSet.prototype.getShaderProgram = function(context, textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha) {
        var key = getShaderKey(textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha);
        var shader = this._shaders[key];
        if (typeof shader === 'undefined') {
            var vs = this.baseVertexShaderString;
            var dayTextureSamplers = '';
            var i;
            for (i = 0; i < textureCount; ++i) {
                dayTextureSamplers += 'uniform sampler2D u_dayTexture' + i + ';\n';
            }
            var fs =
                (applyBrightness ? '#define APPLY_BRIGHTNESS\n' : '') +
                (applyContrast ? '#define APPLY_CONTRAST\n' : '') +
                (applyHue ? '#define APPLY_HUE\n' : '') +
                (applySaturation ? '#define APPLY_SATURATION\n' : '') +
                (applyGamma ? '#define APPLY_GAMMA\n' : '') +
                (applyAlpha ? '#define APPLY_ALPHA\n' : '') +
                '#define TEXTURE_UNITS ' + textureCount + '\n' +
                dayTextureSamplers +
                this.baseFragmentShaderString + '\n' +
                'vec3 computeDayColor(vec3 initialColor, vec2 textureCoordinates)\n' +
                '{\n' +
                '    vec3 color = initialColor;\n';

            for (i = 0; i < textureCount; ++i) {
                fs +=
                    'vec4 sample' + i + ' = texture2D(u_dayTexture' + i + ', textureCoordinates * u_dayTextureTranslationAndScale[' + i + '].zw + u_dayTextureTranslationAndScale[' + i + '].xy);\n' +
                    'color = sampleAndBlend(\n' +
                    '   color,\n' +
                    '   sample' + i + ',\n' +
                    '   textureCoordinates,\n' +
                    '   u_dayTextureTexCoordsExtent[' + i + '],\n' +
                    '   u_dayTextureTranslationAndScale[' + i + '],\n' +
                    '   u_dayTextureAlpha[' + i + '],\n' +
                    '   u_dayTextureBrightness[' + i + '],\n' +
                    '   u_dayTextureContrast[' + i + '],\n' +
                    '   u_dayTextureHue[' + i + '],\n' +
                    '   u_dayTextureSaturation[' + i + '],\n' +
                    '   u_dayTextureOneOverGamma[' + i + ']);\n';
            }

            fs +=
                '    return color;\n' +
                '}';

            shader = context.getShaderCache().getShaderProgram(
                vs,
                fs,
                this._attributeIndices);
            this._shaders[key] = shader;
        }
        return shader;
    };

    CentralBodySurfaceShaderSet.prototype.destroy = function() {
        this.invalidateShaders();
        return destroyObject(this);
    };

    return CentralBodySurfaceShaderSet;
});