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
        var getColor;

        // Well-known normalized vector attributes in VertexFormat
        if ((attributeName === 'normal') || (attributeName === 'binormal') | (attributeName === 'tangent')) {
            getColor = 'vec4 getColor() { return vec4((' + varyingName + ' + vec3(1.0)) * 0.5, 1.0); }\n';



//            gl_FragCoord.xy

        } else {
            // All other attributes, both well-known and custom
            if (attributeName === 'st') {
                glslDatatype = 'vec2';

                switch(glslDatatype) {
                    case 'float':
                        getColor = 'vec4 getColor() { return vec4(vec3(' + varyingName + '), 1.0); }\n';
                        break;
                    case 'vec2':
                        getColor = 'vec4 getColor() { return vec4(' + varyingName + ', 0.0, 1.0); }\n';
                        break;
                    case 'vec3':
                        getColor = 'vec4 getColor() { return vec4(' + varyingName + ', 1.0); }\n';
                        break;
                    case 'vec4':
                        getColor = 'vec4 getColor() { return ' + varyingName + '; }\n';
                        break;
                    default:
                        throw new DeveloperError('options.glslDatatype must be float, vec2, vec3, or vec4.');
                }
            }
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
            getColor + '\n' +
            'void main()\n' +
            '{\n' +
            'gl_FragColor = getColor();\n' +
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