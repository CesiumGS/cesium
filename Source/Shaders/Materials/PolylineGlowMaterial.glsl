uniform vec4 color;
uniform float glowPower;

varying float v_width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;
    float glow = glowPower / abs(st.t - 0.5) - (glowPower / 0.5);

    material.emission = max(vec3(glow - 1.0 + color.rgb), color.rgb);
    material.alpha = clamp(0.0, 1.0, glow) * color.a;

    return material;
}
