/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Renderer/createShaderSource',
        './BlendingState',
        './CullFace'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        createShaderSource,
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
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         */
        this.material = options.material;

        /**
         * When <code>true</code>, the geometry is expected to appear translucent.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.translucent = defaultValue(options.translucent, true);

        this._vertexShaderSource = options.vertexShaderSource;
        this._fragmentShaderSource = options.fragmentShaderSource;
        this._renderState = options.renderState;
        this._closed = defaultValue(options.closed, false);
    };

    defineProperties(Appearance.prototype, {
        /**
         * The GLSL source code for the vertex shader.
         *
         * @memberof Appearance.prototype
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
         * source is built procedurally taking into account the {@link Appearance#material}.
         * Use {@link Appearance#getFragmentShaderSource} to get the full source.
         *
         * @memberof Appearance.prototype
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
         * @memberof Appearance.prototype
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
         * @memberof Appearance.prototype
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
        }
    });

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