uniform sampler2D u_opaque;
uniform sampler2D u_accumulation;
uniform sampler2D u_revealage;

varying vec2 v_textureCoordinates;

void main()
{
    vec4 opaque = texture2D(u_opaque, v_textureCoordinates);
    vec4 accum = texture2D(u_accumulation, v_textureCoordinates);
    float r = texture2D(u_revealage, v_textureCoordinates).r;
    
#ifdef MRT
    vec4 transparent = vec4(accum.rgb / clamp(r, 1e-4, 5e4), accum.a);
#else
    vec4 transparent = vec4(accum.rgb / clamp(accum.a, 1e-4, 5e4), r);
#endif
    
    transparent.a = 1.0 - transparent.a;
    
    // 0.0 if the transparent color is the clear color, 1.0 if the transparent color should be blended with the opaque color.
    float t = ceil(clamp(abs(transparent.r + transparent.g + transparent.b + transparent.a - 1.0), 0.0, 1.0));
    vec4 blended = transparent.a * transparent + (1.0 - transparent.a) * opaque;
    gl_FragColor = mix(opaque, blended, t);
}