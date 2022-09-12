attribute vec4 position;
attribute vec3 cubeMapCoordinates;

varying vec3 v_cubeMapCoordinates;

void main()
{
    gl_Position = position;
    v_cubeMapCoordinates = cubeMapCoordinates;
}
