#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    precision highp int;
#else
    precision mediump float;
    precision mediump int;
    #define highp mediump
#endif

#define USE_IBL_LIGHTING
#define COMPUTE_POSITION_WC_ATMOSPHERE
#define DIFFUSE_IBL
#define CUSTOM_SPHERICAL_HARMONICS
#define SPECULAR_IBL
#define CUSTOM_SPECULAR_IBL
#define POLYGON_OFFSET
#define HAS_ATMOSPHERE
#define COMPUTE_POSITION_WC_ATMOSPHERE
#define HAS_SRGB_COLOR
#define HAS_COLOR_0
#define PRIMITIVE_TYPE_POINTS
#define METADATA_PICKING_VALUE_TYPE float
#define METADATA_PICKING_VALUE_STRING 0.0
#define METADATA_PICKING_VALUE_COMPONENT_X 0.0
#define METADATA_PICKING_VALUE_COMPONENT_Y 0.0
#define METADATA_PICKING_VALUE_COMPONENT_Z 0.0
#define METADATA_PICKING_VALUE_COMPONENT_W 0.0
#define HAS_CUSTOM_FRAGMENT_SHADER
#define SET_CUSTOM_FRAG_COLOR_DIRECTLY
#define CUSTOM_SHADER_REPLACE_MATERIAL
#define LIGHTING_UNLIT
#define OES_texture_float_linear

#define OES_texture_float


#line 0
layout(location = 0) out vec4 out_FragColor;







const float czm_infinity = 5906376272000.0;  







struct czm_ray
{
    vec3 origin;
    vec3 direction;
};







struct czm_raySegment
{
    float start;
    float stop;
};







const czm_raySegment czm_emptyRaySegment = czm_raySegment(-czm_infinity, -czm_infinity);







const czm_raySegment czm_fullRaySegment = czm_raySegment(0.0, czm_infinity);







const float czm_epsilon7 = 0.0000001;

uniform vec3 czm_atmosphereRayleighCoefficient;
uniform vec3 czm_atmosphereMieCoefficient;
uniform float czm_atmosphereMieScaleHeight;
uniform float czm_atmosphereRayleighScaleHeight;






float czm_approximateTanh(float x) {
    float x2 = x * x;
    return max(-1.0, min(1.0, x * (27.0 + x2) / (27.0 + 9.0 * x2)));
}












czm_raySegment czm_raySphereIntersectionInterval(czm_ray ray, vec3 center, float radius)
{
    vec3 o = ray.origin;
    vec3 d = ray.direction;

    vec3 oc = o - center;

    float a = dot(d, d);
    float b = 2.0 * dot(d, oc);
    float c = dot(oc, oc) - (radius * radius);

    float det = (b * b) - (4.0 * a * c);

    if (det < 0.0) {
        return czm_emptyRaySegment;
    }

    float sqrtDet = sqrt(det);

    float t0 = (-b - sqrtDet) / (2.0 * a);
    float t1 = (-b + sqrtDet) / (2.0 * a);

    czm_raySegment result = czm_raySegment(t0, t1);
    return result;
}

uniform float czm_gamma;









float czm_maximumComponent(vec2 v)
{
    return max(v.x, v.y);
}
float czm_maximumComponent(vec3 v)
{
    return max(max(v.x, v.y), v.z);
}
float czm_maximumComponent(vec4 v)
{
    return max(max(max(v.x, v.y), v.z), v.w);
}






















struct czm_modelMaterial {
    vec4 baseColor;
    vec3 diffuse;
    float alpha;
    vec3 specular;
    float roughness;
    vec3 normalEC;
    float occlusion;
    vec3 emissive;
#ifdef CUSTOM_SHADER_REPLACE_MATERIAL
    vec4 colorOverride;
#endif
#ifdef USE_SPECULAR
    float specularWeight;
#endif
#ifdef USE_ANISOTROPY
    vec3 anisotropicT;
    vec3 anisotropicB;
    float anisotropyStrength;
#endif
#ifdef USE_CLEARCOAT
    float clearcoatFactor;
    float clearcoatRoughness;
    vec3 clearcoatNormal;
    
#endif
};
















const float czm_pi = 3.141592653589793;

uniform float czm_atmosphereLightIntensity;
uniform float czm_atmosphereMieAnisotropy;
uniform vec3 czm_viewerPositionWC;

















const vec4 K_HSB2RGB = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);

vec3 czm_HSBToRGB(vec3 hsb)
{
    vec3 p = abs(fract(hsb.xxx + K_HSB2RGB.xyz) * 6.0 - K_HSB2RGB.www);
    return hsb.z * mix(K_HSB2RGB.xxx, clamp(p - K_HSB2RGB.xxx, 0.0, 1.0), hsb.y);
}


















const vec4 K_RGB2HSB = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);

vec3 czm_RGBToHSB(vec3 rgb)
{
    vec4 p = mix(vec4(rgb.bg, K_RGB2HSB.wz), vec4(rgb.gb, K_RGB2HSB.xy), step(rgb.b, rgb.g));
    vec4 q = mix(vec4(p.xyw, rgb.r), vec4(rgb.r, p.yzx), step(p.x, rgb.r));

    float d = q.x - min(q.w, q.y);
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + czm_epsilon7)), d / (q.x + czm_epsilon7), q.x);
}
















