// Thanks for the contribution Jonas
// http://29a.ch/2012/7/19/webgl-terrain-rendering-water-fog

uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform vec4 baseWaterColor;
uniform float frequency;
uniform float animationSpeed;
uniform float amplitude;
uniform float specularIntensity;

vec4 getNoise(vec2 uv, float time) {

    vec2 uv0 = (uv/103.0)+vec2(time/17.0, time/29.0);
    vec2 uv1 = uv/107.0-vec2(time/-19.0, time/31.0)+vec2(0.23);
    vec2 uv2 = uv/vec2(897.0, 983.0)+vec2(time/101.0, time/97.0)+vec2(0.51);
    vec2 uv3 = uv/vec2(991.0, 877.0)-vec2(time/109.0, time/-113.0)+vec2(0.71);
    
    uv0 = fract(uv0);
    uv1 = fract(uv1);
    uv2 = fract(uv2);
    uv3 = fract(uv3);
    vec4 noise = (texture2D(normalMap, uv0)) +
                 (texture2D(normalMap, uv1)) +
                 (texture2D(normalMap, uv2)) +
                 (texture2D(normalMap, uv3));
    return noise / 4.0;
}



czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);


    float specular = texture2D(specularMap, materialInput.st).r;
    material.alpha = specular == 1.0 ? specular : 0.0;
   
    // base the animation time on the frequency and the speed factor
    float speedFactor = animationSpeed / 500.0;
    float time = czm_frameNumber * speedFactor;
    vec4 noise = (getNoise(materialInput.st * frequency, time) - 0.5) * 2.0;
    vec3 normalTangentSpace = normalize(noise.yxz * vec3(1.0, 1.0, 1.0 / amplitude));
    
    normalTangentSpace = mix(vec3(0.0, 0.0, 1.0), normalTangentSpace, specular);
    
    // get ratios for:
    // alignment of the new normal vector with a vector perpendicular to the tangent plane
    // alignment of the vector from the fragement to the eye with a vector perpendicular to the tangent plane (original normal vector)
    float tsPerturbationRatio = clamp(dot(normalTangentSpace, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    float esLocalVerticalRatio = clamp(dot(material.normal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    
    // diffuse highlights are based on how perturbed the normal is and how far from "vertical" we are looking at the water
    material.diffuse = baseWaterColor.rgb;
    material.diffuse += (0.1 * tsPerturbationRatio);
    
    // reduce the normal perturbation for better visual effect
    material.normal = normalize(materialInput.tangentToEyeMatrix * normalTangentSpace);
    material.specular = specularIntensity;
    
    
    return material;
}