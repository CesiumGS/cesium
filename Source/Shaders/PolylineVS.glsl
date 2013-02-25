attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec4 prev;
attribute vec4 next;
attribute vec4 color;
attribute vec4 misc;


#ifndef RENDER_FOR_PICK
varying vec4 v_color;
varying vec4 v_outlineColor;
varying vec2 v_textureCoordinates;
varying float v_width;
varying vec3 v_positionEC;
#else
varying vec4 v_pickColor;
#endif

uniform float u_morphTime;

void main() 
{
    float texCoord = misc.x;
    float expandDir = misc.y;
    float width = misc.z * 0.5;
    float show = misc.w;
    
    vec4 p;
    vec4 prevDir;
    vec4 nextDir;

    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh, position3DLow), 1.0);
        prevDir = vec4(czm_sphericalToCartesianCoordinates(prev.xy), 0.0);
        nextDir = vec4(czm_sphericalToCartesianCoordinates(next.xy), 0.0);
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy), 1.0);
        prevDir = vec4(czm_sphericalToCartesianCoordinates(prev.zw), 0.0);
        nextDir = vec4(czm_sphericalToCartesianCoordinates(next.zw), 0.0);
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
                czm_translateRelativeToEye(position3DHigh, position3DLow), 
                u_morphTime);
        prevDir = czm_columbusViewMorph(
                    czm_sphericalToCartesianCoordinates(prev.xy), 
                    czm_sphericalToCartesianCoordinates(prev.zw), 
                    u_morphTime);
        nextDir = czm_columbusViewMorph(
                    czm_sphericalToCartesianCoordinates(next.xy), 
                    czm_sphericalToCartesianCoordinates(next.zw), 
                    u_morphTime);
        
        prevDir.w = 0.0;
        nextDir.w = 0.0;
    }
    
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    vec4 prevEC = czm_modelView * prevDir;
    vec4 nextEC = czm_modelView * nextDir;
    
    vec3 direction = (prevEC.xyz + nextEC.xyz) * 0.5;
    direction.z = 0.0;
    direction = normalize(direction);
    
    if (direction.x < 0.0)
    {
        expandDir *= -1.0;
    }
    
    float angle = acos(dot(direction, nextEC.xyz));
    if (abs(angle - czm_piOverTwo) > czm_epsilon1)
    {
        width = width / sin(angle);
    }
    
    float pixelSize = czm_pixelSize * abs(positionEC.z);
    direction = direction * expandDir * width * pixelSize;
    
    positionEC = vec4(positionEC.xyz + direction, 1.0);
    gl_Position = czm_projection * positionEC * show;
    
#ifndef RENDER_FOR_PICK
    vec3 alphas = czm_decodeColor(color.b);
    v_color = vec4(czm_decodeColor(color.r), alphas.r);
    v_outlineColor = vec4(czm_decodeColor(color.g), alphas.g);
    v_textureCoordinates = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width * 2.0;
    v_positionEC = positionEC.xyz;
#else
    v_pickColor = color;
#endif
}