void czm_computeScattering(
    czm_ray primaryRay,
    float primaryRayLength,
    vec3 lightDirection,
    float atmosphereInnerRadius,
    out vec3 rayleighColor,
    out vec3 mieColor,
    out float opacity
) {
    const float ATMOSPHERE_THICKNESS = 111e3; 
    const int PRIMARY_STEPS_MAX = 16; 
    const int LIGHT_STEPS_MAX = 4; 

    
    rayleighColor = vec3(0.0);
    mieColor = vec3(0.0);
    opacity = 0.0;

    float atmosphereOuterRadius = atmosphereInnerRadius + ATMOSPHERE_THICKNESS;

    vec3 origin = vec3(0.0);

    
    czm_raySegment primaryRayAtmosphereIntersect = czm_raySphereIntersectionInterval(primaryRay, origin, atmosphereOuterRadius);

    
    if (primaryRayAtmosphereIntersect == czm_emptyRaySegment) {
        return;
    }

    
    
    
    
    float x = 1e-7 * primaryRayAtmosphereIntersect.stop / length(primaryRayLength);
    
    
    float w_stop_gt_lprl = 0.5 * (1.0 + czm_approximateTanh(x));

    
    float start_0 = primaryRayAtmosphereIntersect.start;
    primaryRayAtmosphereIntersect.start = max(primaryRayAtmosphereIntersect.start, 0.0);
    
    primaryRayAtmosphereIntersect.stop = min(primaryRayAtmosphereIntersect.stop, length(primaryRayLength));

    
    
    
    float x_o_a = start_0 - ATMOSPHERE_THICKNESS; 
    float w_inside_atmosphere = 1.0 - 0.5 * (1.0 + czm_approximateTanh(x_o_a));
    int PRIMARY_STEPS = PRIMARY_STEPS_MAX - int(w_inside_atmosphere * 12.0); 
    int LIGHT_STEPS = LIGHT_STEPS_MAX - int(w_inside_atmosphere * 2.0); 

    
    float rayPositionLength = primaryRayAtmosphereIntersect.start;
    
    
    float totalRayLength = primaryRayAtmosphereIntersect.stop - rayPositionLength;
    float rayStepLengthIncrease = w_inside_atmosphere * ((1.0 - w_stop_gt_lprl) * totalRayLength / (float(PRIMARY_STEPS * (PRIMARY_STEPS + 1)) / 2.0));
    float rayStepLength = max(1.0 - w_inside_atmosphere, w_stop_gt_lprl) * totalRayLength / max(7.0 * w_inside_atmosphere, float(PRIMARY_STEPS));

    vec3 rayleighAccumulation = vec3(0.0);
    vec3 mieAccumulation = vec3(0.0);
    vec2 opticalDepth = vec2(0.0);
    vec2 heightScale = vec2(czm_atmosphereRayleighScaleHeight, czm_atmosphereMieScaleHeight);

    
    for (int i = 0; i < PRIMARY_STEPS_MAX; ++i) {

        
        
        if (i >= PRIMARY_STEPS) {
            break;
        }

        
        vec3 samplePosition = primaryRay.origin + primaryRay.direction * (rayPositionLength + rayStepLength);

        
        float sampleHeight = length(samplePosition) - atmosphereInnerRadius;

        
        vec2 sampleDensity = exp(-sampleHeight / heightScale) * rayStepLength;
        opticalDepth += sampleDensity;

        
        czm_ray lightRay = czm_ray(samplePosition, lightDirection);
        czm_raySegment lightRayAtmosphereIntersect = czm_raySphereIntersectionInterval(lightRay, origin, atmosphereOuterRadius);

        float lightStepLength = lightRayAtmosphereIntersect.stop / float(LIGHT_STEPS);
        float lightPositionLength = 0.0;

        vec2 lightOpticalDepth = vec2(0.0);

        
        for (int j = 0; j < LIGHT_STEPS_MAX; ++j) {

            
            
            if (j >= LIGHT_STEPS) {
                break;
            }

            
            vec3 lightPosition = samplePosition + lightDirection * (lightPositionLength + lightStepLength * 0.5);

            
            float lightHeight = length(lightPosition) - atmosphereInnerRadius;

            
            lightOpticalDepth += exp(-lightHeight / heightScale) * lightStepLength;

            
            lightPositionLength += lightStepLength;
        }

        
        vec3 attenuation = exp(-((czm_atmosphereMieCoefficient * (opticalDepth.y + lightOpticalDepth.y)) + (czm_atmosphereRayleighCoefficient * (opticalDepth.x + lightOpticalDepth.x))));

        
        rayleighAccumulation += sampleDensity.x * attenuation;
        mieAccumulation += sampleDensity.y * attenuation;

        
        rayPositionLength += (rayStepLength += rayStepLengthIncrease);
    }

    
    rayleighColor = czm_atmosphereRayleighCoefficient * rayleighAccumulation;
    mieColor = czm_atmosphereMieCoefficient * mieAccumulation;

    
    opacity = length(exp(-((czm_atmosphereMieCoefficient * opticalDepth.y) + (czm_atmosphereRayleighCoefficient * opticalDepth.x))));
}

uniform vec3 czm_sunDirectionWC;
uniform vec3 czm_lightDirectionWC;
uniform float czm_fogDensity;













