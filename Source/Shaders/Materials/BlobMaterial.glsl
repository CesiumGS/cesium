uniform vec4 lightColor;
uniform vec4 darkColor;
uniform float frequency;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    vec2 F = czm_cellular(materialInput.st * frequency);
    float t = 1.0 - F.x * F.x;
    
    vec4 color = mix(lightColor, darkColor, t);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}