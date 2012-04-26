attribute vec4 position;

varying vec4 positionEC;

void main()
{
    positionEC = agi_modelView * position;
    gl_Position = agi_projection * positionEC;
}