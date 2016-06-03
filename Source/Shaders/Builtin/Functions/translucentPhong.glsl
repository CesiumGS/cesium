/**
 * @private
 */
vec4 czm_translucentPhong(vec3 toEye, czm_material material)
{
    // Diffuse from directional light sources at eye (for top-down and horizon views)
    float diffuse = czm_getLambertDiffuse(vec3(0.0, 0.0, 1.0), material.normal);
    
    if (czm_sceneMode == czm_sceneMode3D) {
        // (and horizon views in 3D)
        diffuse += czm_getLambertDiffuse(vec3(0.0, 1.0, 0.0), material.normal);
    }
    
    diffuse = clamp(diffuse, 0.0, 1.0);

    // Specular from sun and pseudo-moon
    float specular = czm_getSpecular(czm_sunDirectionEC, toEye, material.normal, material.shininess);
    specular += czm_getSpecular(czm_moonDirectionEC, toEye, material.normal, material.shininess);

    // Temporary workaround for adding ambient.
    vec3 materialDiffuse = material.diffuse * 0.5;

    vec3 ambient = materialDiffuse;
    vec3 color = ambient + material.emission;
    color += materialDiffuse * diffuse;
    color += material.specular * specular;

    return vec4(color, material.alpha);
}