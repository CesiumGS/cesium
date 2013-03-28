attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec4 prev;
attribute vec4 next;
attribute vec4 texCoordExpandWidthAndShow;
attribute vec4 pickColor;

#ifndef RENDER_FOR_PICK
varying vec2  v_textureCoordinates;
varying float v_width;
#else
varying vec4  v_pickColor;
#endif

uniform float u_morphTime;

// Unpacks a normal from a vec2 using a spheremap transform
// see 
//    http://aras-p.info/texts/CompactNormalStorage.html#method04spheremap
// for details.
vec3 decode(vec2 enc)
{
    vec2 fenc = enc * 4.0 - 2.0;
    float f = dot(fenc, fenc);
    float g = sqrt(1.0 - f / 4.0);
    
    vec3 n;
    n.xy = fenc * g;
    n.z = 1.0 - f / 2.0;
    return n;
}

void main() 
{
    float texCoord = texCoordExpandWidthAndShow.x;
    float expandDir = texCoordExpandWidthAndShow.y;
    float width = texCoordExpandWidthAndShow.z;
    float show = texCoordExpandWidthAndShow.w;
    
    vec4 p;
    vec4 prevDir;
    vec4 nextDir;

    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh, position3DLow), 1.0);
        prevDir = vec4(decode(prev.xy), 0.0);
        nextDir = vec4(decode(next.xy), 0.0);
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy), 1.0);
        prevDir = vec4(decode(prev.zw).zxy, 0.0);
        nextDir = vec4(decode(next.zw).zxy, 0.0);
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
                czm_translateRelativeToEye(position3DHigh, position3DLow), 
                u_morphTime);
        
        prevDir = czm_columbusViewMorph(decode(prev.xy), decode(prev.zw), u_morphTime);
        nextDir = czm_columbusViewMorph(decode(next.xy), decode(next.zw), u_morphTime);
        prevDir.w = 0.0;
        nextDir.w = 0.0;
    }
    
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    vec4 endPointWC = czm_eyeToWindowCoordinates(positionEC);
    
    float pixelSize = czm_pixelSizeInMeters * abs(positionEC.z);
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
    else if (czm_equalsEpsilon(nextDir, vec4(0.0), czm_epsilon7) || czm_equalsEpsilon(nextDir, -prevDir, czm_epsilon1))
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
	    
	    // The sine of the angle between the two vectors is given by the formula
	    //         |a x b| = |a||b|sin(theta)
	    // which is
	    //     float sinAngle = length(cross(vec3(direction, 0.0), vec3(nextWC, 0.0)));
	    // Because the z components of both vectors are zero, the x and y coordinate will be zero.
	    // Therefore, the sine of the angle is just the z component of the cross product.
	    float sinAngle = direction.y * nextWC.x - direction.x * nextWC.y;
	    
	    expandWidth = clamp(expandWidth / sinAngle, 0.0, width * 2.0);
    }

    vec4 positionWC = vec4(endPointWC.xy + direction * expandWidth * expandDir, endPointWC.zw);
    
    vec4 position;
    position.x = 2.0 * (positionWC.x - czm_viewport.x) / czm_viewport.z - 1.0;
    position.y = 2.0 * (positionWC.y - czm_viewport.y) / czm_viewport.w - 1.0;
    position.z = (positionWC.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];
    position.w = 1.0;
    position /= positionWC.w;
    
    gl_Position = position * show;
    
#ifndef RENDER_FOR_PICK
    v_textureCoordinates = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
#else
    v_pickColor = pickColor;
#endif
}
