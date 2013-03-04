uniform float fadeInAlpha;
uniform float fadeOutAlpha;
uniform float maxDistance;
uniform bool repeat;
uniform vec3 time;

uniform vec4 color;

float getTime(float t, float coord)
{
    float scalar = 1.0 / maxDistance;
    float q  = distance(t, coord) * scalar;
    if (repeat)
    {
        float r = distance(t, coord + 1.0) * scalar;
        float s = distance(t, coord - 1.0) * scalar;
        q = min(min(r, s), q);
    }
    return clamp(q, 0.0, 1.0);
}

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec2 st = materialInput.st;
    float t = getTime(time.x, st.s);
    float u = getTime(time.y, st.t);
    
    float v = (1.0 - t) * (1.0 - u);
    float alpha = mix(fadeOutAlpha * color.a, fadeInAlpha * color.a, v);
    
    material.diffuse = color.rgb;
    material.alpha = alpha;
    
    return material;
}
