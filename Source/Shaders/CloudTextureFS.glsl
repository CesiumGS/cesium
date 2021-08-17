uniform float u_noiseTextureLength;
uniform float u_noiseDetail;
varying vec2 v_position;

float random(vec3 p) {
    return fract(sin(p.x * p.y) + cos(p.z + p.y) + sin(p.z));
}
vec3 random3(vec3 p) {
    float dot1 = dot(p, vec3(127.1, 311.7, 932.8));
    float dot2 = dot(p, vec3(269.5, 183.3, 421.4));
    return fract(vec3(sin(dot1 - dot2), cos(dot1 * dot2), dot1 * dot2));
}

vec3 quintic(vec3 t) {
    vec3 t3 = t * t * t;
    vec3 t4 = t * t3;
    vec3 t5 = t * t4;
    return 6.0 * t5 - 15.0 * t4 + 10.0 * t3;
}

vec3 getPerlinDirection(vec3 p) {
    int i = int(random(p) * 16.0);
    if(i == 0) {
        return vec3(1, 1, 0);
    } else if(i == 1) {
        return vec3(-1, 1, 0);
    } else if(i == 2) {
        return vec3(1, -1, 0);
    } else if(i == 3) {
        return vec3(-1, -1, 0);
    } else if(i == 4) {
        return vec3(1, 0, 1);
    } else if(i == 5) {
        return vec3(-1, 0, 1);
    } else if(i == 6) {
        return vec3(1, 0, -1);
    } else if(i == 7) {
        return vec3(-1, 0, -1);
    } else if(i == 8) {
        return vec3(0, 1, 1);
    } else if(i == 9) {
        return vec3(0, -1, 1);
    } else if(i == 10) {
        return vec3(0, 1, -1);
    } else if(i == 11) {
        return vec3(0, -1, -1);
    } else if(i == 12) {
        return vec3(1, 1, 0);
    } else if(i == 13) {
        return vec3(-1, 1, 0);
    } else if(i == 14) {
        return vec3(0, -1, 1);
    } else {
        return vec3(0, -1, -1);
    } 
}

float perlinNoise(vec3 p) {
    float noise = 0.0;
    vec3 cell = floor(p);
    for(float z = 0.0; z <= 1.0; z++) {
        for(float y = 0.0; y <= 1.0; y++) {
            for(float x = 0.0; x <= 1.0; x++) {
                vec3 corner = cell + vec3(x, y, z);
                vec3 cornerToPoint = p - corner;
                vec3 randomDir = getPerlinDirection(corner);
                vec3 falloff = vec3(1.0) - quintic(abs(cornerToPoint));

                float value = dot(cornerToPoint, randomDir);
                noise += value * falloff.x * falloff.y * falloff.z;
            } 
        }
    }
    return noise;
}

// Frequency corresponds to cell size.
// The higher the frequency, the smaller the cell size.
vec3 getWorleyCellPoint(vec3 centerCell, vec3 offset, float freq) {
    vec3 cell = centerCell + offset;
    float modValue = (u_noiseTextureLength / u_noiseDetail);
    
    cell = mod(cell, modValue * freq);
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
                distance *= distance;
                if(distance < shortestDistance) {
                    shortestDistance = distance;
                }
            }
        }
    }

    return shortestDistance;
}

const float MAX_FBM_ITERATIONS = 10.0;
float perlinFBMNoise(vec3 p, float octaves, float scale) {
    float noise = 0.0;
    float freq = 1.0 * scale;
    float persistence = 0.8;
    for(float i = 0.0; i < MAX_FBM_ITERATIONS; i++) {
        if(i >= octaves) {
            break;
        }
        
        noise += perlinNoise(p * freq) * persistence;
        persistence *= 0.6;
        freq *= 2.0;
    }
    return noise;
}

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
    //position += vec3(u_noiseTextureLength) / 2.0;
    position /= u_noiseDetail;
    float worley0 = clamp(worleyFBMNoise(position, 3.0, 1.0), 0.0, 1.0);
    float worley1 = clamp(worleyFBMNoise(position, 3.0, 2.0), 0.0, 1.0);
    float worley2 = clamp(worleyFBMNoise(position, 3.0, 3.0), 0.0, 1.0);
    gl_FragColor = vec4(worley0, worley1, worley2, 1.0);
}