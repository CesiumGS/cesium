attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec3 prevPosition3DHigh;
attribute vec3 prevPosition3DLow;
attribute vec3 prevPosition2DHigh;
attribute vec3 prevPosition2DLow;
attribute vec3 nextPosition3DHigh;
attribute vec3 nextPosition3DLow;
attribute vec3 nextPosition2DHigh;
attribute vec3 nextPosition2DLow;
attribute vec4 texCoordExpandWidthAndShow;
attribute vec4 pickColor;

varying vec2  v_st;
varying float v_width;
varying vec4  czm_pickColor;

void main() 
{
    float texCoord = texCoordExpandWidthAndShow.x;
    float expandDir = texCoordExpandWidthAndShow.y;
    float width = abs(texCoordExpandWidthAndShow.z) + 0.5;
    bool usePrev = texCoordExpandWidthAndShow.z < 0.0;
    float show = texCoordExpandWidthAndShow.w;
    
    vec4 p, prev, next;
    if (czm_morphTime == 1.0)
    {
        p = czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz);
        prev = czm_translateRelativeToEye(prevPosition3DHigh.xyz, prevPosition3DLow.xyz);
        next = czm_translateRelativeToEye(nextPosition3DHigh.xyz, nextPosition3DLow.xyz);
    }
    else if (czm_morphTime == 0.0)
    {
        p = czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy);
        prev = czm_translateRelativeToEye(prevPosition2DHigh.zxy, prevPosition2DLow.zxy);
        next = czm_translateRelativeToEye(nextPosition2DHigh.zxy, nextPosition2DLow.zxy);
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
                czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz),
                czm_morphTime);
        prev = czm_columbusViewMorph(
                czm_translateRelativeToEye(prevPosition2DHigh.zxy, prevPosition2DLow.zxy),
                czm_translateRelativeToEye(prevPosition3DHigh.xyz, prevPosition3DLow.xyz),
                czm_morphTime);
        next = czm_columbusViewMorph(
                czm_translateRelativeToEye(nextPosition2DHigh.zxy, nextPosition2DLow.zxy),
                czm_translateRelativeToEye(nextPosition3DHigh.xyz, nextPosition3DLow.xyz),
                czm_morphTime);
    }
    
    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev);
    gl_Position = czm_viewportOrthographic * positionWC * show;
    
    v_st = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
    czm_pickColor = pickColor;
}
