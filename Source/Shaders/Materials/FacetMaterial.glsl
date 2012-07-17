uniform vec4 lightColor;
uniform vec4 darkColor;
uniform float frequency;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    vec2 F = agi_cellular(materialInput.st * frequency);
    float t = 0.1 + (F.y - F.x);
        
    vec4 color = mix(lightColor, darkColor, t);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
