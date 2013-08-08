attribute vec4 position3DAndHeight;
attribute vec2 textureCoordinates;

uniform vec3 u_center3D;
uniform mat4 u_modifiedModelView;
uniform vec4 u_tileExtent;

// Uniforms for 2D Mercator projection
uniform vec2 u_southAndNorthLatitude;
uniform vec3 u_southMercatorYLowAndHighAndOneOverHeight;

uniform mat4 czm_projection;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec2 v_textureCoordinates;

// These functions are generated at runtime.
//vec4 getPosition(vec3 position3DWC);
//float get2DYPositionFraction();

vec4 getPosition3DMode(vec3 position3DWC)
{
    return czm_projection * (u_modifiedModelView * vec4(position3DAndHeight.xyz, 1.0));
}

void main() 
{
    vec3 position3DWC = position3DAndHeight.xyz + u_center3D;

    gl_Position = getPosition3DMode(position3DWC);
    gl_Position.z += gl_Position.w;
    gl_Position.z *= 0.5;
    
    v_textureCoordinates = textureCoordinates;
}
