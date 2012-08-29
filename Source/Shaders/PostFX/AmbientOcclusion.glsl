uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;

const float n = 10.0; // camera z near
const float f = 200000.0; // camera z far

// TODO: do not assume full-screen
vec2 u_step = vec2(1.0 / float(agi_viewport.z), 1.0 / float(agi_viewport.w));

// From http://www.geeks3d.com/20091216/geexlab-how-to-visualize-the-depth-buffer-in-glsl/
float LinearizeDepth(vec2 uv)
{
  float z = texture2D(u_depthTexture, uv).x;
  return (2.0 * n) / (f + n - z * (f - n)); 
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main(void)
{
    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    float depth = LinearizeDepth(v_textureCoordinates);
    vec3 startPos = vec3(v_textureCoordinates, depth);
    float stepSize = length(u_step);
    float depthScale = 1.0 - depth;
    
    float accum = 0.0;
    const int numSamples = 16;
    for (int i = 0; i < numSamples; i++) {
        float xDirection = rand(startPos.yz * float(i));
        float yDirection = rand(startPos.zy * float(i));
        float zDirection = rand(startPos.zx * float(i));
        vec3 direction = normalize( vec3(xDirection, yDirection, zDirection) - vec3(0.5) );
        vec3 newPos = startPos + direction * stepSize * 5.0 * depthScale;
        float newDepth = newPos.z;
        float textureDepth = LinearizeDepth(newPos.xy);
        float difference = newDepth - textureDepth;
        if (difference > 0.0) {
            //occluded
            accum += 1.0;
        }
    }
    accum /= float(numSamples);
    accum = (1.0 - accum) + 0.3;
    
    rgb = rgb * vec3(accum);
    gl_FragColor = vec4(rgb, 1.0);
} 
