//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Compositing for Weighted Blended Order-Independent Transparency. See:\n\
 * - http://jcgt.org/published/0002/02/09/\n\
 * - http://casual-effects.blogspot.com/2014/03/weighted-blended-order-independent.html\n\
 */\n\
\n\
uniform sampler2D u_opaque;\n\
uniform sampler2D u_accumulation;\n\
uniform sampler2D u_revealage;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    vec4 opaque = texture2D(u_opaque, v_textureCoordinates);\n\
    vec4 accum = texture2D(u_accumulation, v_textureCoordinates);\n\
    float r = texture2D(u_revealage, v_textureCoordinates).r;\n\
\n\
#ifdef MRT\n\
    vec4 transparent = vec4(accum.rgb / clamp(r, 1e-4, 5e4), accum.a);\n\
#else\n\
    vec4 transparent = vec4(accum.rgb / clamp(accum.a, 1e-4, 5e4), r);\n\
#endif\n\
\n\
    gl_FragColor = (1.0 - transparent.a) * transparent + transparent.a * opaque;\n\
\n\
    if (opaque != czm_backgroundColor)\n\
    {\n\
        gl_FragColor.a = 1.0;\n\
    }\n\
}\n\
";
});