float czm_branchFreeTernary(bool comparison, float a, float b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec2 czm_branchFreeTernary(bool comparison, vec2 a, vec2 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec3 czm_branchFreeTernary(bool comparison, vec3 a, vec3 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec4 czm_branchFreeTernary(bool comparison, vec4 a, vec4 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}







vec3 czm_linearToSrgb(vec3 linearIn) 
{
    return pow(linearIn, vec3(1.0/2.2));
}

vec4 czm_linearToSrgb(vec4 linearIn) 
{
    vec3 srgbOut = pow(linearIn.rgb, vec3(1.0/2.2));
    return vec4(srgbOut, linearIn.a);
}










vec3 czm_gammaCorrect(vec3 color) {
#ifdef HDR
    color = pow(color, vec3(czm_gamma));
#endif
    return color;
}

vec4 czm_gammaCorrect(vec4 color) {
#ifdef HDR
    color.rgb = pow(color.rgb, vec3(czm_gamma));
#endif
    return color;
}

vec3 lambertianDiffuse(vec3 diffuseColor)
{
    return diffuseColor / czm_pi;
}

vec3 fresnelSchlick2(vec3 f0, vec3 f90, float VdotH)
{
    float versine = 1.0 - VdotH;
    
    float versineSquared = versine * versine;
    return f0 + (f90 - f0) * versineSquared * versineSquared * versine;
}

#ifdef USE_ANISOTROPY






float smithVisibilityGGX_anisotropic(float bitangentRoughness, float tangentialRoughness, vec3 lightDirection, vec3 viewDirection)
{
    vec3 roughnessScale = vec3(tangentialRoughness, bitangentRoughness, 1.0);
    float GGXV = lightDirection.z * length(roughnessScale * viewDirection);
    float GGXL = viewDirection.z * length(roughnessScale * lightDirection);
    float v = 0.5 / (GGXV + GGXL);
    return clamp(v, 0.0, 1.0);
}






float GGX_anisotropic(float bitangentRoughness, float tangentialRoughness, vec3 halfwayDirection)
{
    float roughnessSquared = bitangentRoughness * tangentialRoughness;
    vec3 f = halfwayDirection * vec3(bitangentRoughness, tangentialRoughness, roughnessSquared);
    float w2 = roughnessSquared / dot(f, f);
    return roughnessSquared * w2 * w2 / czm_pi;
}
#endif













float smithVisibilityGGX(float alphaRoughness, float NdotL, float NdotV)
{
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;

    float GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
    float GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);

    float GGX = GGXV + GGXL;
    if (GGX > 0.0)
    {
        return 0.5 / GGX;
    }
    return 0.0;
}










float GGX(float alphaRoughness, float NdotH)
{
    float alphaRoughnessSquared = alphaRoughness * alphaRoughness;
    float f = (NdotH * alphaRoughnessSquared - NdotH) * NdotH + 1.0;
    return alphaRoughnessSquared / (czm_pi * f * f);
}











float computeDirectSpecularStrength(vec3 normal, vec3 lightDirection, vec3 viewDirection, vec3 halfwayDirection, float alphaRoughness)
{
    float NdotL = clamp(dot(normal, lightDirection), 0.0, 1.0);
    float NdotV = clamp(dot(normal, viewDirection), 0.0, 1.0);
    float G = smithVisibilityGGX(alphaRoughness, NdotL, NdotV);
    float NdotH = clamp(dot(normal, halfwayDirection), 0.0, 1.0);
    float D = GGX(alphaRoughness, NdotH);
    return G * D;
}


















vec3 czm_pbrLighting(vec3 viewDirectionEC, vec3 normalEC, vec3 lightDirectionEC, czm_modelMaterial material)
{
    vec3 halfwayDirectionEC = normalize(viewDirectionEC + lightDirectionEC);
    float VdotH = clamp(dot(viewDirectionEC, halfwayDirectionEC), 0.0, 1.0);
    float NdotL = clamp(dot(normalEC, lightDirectionEC), 0.001, 1.0);

    vec3 f0 = material.specular;
    float reflectance = czm_maximumComponent(f0);
    
    
    vec3 f90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));
    vec3 F = fresnelSchlick2(f0, f90, VdotH);

    #if defined(USE_SPECULAR)
        F *= material.specularWeight;
    #endif

    float alphaRoughness = material.roughness * material.roughness;
    #ifdef USE_ANISOTROPY
        mat3 tbn = mat3(material.anisotropicT, material.anisotropicB, normalEC);
        vec3 lightDirection = lightDirectionEC * tbn;
        vec3 viewDirection = viewDirectionEC * tbn;
        vec3 halfwayDirection = halfwayDirectionEC * tbn;
        float anisotropyStrength = material.anisotropyStrength;
        float tangentialRoughness = mix(alphaRoughness, 1.0, anisotropyStrength * anisotropyStrength);
        float bitangentRoughness = clamp(alphaRoughness, 0.001, 1.0);
        float G = smithVisibilityGGX_anisotropic(bitangentRoughness, tangentialRoughness, lightDirection, viewDirection);
        float D = GGX_anisotropic(bitangentRoughness, tangentialRoughness, halfwayDirection);
        vec3 specularContribution = F * G * D;
    #else
        float specularStrength = computeDirectSpecularStrength(normalEC, lightDirectionEC, viewDirectionEC, halfwayDirectionEC, alphaRoughness);
        vec3 specularContribution = F * specularStrength;
    #endif

    vec3 diffuseColor = material.diffuse;
    
    vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(diffuseColor);

    
    return (diffuseContribution + specularContribution) * NdotL;
}

uniform vec3 czm_lightDirectionEC;
uniform vec3 czm_lightColorHdr;














