//This file is automatically rebuilt by the Cesium build process.
export default "varying vec2 v_textureCoordinates;\n\
const float M_PI = 3.141592653589793;\n\
\n\
float vdcRadicalInverse(int i)\n\
{\n\
    float r;\n\
    float base = 2.0;\n\
    float value = 0.0;\n\
    float invBase = 1.0 / base;\n\
    float invBi = invBase;\n\
    for (int x = 0; x < 100; x++)\n\
    {\n\
        if (i <= 0)\n\
        {\n\
            break;\n\
        }\n\
        r = mod(float(i), base);\n\
        value += r * invBi;\n\
        invBi *= invBase;\n\
        i = int(float(i) * invBase);\n\
    }\n\
    return value;\n\
}\n\
\n\
vec2 hammersley2D(int i, int N)\n\
{\n\
    return vec2(float(i) / float(N), vdcRadicalInverse(i));\n\
}\n\
\n\
vec3 importanceSampleGGX(vec2 xi, float roughness, vec3 N)\n\
{\n\
    float a = roughness * roughness;\n\
    float phi = 2.0 * M_PI * xi.x;\n\
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));\n\
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\
    vec3 H = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\n\
    vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);\n\
    vec3 tangentX = normalize(cross(upVector, N));\n\
    vec3 tangentY = cross(N, tangentX);\n\
    return tangentX * H.x + tangentY * H.y + N * H.z;\n\
}\n\
\n\
float G1_Smith(float NdotV, float k)\n\
{\n\
    return NdotV / (NdotV * (1.0 - k) + k);\n\
}\n\
\n\
float G_Smith(float roughness, float NdotV, float NdotL)\n\
{\n\
    float k = roughness * roughness / 2.0;\n\
    return G1_Smith(NdotV, k) * G1_Smith(NdotL, k);\n\
}\n\
\n\
vec2 integrateBrdf(float roughness, float NdotV)\n\
{\n\
    vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);\n\
    float A = 0.0;\n\
    float B = 0.0;\n\
    const int NumSamples = 1024;\n\
    for (int i = 0; i < NumSamples; i++)\n\
    {\n\
        vec2 xi = hammersley2D(i, NumSamples);\n\
        vec3 H = importanceSampleGGX(xi, roughness, vec3(0.0, 0.0, 1.0));\n\
        vec3 L = 2.0 * dot(V, H) * H - V;\n\
        float NdotL = clamp(L.z, 0.0, 1.0);\n\
        float NdotH = clamp(H.z, 0.0, 1.0);\n\
        float VdotH = clamp(dot(V, H), 0.0, 1.0);\n\
        if (NdotL > 0.0)\n\
        {\n\
            float G = G_Smith(roughness, NdotV, NdotL);\n\
            float G_Vis = G * VdotH / (NdotH * NdotV);\n\
            float Fc = pow(1.0 - VdotH, 5.0);\n\
            A += (1.0 - Fc) * G_Vis;\n\
            B += Fc * G_Vis;\n\
        }\n\
    }\n\
    return vec2(A, B) / float(NumSamples);\n\
}\n\
\n\
void main()\n\
{\n\
    gl_FragColor = vec4(integrateBrdf(v_textureCoordinates.y, v_textureCoordinates.x), 0.0, 1.0);\n\
}\n\
";
