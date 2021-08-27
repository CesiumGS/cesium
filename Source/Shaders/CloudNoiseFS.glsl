uniform float u_noiseTextureLength;
uniform float u_noiseDetail;
uniform vec3 u_noiseOffset;
varying vec2 v_position;

float wrap(float value, float rangeLength) {
    if(value < 0.0) {
        float absValue = abs(value);
        float modValue = mod(absValue, rangeLength);
        return mod(rangeLength - modValue, rangeLength);
    }
    return mod(value, rangeLength);
}

vec3 wrapVec(vec3 value, float rangeLength) {
    return vec3(wrap(value.x, rangeLength),
                wrap(value.y, rangeLength),
                wrap(value.z, rangeLength));
}

vec3 random3(vec3 p) {
    float dot1 = dot(p, vec3(127.1, 311.7, 932.8));
    float dot2 = dot(p, vec3(269.5, 183.3, 421.4));
    return fract(vec3(sin(dot1 - dot2), cos(dot1 * dot2), dot1 * dot2));
}

// Frequency corresponds to cell size.
// The higher the frequency, the smaller the cell size.
vec3 getWorleyCellPoint(vec3 centerCell, vec3 offset, float freq) {
    vec3 cell = centerCell + offset;
    cell = wrapVec(cell, u_noiseTextureLength / u_noiseDetail);
    cell += floor(u_noiseOffset / u_noiseDetail);
    vec3 p = offset + random3(cell);
    return p;
}

float worleyNoise(vec3 p, float freq) {
    vec3 centerCell = floor(p * freq);
    vec3 pointInCell = fract(p * freq);
    float shortestDistance = 1000.0;

    for(float z = -1.0; z <= 1.0; z++) {
        for(float y = -1.0; y <= 1.0; y++) {
            for(float x = -1.0; x <= 1.0; x++) {
                vec3 offset = vec3(x, y, z);
                vec3 point = getWorleyCellPoint(centerCell, offset, freq);

                float distance = length(pointInCell - point);
                if(distance < shortestDistance) {
                    shortestDistance = distance;
                }
            }
        }
    }

    return shortestDistance;
}

const float MAX_FBM_ITERATIONS = 10.0;

float worleyFBMNoise(vec3 p, float octaves, float scale) {
    float noise = 0.0;
    float freq = 1.0;
    float persistence = 0.625;
    for(float i = 0.0; i < MAX_FBM_ITERATIONS; i++) {
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
    float z = floor(v_position.x / u_noiseTextureLength);
    float x = v_position.x - z * u_noiseTextureLength;
    vec3 position = vec3(x, v_position.y, z);
    position /= u_noiseDetail;
    float worley0 = clamp(worleyFBMNoise(position, 3.0, 1.0), 0.0, 1.0);
    float worley1 = clamp(worleyFBMNoise(position, 3.0, 2.0), 0.0, 1.0);
    float worley2 = clamp(worleyFBMNoise(position, 3.0, 3.0), 0.0, 1.0);
    gl_FragColor = vec4(worley0, worley1, worley2, 1.0);

}
