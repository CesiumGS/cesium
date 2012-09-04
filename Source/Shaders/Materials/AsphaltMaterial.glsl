uniform vec4 asphaltColor;
uniform float bumpSize;
uniform float roughness;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    //Main cellular pattern
    vec4 color = asphaltColor;
    vec2 st = materialInput.st;
    vec2 F = czm_cellular(st / bumpSize);
    color.rgb -= (F.x / F.y) * 0.1;
    
    //Extra bumps for roughness
    float noise = czm_snoise(st / bumpSize);
    noise = pow(noise, 5.0) * roughness;
    color.rgb += noise;

    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
