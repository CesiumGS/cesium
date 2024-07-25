precision highp float;

in vec2 v_textureCoordinates;

uniform float u_roughness;
uniform vec3 u_faceDirection;
uniform vec3 u_positionWC;
uniform mat4 u_enuToFixedFrame;
uniform sampler2D u_radianceTexture;
uniform vec3 u_radiiAndDynamicAtmosphereColor;

vec4 getCubeMapDirection(vec2 uv, vec3 faceDir) {
    vec2 scaledUV = uv * 2.0 - 1.0;

    if (faceDir.x != 0.0) {
        return vec4(faceDir.x, scaledUV.y, scaledUV.x * faceDir.x, 0.0);
    } else if (faceDir.y != 0.0) {
        return vec4(scaledUV.x, -faceDir.y, -scaledUV.y * faceDir.y, 0.0);
    } else {
        return vec4(scaledUV.x * faceDir.z, scaledUV.y, -faceDir.z, 0.0); 
    }
}

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
    float phi = 2.0 * czm_pi * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (alphaRoughnessSquared - 1.0) * xi.y));
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    vec3 H = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
    vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(upVector, N));
    vec3 tangentY = cross(N, tangentX);
    return tangentX * H.x + tangentY * H.y + N * H.z;
}

void main() {
    float height = length(u_positionWC);
    float ellipsoidHeight = height - u_radiiAndDynamicAtmosphereColor.y;
    float radius = max(u_radiiAndDynamicAtmosphereColor.x - height, 2.0 * ellipsoidHeight);

    vec3 direction = (u_enuToFixedFrame * getCubeMapDirection(v_textureCoordinates, u_faceDirection)).xyz * vec3(-1.0, -1.0, 1.0); // TODO: Where does this come from?
    vec3 normalizedDirection = normalize(direction);

    vec3 skyPositionWC = u_positionWC + normalizedDirection * radius;

    vec3 normal = normalize(direction);

    vec3 color = vec3(0.0);
    int samples = 512;
    float weight = 0.0;
    for (int i = 0; i < samples; ++i) {
        vec2 xi = hammersley2D(i, samples);
        vec3 H = importanceSampleGGX(xi, u_roughness, normal);
        vec3 L = 2.0 * dot(normal, H) * H - normal;

        float NdotL = max(dot(normal, L), 0.0);
        if (NdotL > 0.0) {
            color += texture(u_radianceTexture, xi).rgb * NdotL;
            weight += NdotL;
        }
    }
    out_FragColor = vec4(color / weight, 1.0);
    //out_FragColor = vec4(u_faceDirection, 1.0);
}