vec4 czm_computeAtmosphereColor(
    vec3 positionWC,
    vec3 lightDirection,
    vec3 rayleighColor,
    vec3 mieColor,
    float opacity
) {
    
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);

    float cosAngle = dot(cameraToPositionWCDirection, lightDirection);
    float cosAngleSq = cosAngle * cosAngle;

    float G = czm_atmosphereMieAnisotropy;
    float GSq = G * G;

    
    float rayleighPhase = 3.0 / (50.2654824574) * (1.0 + cosAngleSq);
    
    float miePhase = 3.0 / (25.1327412287) * ((1.0 - GSq) * (cosAngleSq + 1.0)) / (pow(1.0 + GSq - 2.0 * cosAngle * G, 1.5) * (2.0 + GSq));

    
    vec3 rayleigh = rayleighPhase * rayleighColor;
    vec3 mie = miePhase * mieColor;

    vec3 color = (rayleigh + mie) * czm_atmosphereLightIntensity;

    return vec4(color, opacity);
}















vec4 czm_computeAtmosphereColor(
    czm_ray primaryRay,
    vec3 lightDirection,
    vec3 rayleighColor,
    vec3 mieColor,
    float opacity
) {
    vec3 direction = normalize(primaryRay.direction);

    float cosAngle = dot(direction, lightDirection);
    float cosAngleSq = cosAngle * cosAngle;

    float G = czm_atmosphereMieAnisotropy;
    float GSq = G * G;

    
    float rayleighPhase = 3.0 / (50.2654824574) * (1.0 + cosAngleSq);
    
    float miePhase = 3.0 / (25.1327412287) * ((1.0 - GSq) * (cosAngleSq + 1.0)) / (pow(1.0 + GSq - 2.0 * cosAngle * G, 1.5) * (2.0 + GSq));

    
    vec3 rayleigh = rayleighPhase * rayleighColor;
    vec3 mie = miePhase * mieColor;

    vec3 color = (rayleigh + mie) * czm_atmosphereLightIntensity;

    return vec4(color, opacity);
}


uniform vec3 czm_atmosphereHsbShift;









vec3 czm_applyHSBShift(vec3 rgb, vec3 hsbShift, bool ignoreBlackPixels) {
    
    vec3 hsb = czm_RGBToHSB(rgb);

    
    
    hsb.x += hsbShift.x; 
    hsb.y = clamp(hsb.y + hsbShift.y, 0.0, 1.0); 

    
    
    
    
    if (ignoreBlackPixels) {
        hsb.z = hsb.z > czm_epsilon7 ? hsb.z + hsbShift.z : 0.0;
    } else {
        hsb.z = hsb.z + hsbShift.z;
    }
    hsb.z = clamp(hsb.z, 0.0, 1.0);

    
    return czm_HSBToRGB(hsb);
}














void czm_computeGroundAtmosphereScattering(vec3 positionWC, vec3 lightDirection, out vec3 rayleighColor, out vec3 mieColor, out float opacity) {
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);
    czm_ray primaryRay = czm_ray(czm_viewerPositionWC, cameraToPositionWCDirection);

    float atmosphereInnerRadius = length(positionWC);

    czm_computeScattering(
        primaryRay,
        length(cameraToPositionWC),
        lightDirection,
        atmosphereInnerRadius,
        rayleighColor,
        mieColor,
        opacity
    );
}












vec3 czm_getDynamicAtmosphereLightDirection(vec3 positionWC, float lightEnum) {
    const float NONE = 0.0;
    const float SCENE_LIGHT = 1.0;
    const float SUNLIGHT = 2.0;

    vec3 lightDirection =
        positionWC * float(lightEnum == NONE) +
        czm_lightDirectionWC * float(lightEnum == SCENE_LIGHT) +
        czm_sunDirectionWC * float(lightEnum == SUNLIGHT);
    return normalize(lightDirection);
}

uniform float czm_fogVisualDensityScalar;












vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor)
{
    float scalar = distanceToCamera * czm_fogDensity;
    float fog = 1.0 - exp(-(scalar * scalar));
    return mix(color, fogColor, fog);
}














vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor, float fogModifierConstant)
{
    float scalar = distanceToCamera * czm_fogDensity;
    float fog = 1.0 - exp(-((fogModifierConstant * scalar + fogModifierConstant) * (scalar * (1.0 + fogModifierConstant))));
    return mix(color, fogColor, fog);
}










vec3 czm_inverseGamma(vec3 color) {
    return pow(color, vec3(1.0 / czm_gamma));
}






vec3 czm_pbrNeutralTonemapping(vec3 color) {
    const float startCompression = 0.8 - 0.04;
    const float desaturation = 0.15;

    float x = min(color.r, min(color.g, color.b));
    float offset = czm_branchFreeTernary(x < 0.08, x - 6.25 * x * x, 0.04);
    color -= offset;

    float peak = max(color.r, max(color.g, color.b));
    if (peak < startCompression) return color;

    const float d = 1.0 - startCompression;
    float newPeak = 1.0 - d * d / (peak + d - startCompression);
    color *= newPeak / peak;

    float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
    return mix(color, newPeak * vec3(1.0, 1.0, 1.0), g);
}

uniform float czm_fogMinimumBrightness;
uniform float czm_atmosphereDynamicLighting;
uniform vec3 czm_ellipsoidRadii;
uniform mat4 czm_model;
uniform sampler2D czm_brdfLut;
uniform samplerCube czm_specularEnvironmentMaps;
uniform float czm_specularEnvironmentMapsMaximumLOD;










vec4 czm_textureCube(samplerCube sampler, vec3 p) {
#if __VERSION__ == 300
    return texture(sampler, p);
#else
    return textureCube(sampler, p);
#endif
}












