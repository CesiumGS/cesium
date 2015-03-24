attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 normal;

uniform float centralBodyMinimumAltitude;
uniform float LODNegativeToleranceOverDistance;

varying float v_z;

vec4 czm_depthClampNearFarPlane(vec4 vertexInClipCoordinates)
{
    v_z = (0.5 * (vertexInClipCoordinates.z / vertexInClipCoordinates.w) + 0.5) * vertexInClipCoordinates.w;
    vertexInClipCoordinates.z = max(min(vertexInClipCoordinates.z, vertexInClipCoordinates.w), -vertexInClipCoordinates.w);
    return vertexInClipCoordinates;
}

uniform vec3 u_cameraPosition;
uniform vec3 u_cameraDirection;

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

/*
vec4 clipPointToNearPlane(vec3 p0, vec3 p1)
{
    vec3 p1ToP0 = p1 - p0;
    float magnitude = length(p1ToP0);
    vec3 direction = normalize(p1ToP0);
    float endPoint0Distance =  -(czm_entireFrustum.x + p0.z);
    float denominator = -direction.z;
    
    bool culledByNearPlane = false;
    
    if (endPoint0Distance < 0.0 && abs(denominator) < czm_epsilon7)
    {
        culledByNearPlane = true;
    }
    else if (endPoint0Distance < 0.0 && abs(denominator) > czm_epsilon7)
    {
        // t = (-plane distance - dot(plane normal, ray origin)) / dot(plane normal, ray direction)
        float t = (czm_entireFrustum.x + p0.z) / denominator;
        if (t < 0.0 || t > magnitude)
        {
            culledByNearPlane = true;
        }
        else
        {
            p0 = p0 + t * direction;
            //clipped = true;
        }
    }
    
    if (culledByNearPlane) {
        //p0.z = min(p0.z, -czm_entireFrustum.x);
    }
    
    return czm_projection * vec4(p0, 1.0);
}
*/

void main()
{
    vec4 position = czm_translateRelativeToEye(positionHigh, positionLow);
    
    //
    // Make sure the vertex is moved down far enough to cover the central body
    //
    float delta = min(centralBodyMinimumAltitude, LODNegativeToleranceOverDistance * length(position.xyz));
    
    //
    // Move vertex down. This is not required if it belongs to a top
    // cap or top of the wall, in which case it was already moved up just
    // once on the CPU so the normal will be (0, 0, 0).
    //
    // Moving the vertex down is a function of the view parameters so
    // it is done here to avoid buring CPU time.
    //
    
    /*
    vec3 eyePosition = position.xyz;
    vec3 movedPosition = eyePosition + normal * delta;
    
    if (all(equal(normal, vec3(0.0))))
    {
        gl_Position = clipPointToNearPlane(eyePosition, movedPosition);
    }
    else
    {
        gl_Position = clipPointToNearPlane(movedPosition, eyePosition);
    }
    */
    
    gl_Position = czm_modelViewProjectionRelativeToEye * (position + vec4(normal * delta, 0.0));
}