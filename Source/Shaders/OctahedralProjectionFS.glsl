varying vec3 v_cubeMapCoordinates;
uniform samplerCube cubeMap;

void main()
{
    gl_FragColor = textureCube(cubeMap, v_cubeMapCoordinates);
}
