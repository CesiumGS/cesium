uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    vec2 F = agi_cellular(materialInput.st * u_repeat);
    float t = 1.0 - F.x * F.x;
        
    material.diffuseComponent = mix(u_lightColor, u_darkColor, t).rgb;
    
    return material;
}