vec4 czm_textureCube(samplerCube sampler, vec3 p, float lod) {
#if __VERSION__ == 300
    return textureLod(sampler, p, lod);
#elif defined(GL_EXT_shader_texture_lod)
    return textureCubeLodEXT(sampler, p, lod);
#endif
}
uniform vec3 czm_sphericalHarmonicCoefficients[9];















vec3 czm_sphericalHarmonics(vec3 normal, vec3 coefficients[9])
{
    vec3 L00 = coefficients[0];
    vec3 L1_1 = coefficients[1];
    vec3 L10 = coefficients[2];
    vec3 L11 = coefficients[3];
    vec3 L2_2 = coefficients[4];
    vec3 L2_1 = coefficients[5];
    vec3 L20 = coefficients[6];
    vec3 L21 = coefficients[7];
    vec3 L22 = coefficients[8];

    float x = normal.x;
    float y = normal.y;
    float z = normal.z;

    vec3 L =
          L00
        + L1_1 * y
        + L10 * z
        + L11 * x
        + L2_2 * (y * x)
        + L2_1 * (y * z)
        + L20 * (3.0 * z * z - 1.0)
        + L21 * (z * x)
        + L22 * (x * x - y * y);
        
    return max(L, vec3(0.0));
}



#line 0
uniform vec2 model_iblFactor;
uniform mat3 model_iblReferenceFrameMatrix;
uniform vec3 model_sphericalHarmonicCoefficients[9];
uniform samplerCube model_specularEnvironmentMaps;
uniform float model_specularEnvironmentMapsMaximumLOD;
uniform bool u_isInFog;
uniform float u_pointSize;
uniform vec4 czm_pickColor;
in vec3 v_atmosphereRayleighColor;
in vec3 v_atmosphereMieColor;
in float v_atmosphereOpacity;
in vec3 v_positionWC;
in vec3 v_positionEC;
in vec3 v_positionMC;
in vec4 v_color_0;
in float v_temperature;
in float v_timestampksec;
in float v_timestampusec;
in float v_heightaboveground;
in float v_intensity;
in vec3 v_lalala;
struct ProcessedAttributes
{
    vec3 positionWC;
    vec3 positionEC;
    vec3 positionMC;
    vec4 color_0;
    float temperature;
    float timestampksec;
    float timestampusec;
    float heightaboveground;
    float intensity;
};
struct SelectedFeature
{
    float _empty;
};
struct FeatureIds
{
    float _empty;
};
struct floatMetadataClass
{
    float noData;
    float defaultValue;
    float minValue;
    float maxValue;
};
struct Metadata
{
    float Temperature;
    float TimestampKSec;
    float TimestampUSec;
    float HeightAboveGround;
    float Intensity;
};
struct MetadataClass
{
    floatMetadataClass Temperature;
    floatMetadataClass TimestampKSec;
    floatMetadataClass TimestampUSec;
    floatMetadataClass HeightAboveGround;
    floatMetadataClass Intensity;
};
struct MetadataStatistics
{
    float _empty;
};
struct Attributes
{
    float _empty;
};
struct FragmentInput
{
    Attributes attributes;
    FeatureIds featureIds;
    Metadata metadata;
    MetadataClass metadataClass;
    MetadataStatistics metadataStatistics;
};
void setDynamicVaryings(inout ProcessedAttributes attributes)
{
    attributes.color_0 = v_color_0;
    attributes.temperature = v_temperature;
    attributes.timestampksec = v_timestampksec;
    attributes.timestampusec = v_timestampusec;
    attributes.heightaboveground = v_heightaboveground;
    attributes.intensity = v_intensity;
}
void initializeFeatureIds(out FeatureIds featureIds, ProcessedAttributes attributes)
{
}
void initializeFeatureIdAliases(inout FeatureIds featureIds)
{
}
void initializeMetadata(out Metadata metadata, out MetadataClass metadataClass, out MetadataStatistics metadataStatistics, ProcessedAttributes attributes)
{
    metadata.Temperature = attributes.temperature;
    metadata.TimestampKSec = attributes.timestampksec;
    metadata.TimestampUSec = attributes.timestampusec;
    metadata.HeightAboveGround = attributes.heightaboveground;
    metadata.Intensity = attributes.intensity;
}
void metadataPickingStage(Metadata metadata, MetadataClass metadataClass, inout vec4 metadataValues)
{
    METADATA_PICKING_VALUE_TYPE value = METADATA_PICKING_VALUE_TYPE(METADATA_PICKING_VALUE_STRING);
    metadataValues.x = METADATA_PICKING_VALUE_COMPONENT_X;
    metadataValues.y = METADATA_PICKING_VALUE_COMPONENT_Y;
    metadataValues.z = METADATA_PICKING_VALUE_COMPONENT_Z;
    metadataValues.w = METADATA_PICKING_VALUE_COMPONENT_W;
}
void initializeInputStruct(out FragmentInput fsInput, ProcessedAttributes attributes)
{
}
#ifdef DIFFUSE_IBL
vec3 sampleDiffuseEnvironment(vec3 cubeDir)
{
    #ifdef CUSTOM_SPHERICAL_HARMONICS
        return czm_sphericalHarmonics(cubeDir, model_sphericalHarmonicCoefficients); 
    #else
        return czm_sphericalHarmonics(cubeDir, czm_sphericalHarmonicCoefficients); 
    #endif
}
#endif

