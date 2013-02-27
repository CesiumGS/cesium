varying vec2 v_positionWC;
varying vec2 v_endPointWC;
varying vec2 v_nextWC;

varying vec4 v_color;
varying float v_width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    czm_ray ray;
    ray.origin = vec3(v_endPointWC, 0.0);
    ray.direction = vec3(normalize(v_nextWC), 0.0);
    
    float interiorWidth = 0.5;
    
    float d = czm_pointLineDistance(ray, vec3(v_positionWC, 0.0));
    float alpha = 1.0 - 12.0 * d / (v_width * 12.0);
    vec4 color = vec4(v_color.rgb * alpha, alpha);
    
    //d = 1.0 - step(interiorWidth, d);
    //vec4 currentColor = d * v_color;
    //material.diffuse = currentColor.rgb;
    
    material.emission = color.rgb;
    material.alpha = alpha;
    
    return material;
}
