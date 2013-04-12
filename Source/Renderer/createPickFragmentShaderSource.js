/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Modifies a fragment shader for use with color-buffer picking.  The returned fragment shader source
     * sets <code>gl_FragColor</code> to a new <code>vec4</code> uniform, <code>u_czm_pickColor</code>, but
     * discards if the original fragment shader discards or outputs an alpha of 0.0.  This allows correct
     * picking when a material contains transparent parts.
     *
     * @exports createPickFragmentShaderSource
     *
     * @param {String} fragmentShaderSource The original fragment shader source.
     *
     * @returns {String} The modified fragment shader source.
     *
     * @exception {DeveloperError} fragmentShaderSource is required.
     *
     * @example
     * var pickFS = createPickFragmentShaderSource('void main() { gl_FragColor = vec4(1.0); }');
     */
    function createPickFragmentShaderSource(fragmentShaderSource) {
        if (typeof fragmentShaderSource === 'undefined') {
            throw new DeveloperError('fragmentShaderSource is required.');
        }

        var renamedFS = fragmentShaderSource.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_old_main()');
        var pickMain =
            'uniform vec4 u_czm_pickColor; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_old_main(); \n' +
            '    if (gl_FragColor.a == 0.0) { \n' +
            '        discard; \n' +
            '    } \n' +
            '    gl_FragColor = u_czm_pickColor; \n' +
            '}';
        return renamedFS + '\n' + pickMain;
    }

    return createPickFragmentShaderSource;
});
