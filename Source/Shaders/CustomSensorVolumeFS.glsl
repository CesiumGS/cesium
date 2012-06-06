#ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
#endif  

uniform bool u_showIntersection;
uniform bool u_showThroughEllipsoid;

uniform float u_sensorRadius;
uniform vec4 u_pickColor;

varying vec3 v_positionWC;
varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec3 v_sensorVertexWC;
varying vec3 v_sensorVertexEC;

#ifndef RENDER_FOR_PICK

vec4 getColor(float sensorRadius, vec3 pointEC)
{
    sensorErode(sensorRadius, pointEC);
    
    vec3 pointMC = (agi_inverseModelView * vec4(pointEC, 1.0)).xyz;

    float zDistance = pointMC.z;                                   // 1D distance
    vec2 st = sensor2dTextureCoordinates(sensorRadius, pointMC);   // 2D texture coordinates
    vec3 str = pointMC / sensorRadius;                             // 3D texture coordinates
    
    return agi_getMaterialColor(zDistance, st, str);
}

#endif

bool ellipsoidSensorIntersection(agi_raySegment ellipsoidInterval)
{
	if (agi_isEmpty(ellipsoidInterval))
	{
	    return false;
	}

    float t = ellipsoidInterval.start;

#ifdef GL_OES_standard_derivatives
    // TODO: This seems to be too aggressive in some areas, and too conservative in others
    float epsilon = max(abs(dFdx(t)), abs(dFdy(t)));
    
    if (epsilon >= ellipsoidInterval.start)
    {
       // If the fragment is on the silhouette of the ellipsoid, the adjacent fragment
       // will not hit the ellipsoid (its ellipsoidInterval.start will be zero),
       // so the derivative will be large, and we would get false positives.
        return false;
    }
#else
    // TODO:  Don't hardcode this.
    float epsilon = t / 500.0;
#endif

    float width = 2.0;  // TODO: Expose as a uniform
    epsilon *= width;           

    return agi_equalsEpsilon(t, length(v_positionEC), epsilon);
}

vec4 shade(agi_raySegment ellipsoidInterval)
{
#ifdef RENDER_FOR_PICK
    return u_pickColor;
#else
    if (u_showIntersection && ellipsoidSensorIntersection(ellipsoidInterval))
    {
        return getIntersectionColor(u_sensorRadius, v_positionEC);
    }
    
    vec3 positionToEyeEC = normalize(-v_positionEC);
    vec3 normal = normalize(v_normalEC);
    normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer

    vec4 color = getColor(u_sensorRadius, v_positionEC);
    float intensity = agi_twoSidedLightIntensity(normal, agi_sunDirectionEC, positionToEyeEC);
    return vec4(color.rgb * intensity, color.a);
#endif
}

bool agi_pointInEllipsoid(agi_ellipsoid ellipsoid, vec3 point)
{
    // TODO: Take into account ellipsoid's center; optimize with radii-squared; and move elsewhere
    return (((point.x * point.x) / (ellipsoid.radii.x * ellipsoid.radii.x)) +
            ((point.y * point.y) / (ellipsoid.radii.y * ellipsoid.radii.y)) +
            ((point.z * point.z) / (ellipsoid.radii.z * ellipsoid.radii.z)) < 1.0);
}

void main()
{
    agi_ellipsoid ellipsoid = agi_getWgs84EllipsoidEC();

    // Occluded by the ellipsoid?
	if (!u_showThroughEllipsoid)
	{
	    // Discard if in the ellipsoid    
	    // PERFORMANCE_IDEA: A coarse check for ellipsoid intersection could be done on the CPU first.
	    if (agi_pointInEllipsoid(ellipsoid, v_positionWC))
	    {
	        discard;
	    }
	
	    // Discard if in the sensor's shadow
	    if (inSensorShadow(v_sensorVertexWC, ellipsoid, v_positionEC))
	    {
	        discard;
	    }
    }
    
    // Discard if not in the sensor's sphere
    // PERFORMANCE_IDEA: We can omit this check if the radius is Number.POSITIVE_INFINITY.
    if (distance(v_positionEC, v_sensorVertexEC) > u_sensorRadius)
    {
        discard;
    }

    agi_ray ray = agi_ray(vec3(0.0), normalize(v_positionEC));  // Ray from eye to fragment in eye coordinates
    agi_raySegment ellipsoidInterval = agi_rayEllipsoidIntersectionInterval(ray, ellipsoid);

    gl_FragColor = shade(ellipsoidInterval);
}
