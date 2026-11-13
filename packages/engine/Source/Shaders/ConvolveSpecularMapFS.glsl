precision highp float;

in vec3 v_textureCoordinates;

uniform float u_roughness;
uniform samplerCube u_radianceTexture;
uniform vec3 u_faceDirection;

float vdcRadicalInverse(int i)
{
    float r;
    float base = 2.0;
    float value = 0.0;
    float invBase = 1.0 / base;
    float invBi = invBase;
    for (int x = 0; x < 100; x++)
    {
        if (i <= 0)
        {
            break;
        }
        r = mod(float(i), base);
        value += r * invBi;
        invBi *= invBase;
        i = int(float(i) * invBase);
    }
    return value;
}

vec2 hammersley2D(int i, int N)
{
    return vec2(float(i) / float(N), vdcRadicalInverse(i));
}

vec3 importanceSampleGGX(vec2 xi, float alphaRoughness, vec3 N)
{
    float alphaRoughnessSquared = alphaRoughness * alphaRoughness;
    float phi = czm_twoPi * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (alphaRoughnessSquared - 1.0) * xi.y));
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    vec3 H = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
    vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(upVector, N));
    vec3 tangentY = cross(N, tangentX);
    return tangentX * H.x + tangentY * H.y + N * H.z;
}

// Sample count is relatively low for the sake of performance, but should still be enough to prevent artifacting in lower roughnesses
const int samples = 128;

void main() {
    vec3 normal = u_faceDirection;
    vec3 V = normalize(v_textureCoordinates);
    float roughness = u_roughness;

    vec4 color = vec4(0.0);
    float weight = 0.0;
    for (int i = 0; i < samples; ++i) {
            vec2 xi = hammersley2D(i, samples);
            vec3 H = importanceSampleGGX(xi, roughness, V);
            vec3 L = 2.0 * dot(V, H) * H - V; // reflected vector

            float NdotL = max(dot(V, L), 0.0);
            if (NdotL > 0.0) {
                color += vec4(czm_textureCube(u_radianceTexture, L).rgb, 1.0) * NdotL;
                weight += NdotL;
            }
        }
    out_FragColor = color / weight;
}
