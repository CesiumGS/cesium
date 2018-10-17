varying vec3 v_cubeMapCoordinates;
uniform samplerCube cubeMap;

void main()
{
    vec4 rgbm = textureCube(cubeMap, v_cubeMapCoordinates);
    float m = rgbm.a * 16.0;
    vec3 r = rgbm.rgb * m;
    gl_FragColor = vec4(r * r, 1.0);
}
