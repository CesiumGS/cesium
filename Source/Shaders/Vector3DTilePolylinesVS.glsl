attribute vec4 currentPosition;
attribute vec4 previousPosition;
attribute vec4 nextPosition;
attribute vec2 expandAndWidth;
attribute float a_batchId;

uniform mat4 u_modifiedModelView;

void main()
{
    float expandDir = expandAndWidth.x;
    float width = abs(expandAndWidth.y) + 0.5;
    bool usePrev = expandAndWidth.y < 0.0;

    vec4 p = u_modifiedModelView * currentPosition;
    vec4 prev = u_modifiedModelView * previousPosition;
    vec4 next = u_modifiedModelView * nextPosition;

    float angle;
    vec4 positionWC = getPolylineWindowCoordinatesEC(p, prev, next, expandDir, width, usePrev, angle);
    gl_Position = czm_viewportOrthographic * positionWC;
}
