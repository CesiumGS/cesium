//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec3 u_noiseTextureDimensions;\n\
uniform float u_noiseDetail;\n\
uniform vec3 u_noiseOffset;\n\
in vec2 v_position;\n\
\n\
float wrap(float value, float rangeLength) {\n\
    if(value < 0.0) {\n\
        float absValue = abs(value);\n\
        float modValue = mod(absValue, rangeLength);\n\
        return mod(rangeLength - modValue, rangeLength);\n\
    }\n\
    return mod(value, rangeLength);\n\
}\n\
\n\
vec3 wrapVec(vec3 value, float rangeLength) {\n\
    return vec3(wrap(value.x, rangeLength),\n\
                wrap(value.y, rangeLength),\n\
                wrap(value.z, rangeLength));\n\
}\n\
\n\
vec3 random3(vec3 p) {\n\
    float dot1 = dot(p, vec3(127.1, 311.7, 932.8));\n\
    float dot2 = dot(p, vec3(269.5, 183.3, 421.4));\n\
    return fract(vec3(sin(dot1 - dot2), cos(dot1 * dot2), dot1 * dot2));\n\
}\n\
\n\
// Frequency corresponds to cell size.\n\
// The higher the frequency, the smaller the cell size.\n\
vec3 getWorleyCellPoint(vec3 centerCell, vec3 offset, float freq) {\n\
    float textureSliceWidth = u_noiseTextureDimensions.x;\n\
    vec3 cell = centerCell + offset;\n\
    cell = wrapVec(cell, textureSliceWidth / u_noiseDetail);\n\
    cell += floor(u_noiseOffset / u_noiseDetail);\n\
    vec3 p = offset + random3(cell);\n\
    return p;\n\
}\n\
\n\
float worleyNoise(vec3 p, float freq) {\n\
    vec3 centerCell = floor(p * freq);\n\
    vec3 pointInCell = fract(p * freq);\n\
    float shortestDistance = 1000.0;\n\
\n\
    for(float z = -1.0; z <= 1.0; z++) {\n\
        for(float y = -1.0; y <= 1.0; y++) {\n\
            for(float x = -1.0; x <= 1.0; x++) {\n\
                vec3 offset = vec3(x, y, z);\n\
                vec3 point = getWorleyCellPoint(centerCell, offset, freq);\n\
\n\
                float distance = length(pointInCell - point);\n\
                if(distance < shortestDistance) {\n\
                    shortestDistance = distance;\n\
                }\n\
            }\n\
        }\n\
    }\n\
\n\
    return shortestDistance;\n\
}\n\
\n\
const float MAX_FBM_ITERATIONS = 10.0;\n\
\n\
float worleyFBMNoise(vec3 p, float octaves, float scale) {\n\
    float noise = 0.0;\n\
    float freq = 1.0;\n\
    float persistence = 0.625;\n\
    for(float i = 0.0; i < MAX_FBM_ITERATIONS; i++) {\n\
        if(i >= octaves) {\n\
            break;\n\
        }\n\
\n\
        noise += worleyNoise(p * scale, freq * scale) * persistence;\n\
        persistence *= 0.5;\n\
        freq *= 2.0;\n\
    }\n\
    return noise;\n\
}\n\
\n\
void main() {\n\
    float textureSliceWidth = u_noiseTextureDimensions.x;\n\
    float inverseNoiseTextureRows = u_noiseTextureDimensions.z;\n\
    float x = mod(v_position.x, textureSliceWidth);\n\
    float y = mod(v_position.y, textureSliceWidth);\n\
    float sliceRow = floor(v_position.y / textureSliceWidth);\n\
    float z = floor(v_position.x / textureSliceWidth) + sliceRow * inverseNoiseTextureRows * textureSliceWidth;\n\
\n\
    vec3 position = vec3(x, y, z);\n\
    position /= u_noiseDetail;\n\
    float worley0 = clamp(worleyFBMNoise(position, 3.0, 1.0), 0.0, 1.0);\n\
    float worley1 = clamp(worleyFBMNoise(position, 3.0, 2.0), 0.0, 1.0);\n\
    float worley2 = clamp(worleyFBMNoise(position, 3.0, 3.0), 0.0, 1.0);\n\
    out_FragColor = vec4(worley0, worley1, worley2, 1.0);\n\
}\n\
";
