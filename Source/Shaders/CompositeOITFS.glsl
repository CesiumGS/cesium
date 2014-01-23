uniform sampler2D u_opaque;
uniform sampler2D u_accumulation;
uniform sampler2D u_revealage;

varying vec2 v_textureCoordinates;

void main()
{
    vec4 opaque = texture2D(u_opaque, v_textureCoordinates);
    vec4 accum = texture2D(u_accumulation, v_textureCoordinates);
    float r = texture2D(u_revealage, v_textureCoordinates).r;
    vec4 transparent = vec4(accum.rgb / clamp(r, 1e-4, 5e4), accum.a);
    transparent.a = 1.0 - transparent.a;
    
    if (all(equal(transparent, vec4(0.0, 0.0, 0.0, 1.0))))
    {
        gl_FragColor = opaque;
    }
    else
    {
        gl_FragColor = transparent.a * transparent + (1.0 - transparent.a) * opaque;
        
        //gl_FragColor = transparent.a * transparent + opaque;
        //gl_FragColor = vec4(transparent.a * transparent.rgb + opaque.rgb, 1.0);
    }
}