#ifdef SPECULAR_IBL
vec3 sampleSpecularEnvironment(vec3 cubeDir, float roughness)
{
    #ifdef CUSTOM_SPECULAR_IBL
        float lod = roughness * model_specularEnvironmentMapsMaximumLOD;
        return czm_textureCube(model_specularEnvironmentMaps, cubeDir, lod).rgb;
    #else
        float lod = roughness * czm_specularEnvironmentMapsMaximumLOD;
        return czm_textureCube(czm_specularEnvironmentMaps, cubeDir, lod).rgb;
    #endif
}
vec3 computeSpecularIBL(vec3 cubeDir, float NdotV, vec3 f0, float roughness)
{
    
    
    vec3 f90 = max(vec3(1.0 - roughness), f0);
    vec3 F = fresnelSchlick2(f0, f90, NdotV);

    vec2 brdfLut = texture(czm_brdfLut, vec2(NdotV, roughness)).rg;
    vec3 specularSample = sampleSpecularEnvironment(cubeDir, roughness);

    return specularSample * (F * brdfLut.x + brdfLut.y);
}
#endif

#if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)










vec3 textureIBL(vec3 viewDirectionEC, vec3 normalEC, czm_modelMaterial material) {
    vec3 f0 = material.specular;
    float roughness = material.roughness;
    float specularWeight = 1.0;
    #ifdef USE_SPECULAR
        specularWeight = material.specularWeight;
    #endif
    float NdotV = clamp(dot(normalEC, viewDirectionEC), 0.0, 1.0);

    
    
    vec3 f90 = max(vec3(1.0 - roughness), f0);
    vec3 singleScatterFresnel = fresnelSchlick2(f0, f90, NdotV);

    vec2 brdfLut = texture(czm_brdfLut, vec2(NdotV, roughness)).rg;
    vec3 FssEss = specularWeight * (singleScatterFresnel * brdfLut.x + brdfLut.y);

    #ifdef DIFFUSE_IBL
        vec3 normalMC = normalize(model_iblReferenceFrameMatrix * normalEC);
        vec3 irradiance = sampleDiffuseEnvironment(normalMC);

        vec3 averageFresnel = f0 + (1.0 - f0) / 21.0;
        float Ems = specularWeight * (1.0 - brdfLut.x - brdfLut.y);
        vec3 FmsEms = FssEss * averageFresnel * Ems / (1.0 - averageFresnel * Ems);
        vec3 dielectricScattering = (1.0 - FssEss - FmsEms) * material.diffuse;
        vec3 diffuseContribution = irradiance * (FmsEms + dielectricScattering) * model_iblFactor.x;
    #else
        vec3 diffuseContribution = vec3(0.0);
    #endif

    #ifdef USE_ANISOTROPY
        
        vec3 anisotropyDirection = material.anisotropicB;
        vec3 anisotropicTangent = cross(anisotropyDirection, viewDirectionEC);
        vec3 anisotropicNormal = cross(anisotropicTangent, anisotropyDirection);
        float bendFactor = 1.0 - material.anisotropyStrength * (1.0 - roughness);
        float bendFactorPow4 = bendFactor * bendFactor * bendFactor * bendFactor;
        vec3 bentNormal = normalize(mix(anisotropicNormal, normalEC, bendFactorPow4));
        vec3 reflectEC = reflect(-viewDirectionEC, bentNormal);
    #else
        vec3 reflectEC = reflect(-viewDirectionEC, normalEC);
    #endif

    #ifdef SPECULAR_IBL
        vec3 reflectMC = normalize(model_iblReferenceFrameMatrix * reflectEC);
        vec3 radiance = sampleSpecularEnvironment(reflectMC, roughness);
        vec3 specularContribution = radiance * FssEss * model_iblFactor.y;
    #else
        vec3 specularContribution = vec3(0.0);
    #endif

    return diffuseContribution + specularContribution;
}
#endif







vec2 nearestPointOnEllipseFast(vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 inverseRadii = 1.0 / radii;
    vec2 evoluteScale = (radii.x * radii.x - radii.y * radii.y) * vec2(1.0, -1.0) * inverseRadii;

    
    
    
    vec2 tTrigs = vec2(0.70710678118);
    vec2 v = radii * tTrigs;

    
    vec2 evolute = evoluteScale * tTrigs * tTrigs * tTrigs;
    
    vec2 q = normalize(p - evolute) * length(v - evolute);
    
    tTrigs = (q + evolute) * inverseRadii;
    tTrigs = normalize(clamp(tTrigs, 0.0, 1.0));
    v = radii * tTrigs;

    return v * sign(pos);
}

vec3 computeEllipsoidPositionWC(vec3 positionMC) {
    
    
    vec3 positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;

    vec2 positionEllipse = vec2(length(positionWC.xy), positionWC.z);
    vec2 nearestPoint = nearestPointOnEllipseFast(positionEllipse, czm_ellipsoidRadii.xz);

    
    return vec3(nearestPoint.x * normalize(positionWC.xy), nearestPoint.y);
}

void applyFog(inout vec4 color, vec4 groundAtmosphereColor, vec3 lightDirection, float distanceToCamera) {

    vec3 fogColor = groundAtmosphereColor.rgb;

    
    const float NONE = 0.0;
    if (czm_atmosphereDynamicLighting != NONE) {
        float darken = clamp(dot(normalize(czm_viewerPositionWC), lightDirection), czm_fogMinimumBrightness, 1.0);
        fogColor *= darken;
    }

    
    #ifndef HDR
        fogColor.rgb = czm_pbrNeutralTonemapping(fogColor.rgb);
        fogColor.rgb = czm_inverseGamma(fogColor.rgb);
    #endif

    vec3 withFog = czm_fog(distanceToCamera, color.rgb, fogColor, czm_fogVisualDensityScalar);
    color = vec4(withFog, color.a);
}

