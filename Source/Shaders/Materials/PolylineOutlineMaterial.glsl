uniform float outlineWidth;

varying vec4 v_color;
varying vec4 v_outlineColor;
varying float v_width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    float halfInteriorWidth = 0.5 - outlineWidth / v_width;
    float s = step(0.5 - halfInteriorWidth, materialInput.st.t);
    s *= 1.0 - step(0.5 + halfInteriorWidth, materialInput.st.t);
    
    vec4 color = mix(v_outlineColor, v_color, s);
    
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
