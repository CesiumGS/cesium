attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 normal;

uniform float centralBodyMinimumAltitude;
uniform float LODNegativeToleranceOverDistance;

varying float v_z;

vec4 czm_depthClampNearFarPlane(vec4 vertexInClipCoordinates)
{
    v_z = (0.5 * (vertexInClipCoordinates.z / vertexInClipCoordinates.w) + 0.5) * vertexInClipCoordinates.w;
    vertexInClipCoordinates.z = min(vertexInClipCoordinates.z, vertexInClipCoordinates.w);
    return vertexInClipCoordinates;
}

uniform vec3 u_cameraPosition;
uniform vec3 u_cameraDirection;

/*
vec4 clipPointToNearPlane(vec3 p0, vec3 p1)
{
    vec3 cameraPosition = u_cameraPosition;
    vec3 cameraDirection = -u_cameraDirection;
    float near = czm_entireFrustum.x + 1.0;
    
    //cameraPosition += cameraDirection * near;
    
    vec3 origin = p0 + cameraPosition;
    vec3 diff = p1 + cameraPosition - origin;
    vec3 direction = normalize(diff);
    float magnitude = length(diff);
    
    vec3 planeNormal = cameraDirection;
    float planeDistance = -dot(planeNormal, cameraPosition);
    
    float denominator = dot(planeNormal, direction);

    if (abs(denominator) > czm_epsilon6) {
	    float t = (-planeDistance - dot(planeNormal, origin)) / denominator;
	    if (t >= 0.0 && t <= magnitude) {
	        return czm_modelViewProjection * vec4(origin + t * direction, 1.0);
	    }
    } // else segment is parallel to plane (handle culling);
    
    return czm_modelViewProjectionRelativeToEye * vec4(p0, 1.0);
}
*/

vec4 clipPointToNearPlane(vec3 p0, vec3 p1)
{
    p0 = (czm_modelViewRelativeToEye * vec4(p0, 1.0)).xyz;
    p1 = (czm_modelViewRelativeToEye * vec4(p1, 1.0)).xyz;
    
    vec3 diff = p1 - p0;
    float magnitude = length(diff);
    vec3 direction = normalize(diff);
    float denominator = -direction.z;
    float near = czm_entireFrustum.x;
    bool behindPlane = -(near + p0.z) < 0.0;
    
    bool culledByNearPlane = false;
    
    if (behindPlane && abs(denominator) < czm_epsilon7)
    {
        // point is behind and parallel to the near plane
        culledByNearPlane = true;
    }
    else if (behindPlane && abs(denominator) > czm_epsilon7)
    {
        // find intersection of ray and near plane
        // t = (-plane distance - dot(plane normal, ray origin)) / dot(plane normal, ray direction)
        float t = (near + p0.z) / denominator;
        if (t < 0.0 || t > magnitude)
        {
            // entire segment is behind the near plane
            culledByNearPlane = true;
        }
        else
        {
            // compute intersection with plane slightly offset
            // to prevent precision artifacts
            t += 0.001;
            p0 = p0 + t * direction;
        }
    }
    
    if (culledByNearPlane) {
        // the segment is behind the near plane. push to near plane and
        // slightly offset to prevent precision artifacts
        p0.z = min(p0.z, -(near + 0.001));
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
    vec3 movedPosition = eyePosition + normal * delta;
    
    if (all(equal(normal, vec3(0.0))))
    {
        //gl_Position = clipPointToNearPlane(eyePosition, movedPosition);
        //gl_Position = czm_modelViewProjectionRelativeToEye * position;
        
        eyePosition = (czm_modelViewRelativeToEye * position).xyz;
        //eyePosition.z = min(eyePosition.z, -czm_entireFrustum.x);
        //eyePosition.z = max(eyePosition.z, -czm_currentFrustum.y);
        //gl_Position = czm_projection * vec4(eyePosition, 1.0);
        gl_Position = czm_depthClampNearFarPlane(czm_projection * vec4(eyePosition, 1.0));
    }
    else
    {
        //gl_Position = clipPointToNearPlane(movedPosition, eyePosition);
        gl_Position = czm_depthClampNearFarPlane(clipPointToNearPlane(movedPosition, eyePosition));
    }
    
    //gl_Position = czm_modelViewProjectionRelativeToEye * (position + vec4(normal * delta, 0.0));
}