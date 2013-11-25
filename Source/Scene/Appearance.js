/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Renderer/BlendingState',
        '../Renderer/CullFace',
        '../Renderer/createShaderSource'
    ], function(
        clone,
        defaultValue,
        defined,
        BlendingState,
        CullFace,
        createShaderSource) {
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
     * @see PolylineColorAppearance
     * @see PolylineMaterialAppearance
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

        /**
         * When <code>true</code>, the geometry is expected to appear translucent.
         *
         * @readonly
         *
         * @default true
         */
        this.translucent = defaultValue(options.translucent, true);

        /**
         * When <code>true</code>, the geometry is expected to be closed.
         *
         * @readonly
         *
         * @default false
         */
        this.closed = defaultValue(options.closed, false);
    };

    /**
     * Procedurally creates the full GLSL fragment shader source for this appearance
     * taking into account {@link Appearance#fragmentShaderSource} and {@link Appearance#material}.
     *
     * @memberof Appearance
     *
     * @returns {String} The full GLSL fragment shader source.
     */
    Appearance.prototype.getFragmentShaderSource = function() {
        return createShaderSource({
            defines : [this.flat ? 'FLAT' : '', this.faceForward ? 'FACE_FORWARD' : ''],
            sources : [defined(this.material) ? this.material.shaderSource : '', this.fragmentShaderSource]
        });
    };

    /**
     * Determines if the geometry is translucent based on {@link Appearance#translucent} and {@link Material#isTranslucent}.
     *
     * @memberof Appearance
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    Appearance.prototype.isTranslucent = function() {
        return (defined(this.material) && this.material.isTranslucent()) || (!defined(this.material) && this.translucent);
    };

    /**
     * Creates a render state.  This is not the final {@link RenderState} instance; instead,
     * it can contain a subset of render state properties identical to <code>renderState</code>
     * passed to {@link Context#createRenderState}.
     *
     * @memberof Appearance
     *
     * @returns {Object} The render state.
     */
    Appearance.prototype.getRenderState = function() {
        var translucent = this.isTranslucent();
        var rs = clone(this.renderState, false);
        if (translucent) {
            rs.depthMask = false;
            rs.blending = BlendingState.ALPHA_BLEND;
        } else {
            rs.depthMask = true;
        }
        return rs;
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