void atmosphereStage(inout vec4 color, in ProcessedAttributes attributes) {
    vec3 rayleighColor;
    vec3 mieColor;
    float opacity;

    vec3 positionWC;
    vec3 lightDirection;

    
    
    
    
    if (false) {
        positionWC = computeEllipsoidPositionWC(attributes.positionMC);
        lightDirection = czm_getDynamicAtmosphereLightDirection(positionWC, czm_atmosphereDynamicLighting);

        
        czm_computeGroundAtmosphereScattering(
            positionWC,
            lightDirection,
            rayleighColor,
            mieColor,
            opacity
        );
    } else {
        positionWC = attributes.positionWC;
        lightDirection = czm_getDynamicAtmosphereLightDirection(positionWC, czm_atmosphereDynamicLighting);
        rayleighColor = v_atmosphereRayleighColor;
        mieColor = v_atmosphereMieColor;
        opacity = v_atmosphereOpacity;
    }

    
    const bool ignoreBlackPixels = true;
    rayleighColor = czm_applyHSBShift(rayleighColor, czm_atmosphereHsbShift, ignoreBlackPixels);
    mieColor = czm_applyHSBShift(mieColor, czm_atmosphereHsbShift, ignoreBlackPixels);

    vec4 groundAtmosphereColor = czm_computeAtmosphereColor(positionWC, lightDirection, rayleighColor, mieColor, opacity);

    if (u_isInFog) {
        float distanceToCamera = length(attributes.positionEC);
        applyFog(color, groundAtmosphereColor, lightDirection, distanceToCamera);
    } else {
        
    }
}

void geometryStage(out ProcessedAttributes attributes)
{
  attributes.positionMC = v_positionMC;
  attributes.positionEC = v_positionEC;

  #if defined(COMPUTE_POSITION_WC_CUSTOM_SHADER) || defined(COMPUTE_POSITION_WC_STYLE) || defined(COMPUTE_POSITION_WC_ATMOSPHERE)
  attributes.positionWC = v_positionWC;
  #endif

  #ifdef HAS_NORMALS
  
  attributes.normalEC = normalize(v_normalEC);
  #endif

  #ifdef HAS_TANGENTS
  attributes.tangentEC = normalize(v_tangentEC);
  #endif

  #ifdef HAS_BITANGENTS
  attributes.bitangentEC = normalize(v_bitangentEC);
  #endif

  
  setDynamicVaryings(attributes);
}

void featureIdStage(out FeatureIds featureIds, ProcessedAttributes attributes) {
  initializeFeatureIds(featureIds, attributes);
  initializeFeatureIdAliases(featureIds);
}

void metadataStage(
  out Metadata metadata,
  out MetadataClass metadataClass,
  out MetadataStatistics metadataStatistics,
  ProcessedAttributes attributes
  )
{
  initializeMetadata(metadata, metadataClass, metadataStatistics, attributes);
}

#line 0

    
    

    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
      
      
      material.colorOverride = vec4(0.0, 0.12345, 0.0, 1.0);
      
      
    }
  
void customShaderStage(
    inout czm_modelMaterial material,
    ProcessedAttributes attributes,
    FeatureIds featureIds,
    Metadata metadata,
    MetadataClass metadataClass,
    MetadataStatistics metadataStatistics
) {
    
    
    FragmentInput fsInput;
    initializeInputStruct(fsInput, attributes);
    fsInput.featureIds = featureIds;
    fsInput.metadata = metadata;
    fsInput.metadataClass = metadataClass;
    fsInput.metadataStatistics = metadataStatistics;
    fragmentMain(fsInput, material);
}

#ifdef USE_IBL_LIGHTING
vec3 computeIBL(vec3 position, vec3 normal, vec3 lightDirection, vec3 lightColorHdr, czm_modelMaterial material)
{
    #if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)
        
        vec3 viewDirection = -normalize(position);
        vec3 iblColor = textureIBL(viewDirection, normal, material);
        return iblColor;
    #endif
    
    return vec3(0.0);
}
#endif

#ifdef USE_CLEARCOAT
vec3 addClearcoatReflection(vec3 baseLayerColor, vec3 position, vec3 lightDirection, vec3 lightColorHdr, czm_modelMaterial material)
{
    vec3 viewDirection = -normalize(position);
    vec3 halfwayDirection = normalize(viewDirection + lightDirection);
    vec3 normal = material.clearcoatNormal;
    float NdotL = clamp(dot(normal, lightDirection), 0.001, 1.0);

    
    vec3 f0 = vec3(0.04);
    vec3 f90 = vec3(1.0);
    
    
    float NdotV = clamp(dot(normal, viewDirection), 0.0, 1.0);
    vec3 F = fresnelSchlick2(f0, f90, NdotV);

    
    float roughness = material.clearcoatRoughness;
    float alphaRoughness = roughness * roughness;
    float directStrength = computeDirectSpecularStrength(normal, lightDirection, viewDirection, halfwayDirection, alphaRoughness);
    vec3 directReflection = F * directStrength * NdotL;
    vec3 color = lightColorHdr * directReflection;

    #ifdef SPECULAR_IBL
        
        vec3 reflectMC = normalize(model_iblReferenceFrameMatrix * reflect(-viewDirection, normal));
        vec3 iblColor = computeSpecularIBL(reflectMC, NdotV, f0, roughness);
        color += iblColor * material.occlusion;
    #endif

    float clearcoatFactor = material.clearcoatFactor;
    vec3 clearcoatColor = color * clearcoatFactor;

    
    return baseLayerColor * (1.0 - clearcoatFactor * F) + clearcoatColor;
}
#endif

