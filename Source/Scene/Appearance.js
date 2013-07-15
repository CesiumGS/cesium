/*global define*/
define([
        '../Core/defaultValue',
        '../Renderer/BlendingState',
        '../Renderer/CullFace'
    ], function(
        defaultValue,
        BlendingState,
        CullFace) {
    "use strict";

    /**
     * An appearance defines the full GLSL vertex and fragment shaders and the
     * render state used to draw a {@link Primitive}.  All appearances implement
     * this base <code>Appearance</code> interface.
     *
     * @alias Appearance
     * @constructor
     *
     * @see MaterialAppearance
     * @see EllipsoidSurfaceAppearance
     * @see PerInstanceColorAppearance
     * @see DebugAppearance
     */
    var Appearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The material used to determine the fragment color.  Unlike other {@link Appearance}
         * properties, this is not read-only, so an appearance's material can change on the fly.
         *
         * @type Material
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = options.material;

        /**
         * The GLSL source code for the vertex shader.
         *
         * @type String
         *
         * @readonly
         */
        this.vertexShaderSource = options.vertexShaderSource;

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account the {@link Appearance#material}.
         * Use {@link Appearance#getFragmentShaderSource} to get the full source.
         *
         * @type String
         *
         * @readonly
         */
        this.fragmentShaderSource = options.fragmentShaderSource;

        /**
         * The render state.  This is not the final {@link RenderState} instance; instead,
         * it can contain a subset of render state properties identical to <code>renderState</code>
         * passed to {@link Context#createRenderState}.
         *
         * @type Object
         *
         * @readonly
         */
        this.renderState = options.renderState;
    };

    /**
     * Procedurally creates the full GLSL fragment shader source for this appearance
     * taking into account {@link Appearance#fragmentShaderSource} and {@link Appearance#material}.
     *
     * @memberof Appearance
     *
     * @return String The full GLSL fragment shader source.
     */
    Appearance.prototype.getFragmentShaderSource = function() {
        var flat = this.flat ? '#define FLAT 1\n#line 0 \n' : '#line 0 \n';
        var faceForward = this.faceForward ? '#define FACE_FORWARD 1\n#line 0 \n' : '#line 0 \n';

        if (typeof this.material !== 'undefined') {
            return '#line 0\n' +
                this.material.shaderSource +
                flat +
                faceForward +
                this.fragmentShaderSource;
        }

        return flat + faceForward + this.fragmentShaderSource;
    };

    /**
     * @private
     */
    Appearance.getDefaultRenderState = function(translucent, closed) {
        var rs = {
            depthTest : {
                enabled : true
            }
        };

        if (translucent) {
            rs.depthMask = false;
            rs.blending = BlendingState.ALPHA_BLEND;
        }

        if (closed) {
            rs.cull = {
                enabled : true,
                face : CullFace.BACK
            };
        }

        return rs;
    };

    return Appearance;
});