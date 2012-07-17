uniform vec4 lightWoodColor;
uniform vec4 darkWoodColor;
uniform float ringFrequency;
uniform vec2 noiseScale;
uniform float grainFrequency;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    //Based on wood shader from OpenGL Shading Language (3rd edition) pg. 455
    vec2 st = materialInput.st;
    
    vec2 noisevec;
    noisevec.x = agi_snoise(st * noiseScale.x);
    noisevec.y = agi_snoise(st * noiseScale.y);
    
    vec2 location = st + noisevec;
    float dist = sqrt(location.x * location.x + location.y * location.y);
    dist *= ringFrequency;
    
    float r = fract(dist + noisevec[0] + noisevec[1]) * 2.0;
    if(r > 1.0)
        r = 2.0 - r;
        
    vec4 color = mix(lightWoodColor, darkWoodColor, r);
    
    //streaks
    r = abs(agi_snoise(vec2(st.x * grainFrequency, st.y * grainFrequency * 0.02))) * 0.2;
    color += lightWoodColor * r;
    
    color.a = 1.0;
    
    material.diffuse = color.rgb;
    
    return material;
}