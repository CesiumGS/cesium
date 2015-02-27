float czm_private_getLambertDiffuseOfMaterial(vec3 lightDirectionEC, czm_material material)
{
    return czm_getLambertDiffuse(lightDirectionEC, material.normal);
}

float czm_private_getSpecularOfMaterial(vec3 lightDirectionEC, vec3 toEyeEC, czm_material material)
{
    return czm_getSpecular(lightDirectionEC, toEyeEC, material.normal, material.shininess);
}

/**
 * Computes a color using the Phong lighting model.
 *
 * @name czm_phong
 * @glslFunction
 *
 * @param {vec3} toEye A normalized vector from the fragment to the eye in eye coordinates.
 * @param {czm_material} material The fragment's material.
 * 
 * @returns {vec4} The computed color.
 * 
 * @example
 * vec3 positionToEyeEC = // ...
 * czm_material material = // ...
 * gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
 *
 * @see czm_getMaterial
 */
vec4 czm_phong(vec3 toEye, czm_material material)
{
    // Diffuse from directional light sources at eye (for top-down)
    float diffuse = czm_private_getLambertDiffuseOfMaterial(vec3(0.0, 0.0, 1.0), material);
    if (czm_sceneMode == czm_sceneMode3D) {
        // (and horizon views in 3D)
        diffuse += czm_private_getLambertDiffuseOfMaterial(vec3(0.0, 1.0, 0.0), material);
    }

    // Specular from sun and pseudo-moon
    float specular = czm_private_getSpecularOfMaterial(czm_sunDirectionEC, toEye, material) + czm_private_getSpecularOfMaterial(czm_moonDirectionEC, toEye, material);

    // Temporary workaround for adding ambient.
    vec3 materialDiffuse = material.diffuse * 0.5;
    
    vec3 ambient = materialDiffuse;
    vec3 color = ambient + material.emission;
    color += materialDiffuse * diffuse;
    color += material.specular * specular;

    return vec4(color, material.alpha);
}

vec4 czm_private_phong(vec3 toEye, czm_material material)
{
    float diffuse = czm_private_getLambertDiffuseOfMaterial(czm_sunDirectionEC, material);
    float specular = czm_private_getSpecularOfMaterial(czm_sunDirectionEC, toEye, material);

    vec3 ambient = vec3(0.0);
    vec3 color = ambient + material.emission;
    color += material.diffuse * diffuse;
    color += material.specular * specular;

    return vec4(color, material.alpha);
}