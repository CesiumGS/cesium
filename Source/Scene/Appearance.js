/*global define*/
define([
        '../Core/clone',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        './BlendingState',
        './CullFace'
    ], function(
        clone,
        combine,
        defaultValue,
        defined,
        defineProperties,
        BlendingState,
        CullFace) {
    "use strict";

    /**
     * An appearance defines the full GLSL vertex and fragment shaders and the
     * render state used to draw a {@link Primitive}.  All appearances implement
     * this base <code>Appearance</code> interface.
     *
     * @interface
     */
    var Appearance = function() {};

    /**
     * Procedurally creates the full GLSL fragment shader source for this appearance
     * taking into account {@link Appearance#fragmentShaderSource} and {@link Appearance#material}.
     *
     * @returns {String} The full GLSL fragment shader source.
     */
    Appearance.prototype.getFragmentShaderSource = function() {};

    /**
     * Determines if the geometry is translucent based on {@link Appearance#translucent} and {@link Material#isTranslucent}.
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    Appearance.prototype.isTranslucent = function() {};

    /**
     * Creates a render state.  This is not the final render state instance; instead,
     * it can contain a subset of render state properties identical to the render state
     * created in the context.
     *
     * @returns {Object} The render state.
     */
    Appearance.prototype.getRenderState = function() {};

    return Appearance;
});
