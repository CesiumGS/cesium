/*global define*/
define([
        '../Core/destroyObject'
    ], function(
        destroyObject) {
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
        this._shadersByTextureCount = [];
    }

    CentralBodySurfaceShaderSet.prototype.invalidateShaders = function() {
        var shadersByTextureCount = this._shadersByTextureCount;
        for (var i = 0, len = shadersByTextureCount.length; i < len; ++i) {
            var shader = shadersByTextureCount[i];
            if (typeof shader !== 'undefined') {
                shader.release();
            }
        }
        this._shadersByTextureCount = [];
    };

    CentralBodySurfaceShaderSet.prototype.getShaderProgram = function(context, textureCount) {
        var shader = this._shadersByTextureCount[textureCount];
        if (typeof shader === 'undefined') {
            var vs = this.baseVertexShaderString;
            var fs =
                '#define TEXTURE_UNITS ' + textureCount + '\n' +
                this.baseFragmentShaderString +
                'vec3 computeDayColor(vec3 initialColor, vec2 textureCoordinates)\n' +
                '{\n' +
                '    vec3 color = initialColor;\n';

            for (var i = 0; i < textureCount; ++i) {
                fs +=
                    'color = sampleAndBlend(\n' +
                    '   color,\n' +
                    '   u_dayTextures[' + i + '],\n' +
                    '   textureCoordinates,\n' +
                    '   u_dayTextureTexCoordsExtent[' + i + '],\n' +
                    '   u_dayTextureTranslationAndScale[' + i + '],\n' +
                    '   u_dayTextureAlpha[' + i + '],\n' +
                    '   u_dayTextureBrightness[' + i + '],\n' +
                    '   u_dayTextureContrast[' + i + '],\n' +
                    '   u_dayTextureOneOverGamma[' + i + ']);\n';
            }

            fs +=
                '    return color;\n' +
                '}';

            shader = context.getShaderCache().getShaderProgram(
                vs,
                fs,
                this._attributeIndices);
            this._shadersByTextureCount[textureCount] = shader;
        }
        return shader;
    };

    CentralBodySurfaceShaderSet.prototype.destroy = function() {
        var shadersByTextureCount = this._shadersByTextureCount;
        for (var i = 0, len = shadersByTextureCount.length; i < len; ++i) {
            var shader = shadersByTextureCount[i];
            if (typeof shader !== 'undefined') {
                shader.release();
            }
        }
        return destroyObject(this);
    };

    return CentralBodySurfaceShaderSet;
});