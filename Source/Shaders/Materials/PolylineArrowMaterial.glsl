varying vec4 v_color;
varying float v_width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec2 st = materialInput.st;
    
    float base = 1.0 - dFdx(st.s) * 10.0;
    vec2 upperBase = vec2(base, 1.0);
    vec2 lowerBase = vec2(base, 0.0);
    vec2 tip = vec2(1.0, 0.5);
    float upperSlope = (upperBase.y - tip.y) / (upperBase.x - tip.x);
    float lowerSlope = (lowerBase.y - tip.y) / (lowerBase.x - tip.x);
    
    float halfWidth = 0.15;
    float s = step(0.5 - halfWidth, st.t);
    s *= 1.0 - step(0.5 + halfWidth, st.t);
    s *= 1.0 - step(base, st.s);
    
    float t = step(base, materialInput.st.s);
    t *= 1.0 - step(upperSlope * (st.s - upperBase.x) + upperBase.y, st.t);
    t *= step(lowerSlope * (st.s - lowerBase.x) + lowerBase.y, st.t);
    
    material.diffuse = v_color.rgb;
    material.alpha = clamp(s + t, 0.0, 1.0);
    return material;
}
