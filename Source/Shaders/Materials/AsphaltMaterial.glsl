uniform vec4 asphaltColor;
uniform float bumpSize;
uniform float roughness;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    //Main cellular pattern
    vec4 color = asphaltColor;
    vec2 st = materialInput.st;
    vec2 F = agi_cellular(st / bumpSize);
    color.rgb -= (F.x / F.y) * 0.1;
    
    //Extra bumps for roughness
    float noise = agi_snoise(st / bumpSize);
    noise = pow(noise, 5.0) * roughness;
    color.rgb += noise;

    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
