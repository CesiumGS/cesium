uniform samplerCube u_cubeMap;
uniform float u_indexOfRefractionRatio;
uniform float u_refractivity;

//x,y,z : normal in eye space
vec3 agi_getMaterialNormal(float zDistance, vec2 st, vec3 str, mat3 tangentToEyeMatrix, vec3 viewWC)
{
    vec3 normalTangentSpace = vec3(0.0, 0.0, 1.0);
    vec3 normalEC = normalize(tangentToEyeMatrix * normalTangentSpace);
    
    return normalEC;
}

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(float zDistance, vec2 st, vec3 str, mat3 tangentToEyeMatrix, vec3 viewWC)
{
    //Refraction
    vec3 normalEC = agi_getMaterialNormal(zDistance, st, str, tangentToEyeMatrix, viewWC);
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    vec3 refractedWC = refract(viewWC, -normalWC, u_indexOfRefractionRatio);
    vec3 refractedValue = textureCube(u_cubeMap, refractedWC).rgb;
    refractedValue *= u_refractivity;

    return vec4(refractedValue, 1.0);
}

//x,y,z : specular color
//    w : specular intensity
vec4 agi_getMaterialSpecularComponent(float zDistance, vec2 st, vec3 str)
{
    return vec4(1.0, 1.0, 1.0, 1.0);
}

//x,y,z : emission color. In other words per-object ambient color.
vec3 agi_getMaterialEmissionComponent(float zDistance, vec2 st, vec3 str)
{
    return vec3(0.0, 0.0, 0.0);
}
