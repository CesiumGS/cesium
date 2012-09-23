attribute vec3 position2D;
//attribute vec3 position3D;
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;
attribute float show;

varying vec4 v_color;

uniform float u_morphTime;

void main() 
{
/*

#ifdef GROUND_TRACK
    vec4 p = czm_columbusViewMorph(vec3(0.0, position2D.xy), position3D, u_morphTime);
#elif defined(HEIGHT_TRACK)
    vec4 p = czm_columbusViewMorph(vec3(position2D.z, position2D.x, 10000000.0), position3D, u_morphTime);
#else
    vec4 p = czm_columbusViewMorph(position2D.zxy, position3D, u_morphTime);
#endif

    gl_Position = czm_modelViewProjection * p * show;                      // position in clip coordinates

*/


    vec3 highDifference = position3DHigh - czm_encodedCameraPositionMCHigh;
    vec3 lowDifference = position3DLow - czm_encodedCameraPositionMCLow;
    gl_Position = czm_modelViewProjectionRelativeToEye * vec4(highDifference + lowDifference, 1.0) * show;
    
    v_color = color;
}
