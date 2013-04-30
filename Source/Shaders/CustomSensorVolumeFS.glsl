#ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
#endif  

uniform bool u_showIntersection;
uniform bool u_showThroughEllipsoid;

uniform float u_sensorRadius;

varying vec3 v_positionWC;
varying vec3 v_positionEC;
varying vec3 v_normalEC;

vec4 getColor(float sensorRadius, vec3 pointEC)
{
    czm_materialInput materialInput;
    
    vec3 pointMC = (czm_inverseModelView * vec4(pointEC, 1.0)).xyz;                                
    materialInput.st = sensor2dTextureCoordinates(sensorRadius, pointMC);   
    materialInput.str = pointMC / sensorRadius;
    
    vec3 positionToEyeEC = -v_positionEC;
    materialInput.positionToEyeEC = positionToEyeEC;
    
    vec3 normalEC = normalize(v_normalEC);
    normalEC = mix(normalEC, -normalEC, step(normalEC.z, 0.0));  // Normal facing viewer
    materialInput.normalEC = normalEC;
    
    czm_material material = czm_getMaterial(materialInput);
    return czm_phong(normalize(positionToEyeEC), material);
}

bool ellipsoidSensorIntersection(czm_raySegment ellipsoidInterval, float pointInEllipsoid)
{
    if (czm_isEmpty(ellipsoidInterval)) {
        return false;
    }

    float t = pointInEllipsoid;

#ifdef GL_OES_standard_derivatives
    float epsilon = max(abs(dFdx(t)), abs(dFdy(t)));
#else
    // TODO:  Don't hardcode this.
    float epsilon = 1.0 / 500.0;
#endif

    float width = 2.0;  // TODO: Expose as a uniform
    epsilon *= width;           

    return czm_equalsEpsilon(t, 1.0, epsilon);
}

vec4 shade(czm_raySegment ellipsoidInterval, float pointInEllipsoid)
{
    if (u_showIntersection && ellipsoidSensorIntersection(ellipsoidInterval, pointInEllipsoid))
    {
        return getIntersectionColor(u_sensorRadius, v_positionEC);
    }
    return getColor(u_sensorRadius, v_positionEC);
}

float czm_pointInEllipsoid(czm_ellipsoid ellipsoid, vec3 point)
{
    // TODO: Take into account ellipsoid's center; optimize with radii-squared; and move elsewhere
    return (((point.x * point.x) / (ellipsoid.radii.x * ellipsoid.radii.x)) +
            ((point.y * point.y) / (ellipsoid.radii.y * ellipsoid.radii.y)) +
            ((point.z * point.z) / (ellipsoid.radii.z * ellipsoid.radii.z)));
}

void main()
{
    vec3 sensorVertexWC = czm_model[3].xyz;      // (0.0, 0.0, 0.0) in model coordinates
    vec3 sensorVertexEC = czm_modelView[3].xyz;  // (0.0, 0.0, 0.0) in model coordinates

    czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();
    float pointInEllipsoid = czm_pointInEllipsoid(ellipsoid, v_positionWC);

    // Occluded by the ellipsoid?
	if (!u_showThroughEllipsoid)
	{
	    // Discard if in the ellipsoid    
	    // PERFORMANCE_IDEA: A coarse check for ellipsoid intersection could be done on the CPU first.
	    if (pointInEllipsoid < 1.0)
	    {
            discard;
	    }

	    // Discard if in the sensor's shadow
	    if (inSensorShadow(sensorVertexWC, ellipsoid, v_positionEC))
	    {
	        discard;
	    }
    }

    // Discard if not in the sensor's sphere
    // PERFORMANCE_IDEA: We can omit this check if the radius is Number.POSITIVE_INFINITY.
    if (distance(v_positionEC, sensorVertexEC) > u_sensorRadius)
    {
        discard;
    }

    czm_ray ray = czm_ray(vec3(0.0), normalize(v_positionEC));  // Ray from eye to fragment in eye coordinates
    czm_raySegment ellipsoidInterval = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);

    gl_FragColor = shade(ellipsoidInterval, pointInEllipsoid);
}
