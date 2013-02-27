varying vec4 v_color;
varying float v_width;

float dropOffFunction(float value)
{
    return value * value;
}

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    float halfInteriorWidth = 1.0 / v_width;
    float s = (1.0 - step(0.5 - halfInteriorWidth, materialInput.st.t)) * dropOffFunction(1.0 - materialInput.st.t);
    s += step(0.5 + halfInteriorWidth, materialInput.st.t) * dropOffFunction(materialInput.st.t);
    float alpha = mix(0.1, 1.0, 1.0 - s);
    
    material.emission = v_color.rgb * alpha;
    material.alpha = alpha;
    return material;
}
