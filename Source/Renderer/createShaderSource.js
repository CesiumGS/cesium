/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError'
    ], function(
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Creates a GLSL shader source string by sending the input through three stages:
     * <ul>
     *   <li>A series of <code>#define</code> statements are created from <code>options.defines</code>.</li>
     *   <li>GLSL snippets in <code>options.sources</code> are combined with line numbers preserved using <code>#line</code>.</li>
     *   <li>
     *     Modifies the source for use with color-buffer picking if <code>options.pickColorQualifier</code> is defined.
     *     The returned fragment shader source sets <code>gl_FragColor</code> to a new <code>vec4</code> uniform or varying,
     *     <code>czm_pickColor</code>, but still discards if the original fragment shader discards or outputs an alpha of 0.0.
     *     This allows correct picking when a material contains transparent parts.
     *   </li>
     * </ul>
     *
     * @exports createShaderSource
     *
     * @param {Object} [options] Object with the following properties:
     * @param {String[]} [options.defines] An array of strings to combine containing GLSL identifiers to <code>#define</code>.
     * @param {String[]} [options.sources] An array of strings to combine containing GLSL code for the shader.
     * @param {String} [options.pickColorQualifier] The GLSL qualifier, <code>uniform</code> or <code>varying</code>, for the input <code>czm_pickColor</code>.  When defined, a pick fragment shader is generated.
     * @returns {String} The generated GLSL shader source.
     *
     * @exception {DeveloperError} options.pickColorQualifier must be 'uniform' or 'varying'.
     *
     * @example
     * // 1. Prepend #defines to a shader
     * var source = Cesium.createShaderSource({
     *   defines : ['WHITE'],
     *   sources : ['void main() { \n#ifdef WHITE\n gl_FragColor = vec4(1.0); \n#else\n gl_FragColor = vec4(0.0); \n#endif\n }']
     * });
     *
     * // 2. Modify a fragment shader for picking
     * var source = createShaderSource({
     *   sources : ['void main() { gl_FragColor = vec4(1.0); }'],
     *   pickColorQualifier : 'uniform'
     * });
     *
     * @private
     */
    function createShaderSource(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var defines = options.defines;
        var sources = options.sources;
        var pickColorQualifier = options.pickColorQualifier;

        if (defined(pickColorQualifier) && (pickColorQualifier !== 'uniform') && (pickColorQualifier !== 'varying')) {
            throw new DeveloperError('options.pickColorQualifier must be \'uniform\' or \'varying\'.');
        }

        var source = '';
        var i;
        var length;

        // Stage 1.  Prepend #defines for uber-shaders
        if (defined(defines) && defines.length > 0) {
            length = defines.length;
            for (i = 0; i < length; ++i) {
                if (defines[i].length !== 0) {
                    source += '#define ' + defines[i] + '\n';
                }
            }
        }

        // Stage 2.  Combine shader sources, generally for pseudo-polymorphism, e.g., czm_getMaterial.
        if (defined(sources) && sources.length > 0) {
            length = sources.length;
            for (i = 0; i < length; ++i) {
                // #line needs to be on its own line.
                source += '\n#line 0\n' + sources[i];
            }
        }

        // Stage 3.  Replace main() for picked if desired.
        if (defined(pickColorQualifier)) {
            var renamedFS = source.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_old_main()');
            var pickMain =
                pickColorQualifier + ' vec4 czm_pickColor; \n' +
                'void main() \n' +
                '{ \n' +
                '    czm_old_main(); \n' +
                '    if (gl_FragColor.a == 0.0) { \n' +
                '        discard; \n' +
                '    } \n' +
                '    gl_FragColor = czm_pickColor; \n' +
                '}';

            source = renamedFS + '\n' + pickMain;
        }

        return source;
    }

    return createShaderSource;
});
