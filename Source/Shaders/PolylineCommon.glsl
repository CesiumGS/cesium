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

vec4 getPolylineWindowCoordinatesEC(vec4 positionEC, vec4 prevEC, vec4 nextEC, float expandDirection, float width, bool usePrevious, out float angle)
{
    vec4 endPointWC, p0, p1;
    bool culledByNearPlane, clipped;

#ifdef POLYLINE_DASH
    // Compute the window coordinates of the points.
    vec4 positionWindow = czm_eyeToWindowCoordinates(positionEC);
    vec4 previousWindow = czm_eyeToWindowCoordinates(prevEC);
    vec4 nextWindow = czm_eyeToWindowCoordinates(nextEC);

    // Determine the relative screen space direction of the line.
    vec2 lineDir;
    if (usePrevious) {
        lineDir = normalize(positionWindow.xy - previousWindow.xy);
    }
    else {
        lineDir = normalize(nextWindow.xy - positionWindow.xy);
    }
    angle = atan(lineDir.x, lineDir.y) - 1.570796327; // precomputed atan(1,0)

    // Quantize the angle so it doesn't change rapidly between segments.
    angle = floor(angle / czm_piOverFour + 0.5) * czm_piOverFour;
#endif

    clipLineSegmentToNearPlane(prevEC.xyz, positionEC.xyz, p0, clipped, culledByNearPlane);
    clipLineSegmentToNearPlane(nextEC.xyz, positionEC.xyz, p1, clipped, culledByNearPlane);
    clipLineSegmentToNearPlane(positionEC.xyz, usePrevious ? prevEC.xyz : nextEC.xyz, endPointWC, clipped, culledByNearPlane);

    if (culledByNearPlane)
    {
        return vec4(0.0, 0.0, 0.0, 1.0);
    }

    vec2 prevWC = normalize(p0.xy - endPointWC.xy);
    vec2 nextWC = normalize(p1.xy - endPointWC.xy);

    float expandWidth = width * 0.5;
    vec2 direction;

#ifdef CLIP_POLYLINE
    if (clipped)
    {
        if (prevEC.z - positionEC.z < 0.0)
        {
            direction = vec2(prevWC.y, -prevWC.x);
        }
        else
        {
            direction = vec2(-prevWC.y, prevWC.x);
        }
    }
    else
#endif
    if (czm_equalsEpsilon(prevEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1) || czm_equalsEpsilon(prevWC, -nextWC, czm_epsilon1))
    {
        direction = vec2(-nextWC.y, nextWC.x);
    }
    else if (czm_equalsEpsilon(nextEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1))
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

    vec2 offset = direction * expandDirection * expandWidth * czm_pixelRatio;
    return vec4(endPointWC.xy + offset, -endPointWC.z, 1.0);
}

vec4 getPolylineWindowCoordinates(vec4 position, vec4 previous, vec4 next, float expandDirection, float width, bool usePrevious, out float angle)
{
    vec4 positionEC = czm_modelViewRelativeToEye * position;
    vec4 prevEC = czm_modelViewRelativeToEye * previous;
    vec4 nextEC = czm_modelViewRelativeToEye * next;
    return getPolylineWindowCoordinatesEC(positionEC, prevEC, nextEC, expandDirection, width, usePrevious, angle);
}
