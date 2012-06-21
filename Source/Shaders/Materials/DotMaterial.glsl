uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform vec2 u_repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    float b = smoothstep(0.3, 0.32, length(fract(u_repeat * materialInput.st) - 0.5));  // 0.0 or 1.0

    material.diffuseComponent = mix(u_lightColor, u_darkColor, b).rgb;
    
    return material;
}
