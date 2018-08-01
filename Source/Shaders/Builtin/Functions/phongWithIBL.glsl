vec4 czm_phongWithIBL(vec3 positionEC, czm_material material)
{
    vec3 toEye = normalize(-positionEC);
    vec3 positionWC = (czm_inverseView * vec4(positionEC, 1.)).xyz;
    vec3 sunColor = czm_sunColor.rgb + czm_sunColor.a;
    vec3 iblColor = czm_getIBLColor(toEye, positionWC, material.normal, material.diffuse, material.roughness);

    vec3 diffuseIBL = iblColor * mix(material.diffuse, vec3(1., 1., 1.), 0.6);
    vec3 color = material.diffuse + diffuseIBL * 0.4;
    color = czm_gammaCorrect(color);

    // "Unlit" camera lighting
    //vec3 diffuseColor = material.diffuse * czm_getLambertDiffuse(vec3(0.0, 0.0, 1.0), material.normal);
    //color += diffuseColor;

#define USE_SUN_LIGHTING

#ifdef USE_SUN_LIGHTING
    //float sunDiffuse = czm_private_getLambertDiffuseOfMaterial(czm_sunDirectionEC, material);
    //float sunSpecular = czm_private_getSpecularOfMaterial(czm_sunDirectionEC, toEye, material);

    //color += material.diffuse * sunDiffuse * sunColor;
    //color += material.specular * sunSpecular;
#else
    //float cameraDiffuse = czm_private_getLambertDiffuseOfMaterial(vec3(0.0, 0.0, 1.0), material);
    //color += material.diffuse * cameraDiffuse;// * sunColor;
#endif

    return vec4(color, material.alpha);
}
