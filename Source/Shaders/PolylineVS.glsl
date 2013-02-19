attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec4 prev;
attribute vec4 next;
attribute vec4 color;
attribute vec4 misc;

varying vec4 v_color;

uniform float u_morphTime;

void main() 
{
    float texCoord = misc.x;
    float expandDir = misc.y;
    float width = misc.z;
    float show = misc.w;
    
    vec4 p;

    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh, position3DLow), 1.0);
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy), 1.0);
    }
    else
    {
        p = czm_columbusViewMorph(
        	czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
            czm_translateRelativeToEye(position3DHigh, position3DLow), 
            u_morphTime);
    }
    
    p.z += expandDir * 100000.0;
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    //positionEC.xyz *= show;
    
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    //positionWC.xy += (vec2(0.0, width * expandDir) * czm_highResolutionSnapScale);

    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
    
    v_color = color;
}
