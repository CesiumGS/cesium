attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 normal;

uniform float centralBodyMinimumAltitude;
uniform float LODNegativeToleranceOverDistance;

varying float v_z;

vec4 czm_depthClampNearFarPlane(vec4 vertexInClipCoordinates)
{
    //v_z = (0.5 * (vertexInClipCoordinates.z / vertexInClipCoordinates.w) + 0.5) * vertexInClipCoordinates.w;
    //vertexInClipCoordinates.z = min(vertexInClipCoordinates.z, vertexInClipCoordinates.w);
    return vertexInClipCoordinates;
}

vec4 clipPointToPlane(vec3 p0, vec3 p1, bool nearPlane)
{
    float planeDistance = nearPlane ? czm_entireFrustum.x : czm_entireFrustum.y;
    //float offset = nearPlane ? 0.001 : -0.001;
    float offset = 0.001;
    
    p0 = (czm_modelViewRelativeToEye * vec4(p0, 1.0)).xyz;
    p1 = (czm_modelViewRelativeToEye * vec4(p1, 1.0)).xyz;
    
    vec3 diff = p1 - p0;
    float magnitude = length(diff);
    vec3 direction = normalize(diff);
    float denominator = -direction.z;
    float pointDistance = -(planeDistance + p0.z);
    bool behindPlane = nearPlane ? pointDistance < 0.0 : pointDistance > 0.0;
    
    bool culledByPlane = false;
    
    if (behindPlane && abs(denominator) < czm_epsilon7)
    {
        // point is behind and parallel to the plane
        culledByPlane = true;
    }
    else if (behindPlane && abs(denominator) > czm_epsilon7)
    {
        // find intersection of ray and the plane
        // t = (-dot(plane normal, point on plane) - dot(plane normal, ray origin)) / dot(plane normal, ray direction)
        float t = (planeDistance + p0.z) / denominator;
        if (t < 0.0 || t > magnitude)
        {
            // entire segment is behind the plane
            culledByPlane = true;
        }
        else
        {
            // compute intersection with plane slightly offset
            // to prevent precision artifacts
            t += offset;
            p0 = p0 + t * direction;
        }
    }
    
    if (culledByPlane) {
        // the segment is behind the plane. push to plane and
        // slightly offset to prevent precision artifacts
        //p0.z = min(p0.z, -(planeDistance + offset));
    }
    
    return czm_projection * vec4(p0, 1.0);
}

void main()
{
    vec4 position = czm_translateRelativeToEye(positionHigh, positionLow);
    
    //
    // Make sure the vertex is moved down far enough to cover the central body
    //
    float delta = 1.0;//min(centralBodyMinimumAltitude, LODNegativeToleranceOverDistance * length(position.xyz));
    
    //
    // Move vertex down. This is not required if it belongs to a top
    // cap or top of the wall, in which case it was already moved up just
    // once on the CPU so the normal will be (0, 0, 0).
    //
    // Moving the vertex down is a function of the view parameters so
    // it is done here to avoid buring CPU time.
    //
    
    vec3 eyePosition = position.xyz;
    vec3 movedPosition = position.xyz + normal * delta;
    
    if (all(equal(normal, vec3(0.0))))
    {
        //gl_Position = clipPointToPlane(eyePosition, movedPosition, false);
        gl_Position = czm_depthClampNearFarPlane(clipPointToPlane(eyePosition, movedPosition, false));
        //gl_Position = czm_depthClampNearFarPlane(clipPointToPlane(movedPosition, eyePosition, false));
        
        //gl_Position = czm_modelViewProjectionRelativeToEye * (position + vec4(normal * delta, 0.0));
        //gl_Position = czm_depthClampNearFarPlane(czm_modelViewProjectionRelativeToEye * (position + vec4(normal * delta, 0.0)));
        
        //eyePosition = (czm_modelViewRelativeToEye * vec4(eyePosition, 1.0)).xyz;
        //eyePosition.z = max(eyePosition.z, -(czm_currentFrustum.y + 0.001));
        //gl_Position = czm_projection * vec4(eyePosition, 1.0);
    }
    else
    {
        //gl_Position = clipPointToNearPlane(movedPosition, eyePosition);
        gl_Position = czm_depthClampNearFarPlane(clipPointToPlane(movedPosition, eyePosition, true));
        
        //gl_Position = czm_modelViewProjectionRelativeToEye * (position + vec4(normal * delta, 0.0));
        //gl_Position = czm_depthClampNearFarPlane(czm_modelViewProjectionRelativeToEye * (position + vec4(normal * delta, 0.0)));
    }
}
