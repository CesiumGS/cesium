uniform sampler2D czm_color;

varying vec2 v_textureCoordinates;

// TODO: expose as uniform
const float frequency = 0.001;

// TODO: Make czm_ function.
// From http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
float rand(vec2 co)
{
    return fract(sin(dot(co.xy ,vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void)
{
    float noiseValue = rand(v_textureCoordinates + sin(czm_frameNumber * frequency)) * 0.1;
    vec3 rgb = texture2D(czm_color, v_textureCoordinates).rgb;
    const vec3 green = vec3(0.0, 1.0, 0.0);

    gl_FragColor = vec4((noiseValue + rgb) * green, 1.0);
}