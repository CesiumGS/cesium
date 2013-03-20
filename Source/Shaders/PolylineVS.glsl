attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec4 prev;
attribute vec4 next;
attribute vec4 misc;
attribute vec4 pickColor;

#ifndef RENDER_FOR_PICK
varying vec2  v_textureCoordinates;
varying float v_width;
varying vec3  v_positionEC;
#else
varying vec4  v_pickColor;
#endif

uniform float u_morphTime;

void main() 
{
    float texCoord = misc.x;
    float expandDir = misc.y;
    float width = misc.z;
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
        prevDir = vec4(czm_sphericalToCartesianCoordinates(prev.zw).zxy, 0.0);
        nextDir = vec4(czm_sphericalToCartesianCoordinates(next.zw).zxy, 0.0);
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
    vec4 endPointWC = czm_eyeToWindowCoordinates(positionEC);
    
    float pixelSize = czm_pixelSize * abs(positionEC.z);
    float expandWidth = width * 0.5;
    vec4 prevEC, nextEC, p0, p1;
    vec2 direction, nextWC, prevWC;
    
    if (czm_equalsEpsilon(prevDir, vec4(0.0), czm_epsilon7))
    {
        nextEC = czm_modelView * nextDir;
        p1 = czm_eyeToWindowCoordinates(vec4(positionEC.xyz + nextEC.xyz * pixelSize, 1.0));
        nextWC = normalize(p1.xy - endPointWC.xy);
        direction = normalize(vec2(-nextWC.y, nextWC.x));
    }
    else if (czm_equalsEpsilon(nextDir, vec4(0.0), czm_epsilon7))
    {
        prevEC = czm_modelView * prevDir;
        p0 = czm_eyeToWindowCoordinates(vec4(positionEC.xyz + prevEC.xyz * pixelSize, 1.0));
        prevWC = normalize(p0.xy - endPointWC.xy);
        direction = normalize(vec2(prevWC.y, -prevWC.x));
    }
    else
    {
	    prevEC = czm_modelView * prevDir;
	    nextEC = czm_modelView * nextDir;
	    
	    p0 = czm_eyeToWindowCoordinates(vec4(positionEC.xyz + prevEC.xyz * pixelSize, 1.0));
	    p1 = czm_eyeToWindowCoordinates(vec4(positionEC.xyz + nextEC.xyz * pixelSize, 1.0));
	    
	    prevWC = normalize(p0.xy - endPointWC.xy);
	    nextWC = normalize(p1.xy - endPointWC.xy);
	    vec2 normal = normalize(vec2(-nextWC.y, nextWC.x));
	    
	    direction = normalize((nextWC + prevWC) * 0.5);
	    if (dot(direction, normal) < 0.0)
	    {
	        direction = -direction;
	    }
	    
	    float angle = acos(dot(direction, nextWC));
	    float sinAngle = sin(angle);
	    expandWidth = clamp(expandWidth / sinAngle, 0.0, width * 2.0);
    }

    vec4 positionWC = vec4(endPointWC.xy + direction * expandWidth * expandDir, endPointWC.zw);
    gl_Position = czm_projection * czm_windowToEyeCoordinates(positionWC) * show;
    
#ifndef RENDER_FOR_PICK
    v_textureCoordinates = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
    v_positionEC = positionEC.xyz;
#else
    v_pickColor = pickColor;
#endif
}
