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

#ifndef RENDER_FOR_PICK
varying vec2  v_textureCoordinates;
varying float v_width;
#else
varying vec4  v_pickColor;
#endif

uniform float u_morphTime;

const vec2 czm_highResolutionSnapScale = vec2(1.0, 1.0);    // TODO

void clipLineSegmentToNearPlane(
    vec3 p0,
    vec3 p1,
    out vec4 positionWC,
    out bool culledByNearPlane)
{
    culledByNearPlane = false;
    
    vec3 p1ToP0 = p1 - p0;
    float magnitude = length(p1ToP0);
    vec3 direction = normalize(p1ToP0);
    float endPoint0Distance =  -(czm_currentFrustum.x + p0.z);
    float denominator = -direction.z;
    
    if (endPoint0Distance < 0.0 && abs(denominator) < czm_epsilon7)
    {
        culledByNearPlane = true;
    }
    else if (endPoint0Distance < 0.0 && abs(denominator) > czm_epsilon7)
    {
        // t = (-plane distance - dot(plane normal, ray origin)) / dot(plane normal, ray direction)
        float t = (czm_currentFrustum.x + p0.z) / denominator;
        if (t < 0.0 || t > magnitude)
        {
            culledByNearPlane = true;
        }
        else
        {
            p0 = p0 + t * direction;
        }
    }
    
    positionWC = czm_eyeToWindowCoordinates(vec4(p0, 1.0));
}

void main() 
{
    float texCoord = texCoordExpandWidthAndShow.x;
    float expandDir = texCoordExpandWidthAndShow.y;
    float width = abs(texCoordExpandWidthAndShow.z) + 0.5;
    bool usePrev = texCoordExpandWidthAndShow.z < 0.0;
    float show = texCoordExpandWidthAndShow.w;
    
    vec4 p, prev, next;
    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz), 1.0);
        prev = vec4(czm_translateRelativeToEye(prevPosition3DHigh.xyz, prevPosition3DLow.xyz), 1.0);
        next = vec4(czm_translateRelativeToEye(nextPosition3DHigh.xyz, nextPosition3DLow.xyz), 1.0);
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy), 1.0);
        prev = vec4(czm_translateRelativeToEye(prevPosition2DHigh.zxy, prevPosition2DLow.zxy), 1.0);
        next = vec4(czm_translateRelativeToEye(nextPosition2DHigh.zxy, nextPosition2DLow.zxy), 1.0);
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
                czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz),
                u_morphTime);
        prev = czm_columbusViewMorph(
                czm_translateRelativeToEye(prevPosition2DHigh.zxy, prevPosition2DLow.zxy),
                czm_translateRelativeToEye(prevPosition3DHigh.xyz, prevPosition3DLow.xyz),
                u_morphTime);
        next = czm_columbusViewMorph(
                czm_translateRelativeToEye(nextPosition2DHigh.zxy, nextPosition2DLow.zxy),
                czm_translateRelativeToEye(nextPosition3DHigh.xyz, nextPosition3DLow.xyz),
                u_morphTime);
    }
    
    vec4 endPointWC, p0, p1;
    bool culledByNearPlane;
    
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    vec4 prevEC = czm_modelViewRelativeToEye * prev;
    vec4 nextEC = czm_modelViewRelativeToEye * next;
    
    clipLineSegmentToNearPlane(prevEC.xyz, positionEC.xyz, p0, culledByNearPlane);
    clipLineSegmentToNearPlane(nextEC.xyz, positionEC.xyz, p1, culledByNearPlane);
    clipLineSegmentToNearPlane(positionEC.xyz, usePrev ? prevEC.xyz : nextEC.xyz, endPointWC, culledByNearPlane);
    
    if (culledByNearPlane)
    {
        gl_Position = czm_projection * vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    
    vec2 prevWC = normalize(p0.xy - endPointWC.xy);
    vec2 nextWC = normalize(p1.xy - endPointWC.xy);
    
    float expandWidth = width * 0.5;
    vec2 direction;

	if (czm_equalsEpsilon(normalize(prev.xyz - p.xyz), vec3(0.0), czm_epsilon1))
	{
	   direction = vec2(-nextWC.y, nextWC.x);
    }
	else if (czm_equalsEpsilon(normalize(next.xyz - p.xyz), vec3(0.0), czm_epsilon1))
	{
        direction = vec2(prevWC.y, -prevWC.x);
    }
    else
    {
	    vec2 normal = vec2(-nextWC.y, nextWC.x);
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
	    float sinAngle = abs(direction.x * nextWC.y - direction.y * nextWC.x);
	    
	    expandWidth = clamp(expandWidth / sinAngle, 0.0, width * 2.0);
    }

    vec2 offset = direction * expandDir * expandWidth * czm_highResolutionSnapScale;
    vec4 positionWC = vec4(endPointWC.xy + offset, -endPointWC.z, 1.0);
    gl_Position = czm_viewportOrthographic * positionWC * show;
    
#ifndef RENDER_FOR_PICK
    v_textureCoordinates = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
#else
    v_pickColor = pickColor;
#endif
}
