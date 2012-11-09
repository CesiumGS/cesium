// Thanks for the contribution Jonas
// http://29a.ch/2012/7/19/webgl-terrain-rendering-water-fog

uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform vec4 baseWaterColor;
uniform vec4 nonWaterColor;
uniform float frequency;
uniform float animationSpeed;
uniform float amplitude;
uniform float specularIntensity;

vec4 getNoise(vec2 uv, float time, vec2 direction) {

    // atan is undefined at x == 0
    if(direction.x == 0.0) {
        direction.x = 0.001;
    }
    
    // angle between direction vector and x axis
    float angle = atan(direction.y, direction.x);
    float cosAngle = cos(angle);
    float sinAngle = sin(angle);
    
    // time dependent sampling directions
    vec2 s0 = vec2(1.0/17.0, 0.0  );
    vec2 s1 = vec2(-1.0/29.0, 0.0);
    vec2 s2 = vec2(1.0/101.0, 1.0/59.0);
    vec2 s3 = vec2(-1.0/109.0, -1.0/57.0);
    
    // rotate sampling direction by specified angle
    s0 = vec2((cosAngle * s0.x) - (sinAngle * s0.y), (sinAngle * s0.x) + (cosAngle * s0.y));
    s1 = vec2((cosAngle * s1.x) - (sinAngle * s1.y), (sinAngle * s1.x) + (cosAngle * s1.y));
    s2 = vec2((cosAngle * s2.x) - (sinAngle * s2.y), (sinAngle * s2.x) + (cosAngle * s2.y));
    s3 = vec2((cosAngle * s3.x) - (sinAngle * s3.y), (sinAngle * s3.x) + (cosAngle * s3.y));
    
    vec2 uv0 = (uv/103.0) + (time * s0);
    vec2 uv1 = uv/107.0 + (time * s1) + vec2(0.23);
    vec2 uv2 = uv/vec2(897.0, 983.0) + (time * s2) + vec2(0.51);
    vec2 uv3 = uv/vec2(991.0, 877.0) + (time * s3) + vec2(0.71);
    
    uv0 = fract(uv0);
    uv1 = fract(uv1);
    uv2 = fract(uv2);
    uv3 = fract(uv3);
    vec4 noise = (texture2D(normalMap, uv0)) +
                 (texture2D(normalMap, uv1)) +
                 (texture2D(normalMap, uv2)) +
                 (texture2D(normalMap, uv3));
                 
    // average and scale to between -1 and 1
    return ((noise / 4.0) - 0.5) * 2.0;
}


czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float speedFactor = animationSpeed / 500.0;
    float time = czm_frameNumber * speedFactor;
    
    float specularMapValue = texture2D(specularMap, materialInput.st).r;
    
    // note: not using directional motion at this time, just set the direction to (1.0, 0.0);
    vec4 noise = getNoise(materialInput.st * frequency, time, vec2(1.0, 0.0));
    vec3 normalTangentSpace = normalize(noise.yxz * vec3(1.0, 1.0, 1.0 / amplitude));
    
    // attempt to fad out the normal perturbation as we approach non water areas (low specular map value)
    normalTangentSpace = mix(vec3(0.0, 0.0, 50.0), normalTangentSpace, specularMapValue);
    
    // get ratios for alignment of the new normal vector with a vector perpendicular to the tangent plane
    float tsPerturbationRatio = clamp(dot(normalTangentSpace, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    
    // fade out water effect as specular map value decreases
    material.alpha = specularMapValue;
    
    // base color is a blend of the water and non-water color based on the value from the specular map
    // may need a uniform blend factor to better control this
    material.diffuse = mix(nonWaterColor.rgb, baseWaterColor.rgb, specularMapValue);
    
    // diffuse highlights are based on how perturbed the normal is
    material.diffuse += (0.1 * tsPerturbationRatio);
    
    material.normal = normalize(materialInput.tangentToEyeMatrix * normalTangentSpace);
    
    // may need a specific uniform to control the specular falloff instead of hard-coded to 3
    material.specular = specularIntensity * pow(specularMapValue, 3.0);
    
    return material;
}