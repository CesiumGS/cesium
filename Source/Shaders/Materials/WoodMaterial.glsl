uniform vec4 lightWoodColor;
uniform vec4 darkWoodColor;
uniform float ringFrequency;
uniform vec2 noiseScale;
uniform float grainFrequency;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    //Based on wood shader from OpenGL Shading Language (3rd edition) pg. 455
    vec2 st = materialInput.st;
    
    vec2 noisevec;
    noisevec.x = czm_snoise(st * noiseScale.x);
    noisevec.y = czm_snoise(st * noiseScale.y);
    
    vec2 location = st + noisevec;
    float dist = sqrt(location.x * location.x + location.y * location.y);
    dist *= ringFrequency;
    
    float r = fract(dist + noisevec[0] + noisevec[1]) * 2.0;
    if(r > 1.0)
        r = 2.0 - r;
        
    vec4 color = mix(lightWoodColor, darkWoodColor, r);
    
    //streaks
    r = abs(czm_snoise(vec2(st.x * grainFrequency, st.y * grainFrequency * 0.02))) * 0.2;
    color.rgb += lightWoodColor.rgb * r;
    
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}