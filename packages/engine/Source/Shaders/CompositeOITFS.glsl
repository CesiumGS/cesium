/**
 * Compositing for Weighted Blended Order-Independent Transparency. See:
 * - http://jcgt.org/published/0002/02/09/
 * - http://casual-effects.blogspot.com/2014/03/weighted-blended-order-independent.html
 */

uniform sampler2D u_opaque;
uniform sampler2D u_accumulation;
uniform sampler2D u_revealage;

in vec2 v_textureCoordinates;

void main()
{
    vec4 opaque = texture(u_opaque, v_textureCoordinates);
    vec4 accum = texture(u_accumulation, v_textureCoordinates);
    float r = texture(u_revealage, v_textureCoordinates).r;

#ifdef MRT
    vec4 transparent = vec4(accum.rgb / clamp(r, 1e-4, 5e4), accum.a);
#else
    vec4 transparent = vec4(accum.rgb / clamp(accum.a, 1e-4, 5e4), r);
#endif

    out_FragColor = (1.0 - transparent.a) * transparent + transparent.a * opaque;

    if (opaque != czm_backgroundColor)
    {
        out_FragColor.a = 1.0;
    }
}
