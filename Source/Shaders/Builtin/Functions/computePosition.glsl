/**
 * Returns a position in model coordinates relative to eye taking into
 * account the current scene mode: 3D, 2D, or Columbus view.
 * <p>
 * This uses standard position attributes, <code>position3DHigh</code>, 
 * <code>position3DLow</code>, <code>position2DHigh</code>, and <code>position2DLow</code>, 
 * and should be used when writing a vertex shader for an {@link Appearance}.
 * </p>
 *
 * @name czm_computePosition
 * @glslFunction
 *
 * @returns {vec4} The position relative to eye.
 *
 * @example
 * vec4 p = czm_computePosition();
 * v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
 * gl_Position = czm_modelViewProjectionRelativeToEye * p;
 *
 * @see czm_translateRelativeToEye
 */
vec4 czm_computePosition();
