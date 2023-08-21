in vec4 position;
in vec3 cubeMapCoordinates;

out vec3 v_cubeMapCoordinates;

void main()
{
    gl_Position = position;
    v_cubeMapCoordinates = cubeMapCoordinates;
}
