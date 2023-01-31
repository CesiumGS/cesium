uniform samplerCube u_cubeMap;

varying vec3 v_texCoord;

void main()
{
    vec4 color = textureCube(u_cubeMap, normalize(v_texCoord));
    gl_FragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);
}
