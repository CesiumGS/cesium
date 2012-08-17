uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;

const float n = 10.0; // camera z near
const float f = 200000.0; // camera z far

// From http://www.geeks3d.com/20091216/geexlab-how-to-visualize-the-depth-buffer-in-glsl/
float LinearizeDepth(vec2 uv)
{
  float z = texture2D(u_depthTexture, uv).x;
  return (2.0 * n) / (f + n - z * (f - n)); 
}

void main(void)
{
    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    float depth = LinearizeDepth(v_textureCoordinates);
    depth = pow(depth, 2.0);
    vec3 fogColor = vec3(0.8, 0.8, 0.6);
    rgb = mix(rgb, fogColor, depth);
    gl_FragColor = vec4(rgb, 1.0);
} 
