uniform float outlineWidth;

varying vec4 v_color;
varying vec4 v_outlineColor;
varying float v_width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    float halfInteriorWidth = (v_width - outlineWidth * 2.0) / (v_width * 2.0);
    float s = step(0.5 - halfInteriorWidth, materialInput.st.t);
    s *= 1.0 - step(0.5 + halfInteriorWidth, materialInput.st.t);
    
    material.diffuse = mix(v_outlineColor.rgb, v_color.rgb, s);
    material.alpha = mix(v_outlineColor.a, v_color.a, s);
    
    return material;
}
