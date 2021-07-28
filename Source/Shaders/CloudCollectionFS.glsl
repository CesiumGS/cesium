varying vec2 v_offset;
varying vec3 v_positionHigh;
varying vec3 v_positionLow;
varying vec3 v_position;

vec3 random3(vec3 p) {
    float dot1 = dot(p, vec3(127.1, 311.7, 932.8));
    float dot2 = dot(p, vec3(269.5, 183.3, 421.4));
    return fract(vec3(sin(dot1 - dot2), cos(dot1 * dot2), dot1 * dot2));
}

// "Frequency" corresponds to smaller cell sizes.
vec3 getCellPoint(vec3 cell, float freq) {
    vec3 p = cell + random3(cell);
    return p / freq;
}

float perlinNoise(vec3 p) {

}

float worleyNoise(vec3 p, float freq) {
    vec3 centerCell = floor(p * freq);
    float shortestDistance = 10.0 / freq;

    for(float z = -1.0; z <= 1.0; z++) {
        for(float y = -1.0; y <= 1.0; y++) {
            for(float x = -1.0; x <= 1.0; x++) {
                vec3 cell = centerCell + vec3(x, y, z);
                vec3 point = getCellPoint(cell, freq);

                // compare to previous distances
                float distance = length(p - point);
                if(distance < shortestDistance) {
                    shortestDistance = distance;
                }
            }
        }
    }

    return shortestDistance * freq;
}

// This function layers worley noise in the same away that
// Fractal Brownian Motion noise (FBM) is generated.
const float MAX_ITERATIONS = 10.0;
float layeredWorleyNoise(vec3 p, float octaves, float scale) {
    float noise = 0.0;
    float freq = 1.0;
    float persistence = 0.625;
    for(float i = 0.0; i < MAX_ITERATIONS; i++) {
        if(i >= octaves) {
            break;
        }
        
        noise += worleyNoise(p * scale, freq * scale) * persistence;
        persistence *= 0.5;
        freq *= 2.0;
    }
    return noise;
}

void main() {
    vec2 uv = v_offset;
    vec3 point = v_positionHigh + v_positionLow + vec3(uv, 0.0);
    float noise = layeredWorleyNoise(v_position, 3.0, 0.25);
    noise = clamp(noise, 0.0, 1.0);
    vec4 color = (1.0 - noise) * vec4(0.0, 1.0, 1.0, 1.0);
    gl_FragColor = color;
}