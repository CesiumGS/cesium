attribute vec4 position;

void main() 
{
    gl_Position = czm_modelViewProjection * position;
}
