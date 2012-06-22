uniform vec4 u_asphaltColor;
uniform float u_bumpSize;
uniform float u_roughness;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    //Main cellular pattern
    vec2 st = materialInput.st;
    vec2 F = agi_cellular(st / u_bumpSize);
    vec4 color = u_asphaltColor;
    color -= (F.x / F.y) * 0.1;
    
    //Extra bumps for roughness
    float noise = agi_snoise(st / u_bumpSize);
    noise = pow(noise, 5.0) * u_roughness;
    color += noise;

    material.diffuse = color.rgb;
    
    return material;
}
