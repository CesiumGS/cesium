//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * @private\n\
 */\n\
vec4 czm_translucentPhong(vec3 toEye, czm_material material, vec3 lightDirectionEC)\n\
{\n\
    // Diffuse from directional light sources at eye (for top-down and horizon views)\n\
    float diffuse = czm_getLambertDiffuse(vec3(0.0, 0.0, 1.0), material.normal);\n\
\n\
    if (czm_sceneMode == czm_sceneMode3D) {\n\
        // (and horizon views in 3D)\n\
        diffuse += czm_getLambertDiffuse(vec3(0.0, 1.0, 0.0), material.normal);\n\
    }\n\
\n\
    diffuse = clamp(diffuse, 0.0, 1.0);\n\
\n\
    float specular = czm_getSpecular(lightDirectionEC, toEye, material.normal, material.shininess);\n\
\n\
    // Temporary workaround for adding ambient.\n\
    vec3 materialDiffuse = material.diffuse * 0.5;\n\
\n\
    vec3 ambient = materialDiffuse;\n\
    vec3 color = ambient + material.emission;\n\
    color += materialDiffuse * diffuse * czm_lightColor;\n\
    color += material.specular * specular * czm_lightColor;\n\
\n\
    return vec4(color, material.alpha);\n\
}\n\
";
