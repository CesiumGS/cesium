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
     * DOC_TBA
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
         * DOC_TBA
         */
        this.material = options.material;

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexShaderSource = options.vertexShaderSource;

        /**
         * DOC_TBA
         * @readonly
         */
        this.fragmentShaderSource = options.fragmentShaderSource;

        /**
         * DOC_TBA
         * @readonly
         */
        this.renderState = options.renderState;
    };

    /**
     * DOC_TBA
     */
    Appearance.prototype.getFragmentShaderSource = function() {
        var flat = this.flat ? '#define FLAT \n#line 0 \n' : '#line 0 \n';
        var faceForward = this.faceForward ? '#define FACE_FORWARD \n#line 0 \n' : '#line 0 \n';

        if (typeof this.material !== 'undefined') {
            return '#line 0\n' +
                this.material.shaderSource +
                flat +
                this.fragmentShaderSource;
        }

        return flat + faceForward + this.fragmentShaderSource;
    };

    /**
     * DOC_TBA
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