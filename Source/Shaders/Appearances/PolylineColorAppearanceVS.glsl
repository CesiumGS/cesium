#ifdef VECTOR_TILE
attribute vec3 currentPosition;
attribute vec3 previousPosition;
attribute vec3 nextPosition;
attribute vec2 expandAndWidth;
attribute float a_batchId;

uniform mat4 u_modifiedModelView;
#else
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 prevPosition3DHigh;
attribute vec3 prevPosition3DLow;
attribute vec3 nextPosition3DHigh;
attribute vec3 nextPosition3DLow;
attribute vec2 expandAndWidth;
attribute vec4 color;

varying vec4 v_color;
#endif

void main() 
{
    float expandDir = expandAndWidth.x;
    float width = abs(expandAndWidth.y) + 0.5;
    bool usePrev = expandAndWidth.y < 0.0;

#ifdef VECTOR_TILE
    vec4 p = u_modifiedModelView * vec4(currentPosition, 1.0);
    vec4 prev = u_modifiedModelView * vec4(previousPosition, 1.0);
    vec4 next = u_modifiedModelView * vec4(nextPosition, 1.0);

    vec4 positionWC = getPolylineWindowCoordinatesEC(p, prev, next, expandDir, width, usePrev);
#else
    vec4 p = czm_computePosition();
    vec4 prev = czm_computePrevPosition();
    vec4 next = czm_computeNextPosition();
    
    v_color = color;

    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev);
#endif

    gl_Position = czm_viewportOrthographic * positionWC;
}
