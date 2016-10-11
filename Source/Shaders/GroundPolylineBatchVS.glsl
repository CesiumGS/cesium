attribute vec3 currentPosition;
attribute vec3 previousPosition;
attribute vec3 nextPosition;
attribute vec2 expandAndWidth;
attribute float a_batchId;

uniform mat4 u_modifiedModelView;

void main()
{
    float expandDir = expandAndWidth.x;
    float width = abs(expandAndWidth.y) + 0.5;
    bool usePrev = expandAndWidth.y < 0.0;

    vec4 p = u_modifiedModelView * vec4(currentPosition, 1.0);
    vec4 prev = u_modifiedModelView * vec4(previousPosition, 1.0);
    vec4 next = u_modifiedModelView * vec4(nextPosition, 1.0);

    vec4 positionWC = getPolylineWindowCoordinatesEC(p, prev, next, expandDir, width, usePrev);
    gl_Position = czm_viewportOrthographic * positionWC;
}
