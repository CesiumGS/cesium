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
     * Visualizes a vertex attribute by displaying it as a color for debugging.
     * <p>
     * Components for well-known unit-length vectors, i.e., <code>normal</code>,
     * <code>binormal</code>, and <code>tangent</code>, are scaled and biased
     * from [-1.0, 1.0] to (-1.0, 1.0).
     * </p>
     *
     * @alias DebugAppearance
     * @constructor
     *
     * @param {String} options.attributeName The name of the attribute to visualize.
     * @param {String} [options.glslDatatype='vec3'] The GLSL datatype of the attribute.  Supported datatypes are <code>float</code>, <code>vec2</code>, <code>vec3</code>, and <code>vec4</code>.
     * @param {String} [options.vertexShaderSource=undefined] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource=undefined] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState=undefined] Optional render state to override the default render state.
     *
     * @exception {DeveloperError} options.attributeName is required.
     * @exception {DeveloperError} options.glslDatatype must be float, vec2, vec3, or vec4.
     *
     * @example
     * var primitive = new Primitive({
     *   geometryInstances : // ...
     *   appearance : new DebugAppearance({
     *     attributeName : 'normal'
     *   })
     * });
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
            }

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