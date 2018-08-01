vec4 czm_phongWithIBL(vec3 positionEC, czm_material material)
{
    vec3 toEye = normalize(-positionEC);
    vec3 positionWC = (czm_inverseView * vec4(positionEC, 1.)).xyz;
    //vec3 sunColor = czm_sunColor.rgb + czm_sunColor.a;
    vec3 iblColor = czm_getIBLColor(toEye, positionWC, material);
    vec3 lightColor = vec3(1.5, 1.4, 1.2);

    vec3 color = mix(material.emission, iblColor, 0.4);

#define USE_SUN_LIGHTING

#ifdef USE_SUN_LIGHTING
    // TODO: sun on other side?
    float sunDiffuse = czm_getLambertDiffuse(czm_sunDirectionEC, material.normal);
    float sunSpecular = czm_getSpecular(czm_sunDirectionEC, toEye, material.normal, material.shininess);

    color += material.diffuse * sunDiffuse * lightColor;
    color += material.specularColor * sunSpecular * lightColor;
#else
    vec3 diffuseColor = material.diffuse * lightColor * czm_getLambertDiffuse(vec3(0.0, 0.0, 1.0), material.normal);
    color += diffuseColor;
#endif

    color = czm_gammaCorrect(color);
    return vec4(color, material.alpha);
}
