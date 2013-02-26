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
    
    float d = czm_pointLineDistance(ray, vec3(v_positionWC, 0.0));
    d /= v_width * 2.0;
    d = 1.0 - 6.0 * d;
    
    material.diffuse = v_color.rgb;
    material.emission = v_color.rgb * d;
    material.alpha = d;
    
    return material;
}
