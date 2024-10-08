in vec4 position;

out vec4 positionEC;

void main()
{
    positionEC = czm_modelView * position;
    gl_Position = czm_modelViewProjection * position;

    czm_vertexLogDepth();
}
