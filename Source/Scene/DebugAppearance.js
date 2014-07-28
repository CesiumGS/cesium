/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        './Appearance'
    ], function(
        defaultValue,
        defined,
        defineProperties,
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
     * @param {Object} options Object with the following properties:
     * @param {String} options.attributeName The name of the attribute to visualize.
     * @param {String} [options.glslDatatype='vec3'] The GLSL datatype of the attribute.  Supported datatypes are <code>float</code>, <code>vec2</code>, <code>vec3</code>, and <code>vec4</code>.
     * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState] Optional render state to override the default render state.
     *
     * @exception {DeveloperError} options.glslDatatype must be float, vec2, vec3, or vec4.
     *
     * @example
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : // ...
     *   appearance : new Cesium.DebugAppearance({
     *     attributeName : 'normal'
     *   })
     * });
     */
    var DebugAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var attributeName = options.attributeName;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(attributeName)) {
            throw new DeveloperError('options.attributeName is required.');
        }
        //>>includeEnd('debug');

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
         * When <code>true</code>, the geometry is expected to appear translucent.
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.translucent = defaultValue(options.translucent, false);

        this._vertexShaderSource = defaultValue(options.vertexShaderSource, vs);
        this._fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);
        this._renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(false, false));
        this._closed = defaultValue(options.closed, false);

        // Non-derived members

        this._attributeName = attributeName;
        this._glslDatatype = glslDatatype;
    };

    defineProperties(DebugAppearance.prototype, {
        /**
         * The GLSL source code for the vertex shader.
         *
         * @memberof DebugAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        vertexShaderSource : {
            get : function() {
                return this._vertexShaderSource;
            }
        },

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account the {@link DebugAppearance#material}.
         * Use {@link DebugAppearance#getFragmentShaderSource} to get the full source.
         *
         * @memberof DebugAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        fragmentShaderSource : {
            get : function() {
                return this._fragmentShaderSource;
            }
        },

        /**
         * The WebGL fixed-function state to use when rendering the geometry.
         *
         * @memberof DebugAppearance.prototype
         *
         * @type {Object}
         * @readonly
         */
        renderState : {
            get : function() {
                return this._renderState;
            }
        },

        /**
         * When <code>true</code>, the geometry is expected to be closed.
         *
         * @memberof DebugAppearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        closed : {
            get : function() {
                return this._closed;
            }
        },

        /**
         * The name of the attribute being visualized.
         *
         * @memberof DebugAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        attributeName : {
            get : function() {
                return this._attributeName;
            }
        },

        /**
         * The GLSL datatype of the attribute being visualized.
         *
         * @memberof DebugAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        glslDatatype : {
            get : function() {
                return this._glslDatatype;
            }
        }
    });

    /**
     * Returns the full GLSL fragment shader source, which for {@link DebugAppearance} is just
     * {@link DebugAppearance#fragmentShaderSource}.
     *
     * @function
     *
     * @returns String The full GLSL fragment shader source.
     */
    DebugAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link DebugAppearance#translucent}.
     *
     * @function
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    DebugAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final render state instance; instead,
     * it can contain a subset of render state properties identical to the render state
     * created in the context.
     *
     * @function
     *
     * @returns {Object} The render state.
     */
    DebugAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return DebugAppearance;
});