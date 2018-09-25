uniform samplerCube u_cubeMap;

varying vec3 v_texCoord;

void main()
{
    //vec3 rgb = textureCube(u_cubeMap, normalize(v_texCoord)).rgb;
    vec3 rgb = textureLod(u_cubeMap, normalize(v_texCoord), 8.0).rgb;
    //rgb = czm_gammaCorrect(rgb);
    gl_FragColor = vec4(rgb, czm_morphTime);
}
