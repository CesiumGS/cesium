uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main(void)
{
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);

    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    float luminance = dot(rgb, W);

    gl_FragColor = vec4(vec3(luminance), 1.0);
}


/*
uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;
    
// From http://www.geeks3d.com/20091216/geexlab-how-to-visualize-the-depth-buffer-in-glsl/
float LinearizeDepth(vec2 uv)
{
  float n = 10.0; // camera z near
  float f = 200000.0; // camera z far
  float z = texture2D(u_depthTexture, uv).x;
  return (2.0 * n) / (f + n - z * (f - n)); 
}

void main(void)
{
    if (v_textureCoordinates.x < 0.5)
    {
        gl_FragColor = vec4(texture2D(u_texture, v_textureCoordinates).rgb, 1.0);
    }
    else
    {
        gl_FragColor = vec4(vec3(LinearizeDepth(v_textureCoordinates)), 1.0);
    }
    
}
*/
