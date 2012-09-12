attribute vec3 position3D;
attribute vec2 textureCoordinates;

uniform float u_morphTime;
uniform int u_mode;

uniform vec3 u_center3D;
uniform vec2 u_center2D;
uniform mat4 u_modifiedModelView;
uniform mat4 u_modifiedModelViewProjection;
uniform vec4 u_tileExtent;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;

varying vec2 v_textureCoordinates;

void main() 
{
    vec3 position3DWC = position3D + u_center3D;
    if (u_mode == czm_scene3D) {
        vec4 position3D4 = vec4(position3D, 1.0);
        v_positionEC = (u_modifiedModelView * position3D4).xyz;
        gl_Position = u_modifiedModelViewProjection * position3D4;
    }
    else if (u_mode == czm_scene2D) {
        v_positionEC = (czm_modelView * vec4(position3DWC, 1.0)).xyz;
        vec3 rtcPosition2D = vec3(0.0, mix(u_tileExtent.st, u_tileExtent.pq, textureCoordinates));  
        gl_Position = u_modifiedModelViewProjection * vec4(rtcPosition2D, 1.0);
    }
    else {
        vec3 position2DWC = vec3(0.0, mix(u_tileExtent.st, u_tileExtent.pq, textureCoordinates));
        v_positionEC = (czm_modelView * vec4(position3DWC, 1.0)).xyz;
        vec4 position = czm_columbusViewMorph(position2DWC, position3DWC, u_morphTime);
        gl_Position = czm_modelViewProjection * position;
    }
    
    AtmosphereColor atmosphereColor = computeGroundAtmosphereFromSpace(position3DWC);

    v_positionMC = position3DWC;                                 // position in model coordinates
    v_mieColor = atmosphereColor.mie;
    v_rayleighColor = atmosphereColor.rayleigh;
    v_textureCoordinates = textureCoordinates;
}

