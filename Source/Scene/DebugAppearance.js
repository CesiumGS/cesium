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
         * This property is part of the {@link Appearance} interface, but is not
         * used by {@link DebugAppearance} since a fully custom fragment shader is used.
         *
         * @type Material
         *
         * @default undefined
         */
        this.material = undefined;

        /**
         * The GLSL source code for the vertex shader.
         *
         * @type String
         *
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, vs);

        /**
         * The GLSL source code for the fragment shader.
         *
         * @type String
         *
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);

        /**
         * The render state.  This is not the final {@link RenderState} instance; instead,
         * it can contain a subset of render state properties identical to <code>renderState</code>
         * passed to {@link Context#createRenderState}.
         *
         * @type Object
         *
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(false, false));

        // Non-derived members

        /**
         * The name of the attribute being visualized.
         *
         * @type String
         *
         * @readonly
         */
        this.attributeName = attributeName;

        /**
         * The GLSL datatype of the attribute being visualized.
         *
         * @type String
         *
         * @readonly
         */
        this.glslDatatype = glslDatatype;
    };

    /**
     * Returns the full GLSL fragment shader source, which for {@link DebugAppearance} is just
     * {@link DebugAppearance#fragmentShaderSource}.
     *
     * @memberof DebugAppearance
     *
     * @return String The full GLSL fragment shader source.
     */
    DebugAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return DebugAppearance;
});