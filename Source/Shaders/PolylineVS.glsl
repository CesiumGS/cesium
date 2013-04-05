attribute vec4 position3DHigh;
attribute vec4 position3DLow;
attribute vec4 position2DHigh;
attribute vec4 position2DLow;
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

void clipLineSegmentToNearPlane(
    vec3 positionEC,
    vec3 directionEC,
    float magnitude,
    out vec4 positionWC,
    out bool clipped,
    out bool culledByNearPlane)
{
    culledByNearPlane = false;
    clipped = false;
    
    vec3 normal = vec3(0.0, 0.0, -1.0);
    vec3 point = normal * czm_currentFrustum.x;
    vec4 plane = vec4(normal, -dot(normal, point));
    
    float endPoint0Distance = dot(plane.xyz, positionEC) + plane.w;
    float denominator = dot(plane.xyz, directionEC);
    
    if (endPoint0Distance < 0.0 && abs(denominator) < czm_epsilon7)
    {
        culledByNearPlane = true;
    }
    else if (endPoint0Distance < 0.0 && abs(denominator) > czm_epsilon7)
    {
        float t = (-plane.w - dot(plane.xyz, positionEC)) / denominator;
        if (t < 0.0 || t > magnitude)
        {
            culledByNearPlane = true;
        }
        else
        {
            clipped = true;
            positionEC = positionEC + t * directionEC;
        }
    }
    
    positionWC = czm_eyeToWindowCoordinates(vec4(positionEC, 1.0));
}

void main() 
{
    float texCoord = texCoordExpandWidthAndShow.x;
    float expandDir = texCoordExpandWidthAndShow.y;
    float width = texCoordExpandWidthAndShow.z + 0.5;
    float show = texCoordExpandWidthAndShow.w;
    
    vec4 p;
    vec4 prevDir;
    vec4 nextDir;
    
    float segmentMagnitude;
    bool usePrevDirection;

    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz), 1.0);
        prevDir = vec4(decode(prev.xy), 0.0);
        nextDir = vec4(decode(next.xy), 0.0);
        
        segmentMagnitude = abs(position3DLow.w);
        usePrevDirection = position3DLow.w < 0.0;
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy), 1.0);
        prevDir = vec4(decode(prev.zw).zxy, 0.0);
        nextDir = vec4(decode(next.zw).zxy, 0.0);
        
        segmentMagnitude = abs(position2DLow.w);
        usePrevDirection = position2DLow.w < 0.0;
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
                czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz), 
                u_morphTime);
        
        prevDir = czm_columbusViewMorph(decode(prev.xy), decode(prev.zw), u_morphTime);
        nextDir = czm_columbusViewMorph(decode(next.xy), decode(next.zw), u_morphTime);
        prevDir.w = 0.0;
        nextDir.w = 0.0;
        
        segmentMagnitude = abs(position2DLow.w);
        usePrevDirection = position2DLow.w < 0.0;
    }
    
    vec4 endPointWC;
    bool clipped;
    bool culledByNearPlane;
    
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    vec4 nextEC = vec4(normalize((czm_modelView * nextDir).xyz), 0.0);
    vec4 prevEC = vec4(normalize((czm_modelView * prevDir).xyz), 0.0);
    vec3 segmentDirection = (usePrevDirection) ? prevEC.xyz : nextEC.xyz;
    
    clipLineSegmentToNearPlane(positionEC.xyz, segmentDirection, segmentMagnitude, endPointWC, clipped, culledByNearPlane);
    
    if (culledByNearPlane)
    {
        gl_Position = czm_projection * vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    
    if (clipped)
    {
        if (usePrevDirection)
        {
            prevDir = vec4(0.0);
        }
        else
        {
            nextDir = vec4(0.0);
        }
    }
    
    float pixelSize = czm_pixelSizeInMeters * abs(positionEC.z);
    float expandWidth = width * 0.5;
    vec4 p0, p1;
    vec2 direction, nextWC, prevWC;
    
    if (czm_equalsEpsilon(prevDir, vec4(0.0), czm_epsilon7))
    {
        p1 = czm_eyeToWindowCoordinates(vec4(positionEC.xyz + nextEC.xyz * pixelSize, 1.0));
        nextWC = normalize(p1.xy - endPointWC.xy);
        direction = normalize(vec2(-nextWC.y, nextWC.x));
    }
    else if (czm_equalsEpsilon(nextDir, vec4(0.0), czm_epsilon7) || czm_equalsEpsilon(nextDir, -prevDir, czm_epsilon1))
    {
        p0 = czm_eyeToWindowCoordinates(vec4(positionEC.xyz + prevEC.xyz * pixelSize, 1.0));
        prevWC = normalize(p0.xy - endPointWC.xy);
        direction = normalize(vec2(prevWC.y, -prevWC.x));
    }
    else
    {
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
	    float sinAngle = abs(direction.x * nextWC.y - direction.y * nextWC.x);
	    
	    expandWidth = clamp(expandWidth / sinAngle, 0.0, width * 2.0);
    }

    vec4 positionWC = vec4(endPointWC.xy + direction * expandWidth * expandDir, -endPointWC.z, 1.0);
    gl_Position = czm_viewportOrthographic * positionWC * show;
    
#ifndef RENDER_FOR_PICK
    v_textureCoordinates = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
#else
    v_pickColor = pickColor;
#endif
}
