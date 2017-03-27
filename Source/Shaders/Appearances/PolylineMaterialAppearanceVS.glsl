attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 prevPosition3DHigh;
attribute vec3 prevPosition3DLow;
attribute vec3 nextPosition3DHigh;
attribute vec3 nextPosition3DLow;
attribute vec2 expandAndWidth;
attribute vec2 st;
attribute float batchId;

varying float v_width;
varying vec2 v_st;
varying float v_angle;

void main()
{
    float expandDir = expandAndWidth.x;
    float width = abs(expandAndWidth.y) + 0.5;
    bool usePrev = expandAndWidth.y < 0.0;

    vec4 p = czm_computePosition();
    vec4 prev = czm_computePrevPosition();
    vec4 next = czm_computeNextPosition();

    // Compute the points in eye coordinates.
    vec4 prevEC = czm_modelViewRelativeToEye * prev;
    vec4 nextEC = czm_modelViewRelativeToEye * next;
    vec4 pEC = czm_modelViewRelativeToEye * p;

    // Compute the positions in clip space.

    vec4 prevClip = czm_viewportOrthographic * prevEC;
    vec4 nextClip = czm_viewportOrthographic * nextEC;
    vec4 pClip = czm_viewportOrthographic * pEC;

    // Determine the relative screen space direction of the line.
    vec2 dir;
    if (usePrev) {
        dir = normalize(pClip.xy - prevClip.xy);
    }
    else {
        dir = normalize(nextClip.xy - pClip.xy);
    }
    v_angle = atan(dir.x, dir.y) - atan(1.0, 0.0);

    // Quantize the angle so it doesn't change rapidly between segments.
    v_angle = floor(v_angle / czm_piOverFour + 0.5) * czm_piOverFour;

    v_width = width;
    v_st = st;

    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev);
    gl_Position = czm_viewportOrthographic * positionWC;
}
