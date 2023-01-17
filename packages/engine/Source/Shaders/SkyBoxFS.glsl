uniform samplerCube u_cubeMap;

in vec3 v_texCoord;

void main()
{
    vec4 color = czm_textureCube(u_cubeMap, normalize(v_texCoord));
    out_FragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);
}
