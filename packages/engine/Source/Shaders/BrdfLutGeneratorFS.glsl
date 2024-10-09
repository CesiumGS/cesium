in vec2 v_textureCoordinates;
const float M_PI = 3.141592653589793;

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
    float phi = 2.0 * M_PI * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (alphaRoughnessSquared - 1.0) * xi.y));
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    vec3 H = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
    vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(upVector, N));
    vec3 tangentY = cross(N, tangentX);
    return tangentX * H.x + tangentY * H.y + N * H.z;
}

/**
 * Estimate the geometric self-shadowing of the microfacets in a surface,
 * using the Smith Joint GGX visibility function.
 * Note: Vis = G / (4 * NdotL * NdotV)
 * see Eric Heitz. 2014. Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs. Journal of Computer Graphics Techniques, 3
 * see Real-Time Rendering. Page 331 to 336.
 * see https://google.github.io/filament/Filament.md.html#materialsystem/specularbrdf/geometricshadowing(specularg)
 *
 * @param {float} alphaRoughness The roughness of the material, expressed as the square of perceptual roughness.
 * @param {float} NdotL The cosine of the angle between the surface normal and the direction to the light source.
 * @param {float} NdotV The cosine of the angle between the surface normal and the direction to the camera.
 */
float smithVisibilityGGX(float alphaRoughness, float NdotL, float NdotV)
{
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;

    float GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
    float GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);

    float GGX = GGXV + GGXL; // 2.0 if NdotL = NdotV = 1.0
    if (GGX > 0.0)
    {
        return 0.5 / GGX; // 1/4 if NdotL = NdotV = 1.0
    }
    return 0.0;
}

vec2 integrateBrdf(float roughness, float NdotV)
{
    vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
    float A = 0.0;
    float B = 0.0;
    const int NumSamples = 1024;
    float alphaRoughness = roughness * roughness;
    for (int i = 0; i < NumSamples; i++)
    {
        vec2 xi = hammersley2D(i, NumSamples);
        vec3 H = importanceSampleGGX(xi, alphaRoughness, vec3(0.0, 0.0, 1.0));
        vec3 L = 2.0 * dot(V, H) * H - V;
        float NdotL = clamp(L.z, 0.0, 1.0);
        float NdotH = clamp(H.z, 0.0, 1.0);
        float VdotH = clamp(dot(V, H), 0.0, 1.0);
        if (NdotL > 0.0)
        {
            float G = smithVisibilityGGX(alphaRoughness, NdotL, NdotV);
            float G_Vis = 4.0 * G * VdotH * NdotL / NdotH;
            float Fc = pow(1.0 - VdotH, 5.0);
            A += (1.0 - Fc) * G_Vis;
            B += Fc * G_Vis;
        }
    }
    return vec2(A, B) / float(NumSamples);
}

void main()
{
    out_FragColor = vec4(integrateBrdf(v_textureCoordinates.y, v_textureCoordinates.x), 0.0, 1.0);
}
