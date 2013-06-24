/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        './Appearance'
    ], function(
        defaultValue,
        DeveloperError,
        Appearance) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias DebugAppearance
     * @constructor
     *
     * @exception {DeveloperError} options.attributeName is required.
     * @exception {DeveloperError} options.glslDatatype must be float, vec2, vec3, or vec4.
     */
    var DebugAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var attributeName = options.attributeName;

        if (typeof attributeName === 'undefined') {
            throw new DeveloperError('options.attributeName is required.');
        }

        var glslDatatype = defaultValue(options.glslDatatype, 'vec3');
        var varyingName = 'v_' + attributeName;
        var varyingVec4;

        switch(glslDatatype) {
            case 'float':
                varyingVec4 = 'vec4(vec3(' + varyingName + '), 1.0)';
                break;
            case 'vec2':
                varyingVec4 = 'vec4(' + varyingName + ', 0.0, 1.0)';
                break;
            case 'vec3':
                varyingVec4 = 'vec4(' + varyingName + ', 1.0)';
                break;
            case 'vec4':
                varyingVec4 = varyingName;
                break;
            default:
                throw new DeveloperError('options.glslDatatype must be float, vec2, vec3, or vec4.');
        }

        var vs =
            'attribute vec3 position3DHigh;\n' +
            'attribute vec3 position3DLow;\n' +
            'attribute ' + glslDatatype + ' ' + attributeName + ';\n' +
            'varying ' + glslDatatype + ' ' + varyingName + ';\n' +
            'void main()\n' +
            '{\n' +
            'vec4 p = czm_translateRelativeToEye(position3DHigh, position3DLow);\n' +
            varyingName + ' = ' +  attributeName + ';\n' +
            'gl_Position = czm_modelViewProjectionRelativeToEye * p;\n' +
            '}';
        var fs =
            'varying ' + glslDatatype + ' ' + varyingName + ';\n' +
            'void main()\n' +
            '{\n' +
            'gl_FragColor = ' + varyingVec4 + ';\n' +
            '}';

        options.flat = defaultValue(options.flat, true);
        options.translucent = defaultValue(options.translucent, false);

        /**
         * DOC_TBA
         */
        this.material = undefined;

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, vs);

        /**
         * DOC_TBA
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);

        /**
         * DOC_TBA
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(false, false));

        // Non-derived members

        /**
         * DOC_TBA
         * @readonly
         */
        this.attributeName = attributeName;

        /**
         * DOC_TBA
         * @readonly
         */
        this.glslDatatype = glslDatatype;
    };

    /**
     * DOC_TBA
     */
    DebugAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return DebugAppearance;
});