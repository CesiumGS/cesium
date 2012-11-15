uniform samplerCube u_cubeMap;

varying vec3 texCoord;

void main()
{
    gl_FragColor = textureCube(u_cubeMap, normalize(texCoord));
}
