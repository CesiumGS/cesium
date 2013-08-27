float getLambertDiffuse(vec3 lightDirectionEC, vec3 normalEC)
{
    return max(dot(lightDirectionEC, normalEC), 0.0);
}

float getLambertDiffuseOfMaterial(vec3 lightDirectionEC, czm_material material)
{
    return getLambertDiffuse(lightDirectionEC, material.normal);
}

float getSpecular(vec3 lightDirectionEC, vec3 toEyeEC, vec3 normalEC, float shininess)
{
    vec3 toReflectedLight = reflect(-lightDirectionEC, normalEC);
    float specular = max(dot(toReflectedLight, toEyeEC), 0.0);
    return pow(specular, shininess);
}

float getSpecularOfMaterial(vec3 lightDirectionEC, vec3 toEyeEC, czm_material material)
{
    return getSpecular(lightDirectionEC, toEyeEC, material.normal, material.shininess);
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
    // Diffuse from directional light sources at eye (for top-down and horizon views)
    float diffuse = getLambertDiffuseOfMaterial(vec3(0.0, 0.0, 1.0), material) + getLambertDiffuseOfMaterial(vec3(0.0, 1.0, 0.0), material);

    // Specular from sun and pseudo-moon
    float specular = getSpecularOfMaterial(czm_sunDirectionEC, toEye, material) + getSpecularOfMaterial(czm_moonDirectionEC, toEye, material);

    vec3 ambient = vec3(0.0);
    vec3 color = ambient + material.emission;
    color += material.diffuse * diffuse;
    color += material.specular * specular;

    return vec4(color, material.alpha);
}
