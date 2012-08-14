uniform vec4 lightColor;
uniform vec4 darkColor;
uniform vec2 repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    float b = smoothstep(0.3, 0.32, length(fract(repeat * materialInput.st) - 0.5));  // 0.0 or 1.0

    vec4 color = mix(lightColor, darkColor, b);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
