uniform vec4 u_lightWoodColor;
uniform vec4 u_darkWoodColor;
uniform float u_ringFrequency;
uniform float u_lightGrains;
uniform float u_darkGrains;
uniform float u_grainThreshold;
uniform vec2 u_noiseScale;
uniform float u_grainFrequency;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    //Based on wood shader from OpenGL Shading Language (3rd edition) pg. 455
    vec2 st = materialInput.st;
    
    vec2 noisevec;
    noisevec.x = agi_snoise(st * u_noiseScale.x);
    noisevec.y = agi_snoise(st * u_noiseScale.y);
    
    vec2 location = st + noisevec;
    float dist = sqrt(location.x * location.x + location.y * location.y);
    dist *= u_ringFrequency;
    
    float r = fract(dist + noisevec[0] + noisevec[1]) * 2.0;
    if(r > 1.0)
        r = 2.0 - r;
        
    vec4 color = mix(u_lightWoodColor, u_darkWoodColor, r);
    
    //streaks
    r = abs(agi_snoise(vec2(st.x * u_grainFrequency, st.y * u_grainFrequency * 0.02))) * 0.2;
    color += u_lightWoodColor * r;
    
    color.a = 1.0;
    
    material.diffuse = color.rgb;
    
    return material;
}