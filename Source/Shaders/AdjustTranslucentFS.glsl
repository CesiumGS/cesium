#ifdef MRT
#extension GL_EXT_draw_buffers : enable
#endif

uniform vec4 u_bgColor;
uniform sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;

void main()
{
    if (texture2D(u_depthTexture, v_textureCoordinates).r < 1.0)
    {
#ifdef MRT
        gl_FragData[0] = u_bgColor;
        gl_FragData[1] = vec4(u_bgColor.a);
#else
        gl_FragColor = u_bgColor;
#endif
        return;
    }
    
    discard;
}
