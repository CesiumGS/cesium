uniform vec4 grassColor;
uniform vec4 dirtColor;
uniform float patchiness;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec2 st = materialInput.st;
    float noise1 = (agi_snoise(st * patchiness * 1.0)) * 1.0;
    float noise2 = (agi_snoise(st * patchiness * 2.0)) * 0.5;
    float noise3 = (agi_snoise(st * patchiness * 4.0)) * 0.25;
    float noise = sin(noise1 + noise2 + noise3) * 0.1;
    
    vec4 color = mix(grassColor, dirtColor, noise);
    
    //Make thatch patterns
    float verticalNoise = agi_snoise(vec2(st.x * 100.0, st.y * 20.0)) * 0.02;
    float horizontalNoise = agi_snoise(vec2(st.x * 20.0, st.y * 100.0)) * 0.02;
    float stripeNoise = min(verticalNoise, horizontalNoise);
 
    color += stripeNoise;
    color.w = 1.0;
    
    material.diffuse = color.rgb;
    
    return material;
}