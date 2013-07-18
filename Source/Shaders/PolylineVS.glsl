attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 positionMorphHigh;
attribute vec3 positionMorphLow;
attribute vec3 prevPositionHigh;
attribute vec3 prevPositionLow;
attribute vec3 prevPositionMorphHigh;
attribute vec3 prevPositionMorphLow;
attribute vec3 nextPositionHigh;
attribute vec3 nextPositionLow;
attribute vec3 nextPositionMorphHigh;
attribute vec3 nextPositionMorphLow;
attribute vec4 texCoordExpandWidthAndShow;
attribute vec4 pickColor;

varying vec2  v_textureCoordinates;
varying float v_width;
varying vec4  czm_pickColor;

const vec2 czm_highResolutionSnapScale = vec2(1.0, 1.0);    // TODO

void clipLineSegmentToNearPlane(
    vec3 p0,
    vec3 p1,
    out vec4 positionWC,
    out bool clipped,
    out bool culledByNearPlane)
{
    culledByNearPlane = false;
    clipped = false;
    
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
            clipped = true;
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
    if (czm_morphTime == 1.0)
    {
        p = czm_translateRelativeToEye(positionHigh.xyz, positionLow.xyz);
        prev = czm_translateRelativeToEye(prevPositionHigh.xyz, prevPositionLow.xyz);
        next = czm_translateRelativeToEye(nextPositionHigh.xyz, nextPositionLow.xyz);
    }
    else if (czm_morphTime == 0.0)
    {
        p = czm_translateRelativeToEye(positionHigh.zxy, positionLow.zxy);
        prev = czm_translateRelativeToEye(prevPositionHigh.zxy, prevPositionLow.zxy);
        next = czm_translateRelativeToEye(nextPositionHigh.zxy, nextPositionLow.zxy);
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(positionHigh.zxy, positionLow.zxy),
                czm_translateRelativeToEye(positionMorphHigh.xyz, positionMorphLow.xyz),
                czm_morphTime);
        prev = czm_columbusViewMorph(
                czm_translateRelativeToEye(prevPositionHigh.zxy, prevPositionLow.zxy),
                czm_translateRelativeToEye(prevPositionMorphHigh.xyz, prevPositionMorphLow.xyz),
                czm_morphTime);
        next = czm_columbusViewMorph(
                czm_translateRelativeToEye(nextPositionHigh.zxy, nextPositionLow.zxy),
                czm_translateRelativeToEye(nextPositionMorphHigh.xyz, nextPositionMorphLow.xyz),
                czm_morphTime);
    }
    
    vec4 endPointWC, p0, p1;
    bool culledByNearPlane, clipped;
    
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    vec4 prevEC = czm_modelViewRelativeToEye * prev;
    vec4 nextEC = czm_modelViewRelativeToEye * next;
    
    clipLineSegmentToNearPlane(prevEC.xyz, positionEC.xyz, p0, clipped, culledByNearPlane);
    clipLineSegmentToNearPlane(nextEC.xyz, positionEC.xyz, p1, clipped, culledByNearPlane);
    clipLineSegmentToNearPlane(positionEC.xyz, usePrev ? prevEC.xyz : nextEC.xyz, endPointWC, clipped, culledByNearPlane);
    
    if (culledByNearPlane)
    {
        gl_Position = czm_projection * vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    
    vec2 prevWC = normalize(p0.xy - endPointWC.xy);
    vec2 nextWC = normalize(p1.xy - endPointWC.xy);
    
    float expandWidth = width * 0.5;
    vec2 direction;

	if (czm_equalsEpsilon(normalize(prev.xyz - p.xyz), vec3(0.0), czm_epsilon1) || czm_equalsEpsilon(prevWC, -nextWC, czm_epsilon1))
	{
	    direction = vec2(-nextWC.y, nextWC.x);
    }
	else if (czm_equalsEpsilon(normalize(next.xyz - p.xyz), vec3(0.0), czm_epsilon1) || clipped)
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
    
    v_textureCoordinates = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
    czm_pickColor = pickColor;
}