#if defined(LIGHTING_PBR) && defined(HAS_NORMALS)
vec3 computePbrLighting(in czm_modelMaterial material, in vec3 position)
{
    #ifdef USE_CUSTOM_LIGHT_COLOR
        vec3 lightColorHdr = model_lightColorHdr;
    #else
        vec3 lightColorHdr = czm_lightColorHdr;
    #endif

    vec3 viewDirection = -normalize(position);
    vec3 normal = material.normalEC;
    vec3 lightDirection = normalize(czm_lightDirectionEC);

    vec3 directLighting = czm_pbrLighting(viewDirection, normal, lightDirection, material);
    vec3 directColor = lightColorHdr * directLighting;

    
    vec3 color = directColor + material.emissive;
    #ifdef USE_IBL_LIGHTING
        color += computeIBL(position, normal, lightDirection, lightColorHdr, material);
    #endif

    #ifdef USE_CLEARCOAT
        color = addClearcoatReflection(color, position, lightDirection, lightColorHdr, material);
    #endif

    return color;
}
#endif









void lightingStage(inout czm_modelMaterial material, ProcessedAttributes attributes)
{
    #ifdef LIGHTING_PBR
        #ifdef HAS_NORMALS
            vec3 color = computePbrLighting(material, attributes.positionEC);
        #else
            vec3 color = material.diffuse * material.occlusion + material.emissive;
        #endif
        
        
        
        
        #ifndef HDR
            color = czm_pbrNeutralTonemapping(color);
        #endif
    #else 
        vec3 color = material.diffuse;
    #endif

    #ifdef HAS_POINT_CLOUD_COLOR_STYLE
        
        color = czm_gammaCorrect(color);
    #elif !defined(HDR)
        
        
        color = czm_linearToSrgb(color);
    #endif

    material.diffuse = color;
}


precision highp float;
czm_modelMaterial defaultModelMaterial()
{
    czm_modelMaterial material;
    material.diffuse = vec3(0.0);
    material.specular = vec3(1.0);
    material.roughness = 1.0;
    material.occlusion = 1.0;
    material.normalEC = vec3(0.0, 0.0, 1.0);
    material.emissive = vec3(0.0);
    material.alpha = 1.0;
    return material;
}

vec4 handleAlpha(vec3 color, float alpha)
{
    #ifdef ALPHA_MODE_MASK
    if (alpha < u_alphaCutoff) {
        discard;
    }
    #endif

    return vec4(color, alpha);
}

SelectedFeature selectedFeature;

void main()
{
    #ifdef HAS_POINT_CLOUD_SHOW_STYLE
        if (v_pointCloudShow == 0.0)
        {
            discard;
        }
    #endif

    #ifdef HAS_MODEL_SPLITTER
        modelSplitterStage();
    #endif

    czm_modelMaterial material = defaultModelMaterial();

    ProcessedAttributes attributes;
    geometryStage(attributes);

    FeatureIds featureIds;
    featureIdStage(featureIds, attributes);

    Metadata metadata;
    MetadataClass metadataClass;
    MetadataStatistics metadataStatistics;
    metadataStage(metadata, metadataClass, metadataStatistics, attributes);

    
    
    #ifndef METADATA_PICKING_ENABLED

        #ifdef HAS_SELECTED_FEATURE_ID
            selectedFeatureIdStage(selectedFeature, featureIds);
        #endif

        #ifndef CUSTOM_SHADER_REPLACE_MATERIAL
            materialStage(material, attributes, selectedFeature);
        #endif

        #ifdef HAS_CUSTOM_FRAGMENT_SHADER
            customShaderStage(material, attributes, featureIds, metadata, metadataClass, metadataStatistics);
        #endif

        #ifdef SET_CUSTOM_FRAG_COLOR_DIRECTLY
            vec4 color = vec4(material.diffuse, material.alpha);
            color.z = 1.0;
        #else
            lightingStage(material, attributes);

            #ifdef HAS_SELECTED_FEATURE_ID
                cpuStylingStage(material, selectedFeature);
            #endif

            #ifdef HAS_MODEL_COLOR
                modelColorStage(material);
            #endif

            #ifdef HAS_PRIMITIVE_OUTLINE
                primitiveOutlineStage(material);
            #endif

            vec4 color = handleAlpha(material.diffuse, material.alpha);
        #endif

        
        
    #else 
        
        

        vec4 metadataValues = vec4(0.0, 0.0, 0.0, 0.0);
        metadataPickingStage(metadata, metadataClass, metadataValues);
        vec4 color = metadataValues;

    #endif
    
    

    #ifdef HAS_CLIPPING_PLANES
        modelClippingPlanesStage(color);
    #endif

    #ifdef ENABLE_CLIPPING_POLYGONS
        modelClippingPolygonsStage();
    #endif

    
    
    #if !defined(METADATA_PICKING_ENABLED) && !defined(SET_CUSTOM_FRAG_COLOR_DIRECTLY)

        #if defined(HAS_SILHOUETTE) && defined(HAS_NORMALS)
            silhouetteStage(color);
        #endif

        #ifdef HAS_ATMOSPHERE
            atmosphereStage(color, attributes);
        #endif

    #endif
    
    
    #ifdef SET_CUSTOM_FRAG_COLOR_DIRECTLY
        out_FragColor = material.colorOverride;
    #else
        out_FragColor = color;
    #endif
}
