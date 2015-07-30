attribute vec4 position;

varying vec4 positionEC;

void main()
{
    positionEC = czm_modelView * position;
    gl_Position = czm_projection * positionEC;
}