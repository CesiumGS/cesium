in vec3 position3DHigh;
in vec3 position3DLow;
in vec3 prevPosition3DHigh;
in vec3 prevPosition3DLow;
in vec3 nextPosition3DHigh;
in vec3 nextPosition3DLow;
in vec2 expandAndWidth;
in vec4 color;
in float batchId;

out vec4 v_color;

void main()
{
    float expandDir = expandAndWidth.x;
    float width = abs(expandAndWidth.y) + 0.5;
    bool usePrev = expandAndWidth.y < 0.0;

    vec4 p = czm_computePosition();
    vec4 prev = czm_computePrevPosition();
    vec4 next = czm_computeNextPosition();

    float angle;
    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev, angle);
    gl_Position = czm_viewportOrthographic * positionWC;

    v_color = color;
}
