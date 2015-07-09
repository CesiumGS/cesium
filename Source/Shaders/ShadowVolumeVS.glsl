attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 normal;
attribute float extrude;

uniform float centralBodyMinimumAltitude;
uniform float LODNegativeToleranceOverDistance;

vec4 clipPointToPlane(vec3 p0, vec3 p1, bool nearPlane)
{
    const float offset = 1.0;
    //const float denominatorEpsilon = czm_epsilon7;
    const float denominatorEpsilon = 1e-15;
    
    vec2 frustum = czm_currentFrustum;
    float planeDistance = nearPlane ? frustum.x : frustum.y;
    
    vec3 diff = p1 - p0;
    float magnitude = length(diff);
    vec3 direction = normalize(diff);
    float denominator = -direction.z;
    float pointDistance = -(planeDistance + p0.z);
    bool behindPlane = nearPlane ? pointDistance < 0.0 : pointDistance > 0.0;
    
    // point is behind the plane and not parallel
    if (behindPlane && abs(denominator) > denominatorEpsilon)
    {
        // find intersection of ray and the plane
        // t = (-dot(plane normal, point on plane) - dot(plane normal, ray origin)) / dot(plane normal, ray direction)
        float t = (planeDistance + p0.z) / denominator;
        
        // The intersection is on the segment
        if (t >= 0.0 && t <= magnitude)
        {
            // compute intersection with plane slightly offset
            // to prevent precision artifacts
            t += offset;
            p0 = p0 + t * direction;
        }
    }
    
    return czm_projection * vec4(p0, 1.0);
}

void main()
{
    vec4 position = czm_translateRelativeToEye(positionHigh, positionLow);
    
    float delta = 1.0; // TODO: moving the vertex is a function of the view

    vec3 origPosition = position.xyz;
    vec3 movedPosition = position.xyz + normal * delta;
    
    vec3 origPositionEC = (czm_modelViewRelativeToEye * vec4(origPosition, 1.0)).xyz;
    vec3 movedPositionEC = (czm_modelViewRelativeToEye * vec4(movedPosition, 1.0)).xyz;
    
    vec3 diff = movedPositionEC - origPositionEC;
    
    if (extrude == 0.0)
    {
        gl_Position = clipPointToPlane(origPositionEC, movedPositionEC, diff.z < 0.0);
    }
    else
    {
        gl_Position = clipPointToPlane(movedPositionEC, origPositionEC, diff.z >= 0.0);
    }
}
