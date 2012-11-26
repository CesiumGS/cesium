#ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
#endif  

uniform float u_sensorRadius;
uniform float u_outerHalfAngle;
uniform float u_innerHalfAngle;
uniform float u_maximumClockAngle;
uniform float u_minimumClockAngle;
uniform bool u_showIntersection;    
uniform vec4 u_pickColor;

varying vec3 v_positionEC;
varying vec3 v_sensorVertexWC;
varying vec3 v_sensorVertexEC;
varying vec3 v_sensorAxisEC;

#ifndef RENDER_FOR_PICK

czm_materialInput getMaterialInput(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    czm_materialInput materialInput;

    vec3 pointMC = (czm_inverseModelView * vec4(pointEC, 1.0)).xyz;
    materialInput.positionToEyeEC = -v_positionEC; 
    materialInput.normalEC = normalEC;
    
    materialInput.st = sensor2dTextureCoordinates(sensorRadius, pointMC);
    materialInput.str = pointMC / sensorRadius; 
    materialInput.positionMC = pointMC;
    
    return materialInput;
}
vec4 getOuterColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    czm_materialInput materialInput = getMaterialInput(sensorRadius, pointEC, normalEC);
    czm_material material = czm_getOuterMaterial(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);
    
    return czm_phong(positionToEyeEC, material);
}

vec4 getInnerColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    czm_materialInput materialInput = getMaterialInput(sensorRadius, pointEC, normalEC);
    czm_material material = czm_getInnerMaterial(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);

    return czm_phong(positionToEyeEC, material);        
}

vec4 getCapColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    czm_materialInput materialInput = getMaterialInput(sensorRadius, pointEC, normalEC);
    czm_material material = czm_getCapMaterial(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);

    return czm_phong(positionToEyeEC, material);        
}

vec4 getSilhouetteColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    czm_materialInput materialInput = getMaterialInput(sensorRadius, pointEC, normalEC);
    czm_material material = czm_getSilhouetteMaterial(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);

    return czm_phong(positionToEyeEC, material);        
}

#endif

bool czm_isOnOrNear(float d, czm_raySegment interval, float epsilon)
{
    bool answer = (czm_equalsEpsilon(d, interval.start, epsilon) || czm_equalsEpsilon(d, interval.stop, epsilon));
    return answer;
}

bool czm_isOnOrNear(float d, czm_raySegmentCollection coneIntervals, float epsilon)
{
    // Can have a maximum of two ray segments from cone intersection.
    bool answer = (coneIntervals.count > 0 && (czm_isOnOrNear(d, coneIntervals.intervals[0], epsilon)))
               || (coneIntervals.count > 1 && (czm_isOnOrNear(d, coneIntervals.intervals[1], epsilon)));
    return answer;
}

bool czm_isOnOrNearSensor(float d, czm_raySegmentCollection outerIntervals, czm_raySegmentCollection innerIntervals, float epsilon)
{
    bool answer = czm_isOnOrNear(d, outerIntervals, epsilon) || czm_isOnOrNear(d, innerIntervals, epsilon);
    return answer;
}

bool ellipsoidSensorIntersection(czm_raySegment sphereInterval,
    czm_raySegmentCollection outerIntervals, czm_raySegmentCollection innerIntervals,
    czm_raySegmentCollection clockIntervals,
    czm_raySegment ellipsoidInterval, czm_raySegment silhouetteHalfspaceInterval, czm_raySegmentCollection solid)
{
    if (czm_isEmpty(ellipsoidInterval))
    {
        return false;
    }

    float t = ellipsoidInterval.start;

#ifdef GL_OES_standard_derivatives
    // TODO: This seems to be too aggressive in some areas, and too conservative in others
    float epsilon = max(abs(dFdx(t)), abs(dFdy(t)));
#else
    // TODO:  Don't hardcode this.
    float epsilon = t / 500.0;
#endif

    float width = 2.0;  // TODO: Expose as a uniform
    epsilon *= width;           

    // TODO: Rework this once the ray segments have associated boundary surfaces with their start/stop values.
    if (solid.count > 0)
    {
        float d = solid.intervals[0].start;
        if (d == ellipsoidInterval.start
         && (czm_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
          || czm_isOnOrNear(d, sphereInterval, epsilon) 
          || czm_isOnOrNear(d, clockIntervals, epsilon) 
          || czm_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;
        d = solid.intervals[0].stop;
        if (d == ellipsoidInterval.start
         && (czm_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
          || czm_isOnOrNear(d, sphereInterval, epsilon) 
          || czm_isOnOrNear(d, clockIntervals, epsilon) 
          || czm_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;

	    if (solid.count > 1)
	    {
	        d = solid.intervals[1].start;
	        if (d == ellipsoidInterval.start
	         && (czm_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
	          || czm_isOnOrNear(d, sphereInterval, epsilon) 
              || czm_isOnOrNear(d, clockIntervals, epsilon) 
	          || czm_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;
	        d = solid.intervals[1].stop;
            if (d == ellipsoidInterval.start
             && (czm_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
              || czm_isOnOrNear(d, sphereInterval, epsilon) 
              || czm_isOnOrNear(d, clockIntervals, epsilon) 
              || czm_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;
	    }
	    
	    return false;
    }
    else
    {
        false;
    }
}

vec4 shade(
    czm_ray ray,
    float nearestRayTime,
    czm_sphere sphere,
    czm_cone outerCone,
    czm_cone innerCone,
    czm_halfspace maxClock,
    czm_halfspace minClock,
	czm_ellipsoidSilhouetteCone silhouetteCone,
	czm_ellipsoidSilhouetteHalfspace silhouetteHalfspace,    
    czm_raySegment sphereInterval,
    czm_raySegmentCollection outerConeInterval,
    czm_raySegmentCollection innerConeInterval,
    czm_raySegment maxClockInterval,
    czm_raySegment minClockInterval,
    czm_raySegmentCollection clockIntervals,
    czm_raySegment silhouetteConeInterval,
    czm_raySegment silhouetteHalfspaceInterval,
    czm_raySegment ellipsoidInterval,
    czm_raySegmentCollection intervals)
{
#ifdef RENDER_FOR_PICK
    return u_pickColor;
#else
    vec3 nearestPoint = czm_pointAlongRay(ray, nearestRayTime);

    // Visualization TODO:  Segment stop surface can be used to determine which pixels to "fill" 
    // in order to indicate projection onto the ellipsoid surface.

    if (u_showIntersection && ellipsoidSensorIntersection(sphereInterval,
        outerConeInterval, innerConeInterval, clockIntervals,
        ellipsoidInterval, silhouetteHalfspaceInterval, intervals))
    {
        return getIntersectionColor(u_sensorRadius, nearestPoint);
    } 

    vec3 positionToEyeEC = -ray.direction;               // normalized position-to-eye vector in eye coordinates
    vec3 czm_sunDirectionEC = czm_sunDirectionEC;           // normalized position-to-sun vector in eye coordinates

    for (int i = 0; i < czm_raySegmentCollectionCapacity; ++i)
    {
	    if (i < outerConeInterval.count &&
	       ((nearestRayTime == outerConeInterval.intervals[i].start) ||      // Viewer outside sensor CSG volume
	        (nearestRayTime == outerConeInterval.intervals[i].stop)))         // Viewer inside
	    {
	        // Shade outer cone
	        vec3 normal = czm_coneNormal(outerCone, nearestPoint);
	        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
	        return getOuterColor(u_sensorRadius, nearestPoint, normal);
	    }
    }
    
    for (int i = 0; i < czm_raySegmentCollectionCapacity; ++i)
    {
	    if (i < innerConeInterval.count &&
	       ((nearestRayTime == innerConeInterval.intervals[i].start) ||  // Viewer outside sensor CSG volume
	        (nearestRayTime == innerConeInterval.intervals[i].stop)))     // Viewer inside
	    {
	        // Shade inner cone
	        vec3 normal = -czm_coneNormal(innerCone, nearestPoint);
	        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
	        return getInnerColor(u_sensorRadius, nearestPoint, normal);       
	    }
    }
    
    if ((nearestRayTime == sphereInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == sphereInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = czm_sphereNormal(sphere, nearestPoint);
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getCapColor(u_sensorRadius, nearestPoint, normal);     
    }

    if ((nearestRayTime == maxClockInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == maxClockInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = maxClock.normal;
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getOuterColor(u_sensorRadius, nearestPoint, normal);        
    }

    if ((nearestRayTime == minClockInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == minClockInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = minClock.normal;
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getOuterColor(u_sensorRadius, nearestPoint, normal);        
    }

    if ((nearestRayTime == silhouetteConeInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == silhouetteConeInterval.stop))       // Viewer inside
    {
        vec3 normal = czm_ellipsoidSilhouetteConeNormal(silhouetteCone, nearestPoint); // Normal is already inverted.
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getSilhouetteColor(u_sensorRadius, nearestPoint, normal);   
    }

    // Should never happen
   return vec4(1.0, 0.0, 0.0, 1.0);
#endif
}

vec4 shade(
    czm_ray ray,
    float nearestRayTime,
    czm_sphere sphere,
    czm_cone outerCone,
    czm_cone innerCone,
    czm_halfspace maxClock,
    czm_halfspace minClock,
    czm_raySegment sphereInterval,
    czm_raySegmentCollection outerConeInterval,
    czm_raySegmentCollection innerConeInterval,
    czm_raySegment maxClockInterval,
    czm_raySegment minClockInterval,
    czm_raySegmentCollection intervals)
{
#ifdef RENDER_FOR_PICK
    return u_pickColor;
#else
    vec3 nearestPoint = czm_pointAlongRay(ray, nearestRayTime);

    vec3 positionToEyeEC = -ray.direction;               // normalized position-to-eye vector in eye coordinates

    for (int i = 0; i < czm_raySegmentCollectionCapacity; ++i)
    {
        if (i < outerConeInterval.count &&
           ((nearestRayTime == outerConeInterval.intervals[i].start) ||      // Viewer outside sensor CSG volume
            (nearestRayTime == outerConeInterval.intervals[i].stop)))         // Viewer inside
        {
            // Shade outer cone
            vec3 normal = czm_coneNormal(outerCone, nearestPoint);
            normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
            return getOuterColor(u_sensorRadius, nearestPoint, normal);
        }
    }
    
    for (int i = 0; i < czm_raySegmentCollectionCapacity; ++i)
    {
        if (i < innerConeInterval.count &&
           ((nearestRayTime == innerConeInterval.intervals[i].start) ||  // Viewer outside sensor CSG volume
            (nearestRayTime == innerConeInterval.intervals[i].stop)))     // Viewer inside
        {
            // Shade inner cone
            vec3 normal = -czm_coneNormal(innerCone, nearestPoint);
            normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
            return getInnerColor(u_sensorRadius, nearestPoint, normal);       
        }
    }
    
    if ((nearestRayTime == sphereInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == sphereInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = czm_sphereNormal(sphere, nearestPoint);
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getCapColor(u_sensorRadius, nearestPoint, normal);      
    }
    
    if ((nearestRayTime == maxClockInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == maxClockInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = maxClock.normal;
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getOuterColor(u_sensorRadius, nearestPoint, normal);       
    }

    if ((nearestRayTime == minClockInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == minClockInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = minClock.normal;
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getOuterColor(u_sensorRadius, nearestPoint, normal);      
    }

   // Should never happen
   return vec4(1.0, 0.0, 0.0, 1.0);
#endif
}

void main()
{
    czm_ray ray = czm_ray(vec3(0.0), normalize(v_positionEC));  // Ray from eye to fragment in eye coordinates

    // Determine the sensor primitive intervals.

    czm_sphere sphere = czm_sphere(v_sensorVertexEC, u_sensorRadius);
    czm_raySegment sphereInterval = czm_raySphereIntersectionInterval(ray, sphere);
    if (czm_isEmpty(sphereInterval))
    {
        discard;
    }

    vec3 coneAxisEC = normalize(v_sensorAxisEC);    

    czm_cone outerCone = czm_coneNew(v_sensorVertexEC, coneAxisEC, u_outerHalfAngle);
    czm_raySegmentCollection outerConeInterval = czm_rayConeIntersectionInterval(ray, outerCone);
    if (outerConeInterval.count == 0)
    {
        discard;
    }

    czm_cone innerCone = czm_coneNew(v_sensorVertexEC, coneAxisEC, u_innerHalfAngle);
    czm_raySegmentCollection innerConeInterval = czm_rayConeIntersectionInterval(ray, innerCone);
    
    // Build up the CSG representation of the sensor.    
    czm_raySegmentCollection difference = (innerConeInterval.count == 0) ? outerConeInterval : czm_subtraction(outerConeInterval, innerConeInterval);
    if (difference.count == 0)
    {
        discard;
    }
    czm_raySegmentCollection capped = czm_intersection(difference, sphereInterval);
    if (capped.count == 0)
    {
        discard;
    }

    vec3 maxNormal = normalize((czm_modelView * vec4(-sin(u_maximumClockAngle), cos(u_maximumClockAngle), 0.0, 0.0)).xyz);
    czm_halfspace maxClock = czm_halfspace(v_sensorVertexEC, maxNormal);
    czm_raySegment maxClockInterval = czm_rayHalfspaceIntersectionInterval(ray, maxClock);

    vec3 minNormal = normalize((czm_modelView * vec4(sin(u_minimumClockAngle), -cos(u_minimumClockAngle), 0.0, 0.0)).xyz);
    czm_halfspace minClock = czm_halfspace(v_sensorVertexEC, minNormal);
    czm_raySegment minClockInterval = czm_rayHalfspaceIntersectionInterval(ray, minClock);

    czm_raySegmentCollection clockIntervals = ((u_maximumClockAngle - u_minimumClockAngle) > czm_pi)
        ? (czm_isEmpty(maxClockInterval) 
	        ? (czm_isEmpty(minClockInterval) ? czm_raySegmentCollectionNew() : czm_raySegmentCollectionNew(minClockInterval))
	        : (czm_isEmpty(minClockInterval) ? czm_raySegmentCollectionNew(maxClockInterval) : czm_union(maxClockInterval, minClockInterval)))
        : ((czm_isEmpty(maxClockInterval) || czm_isEmpty(minClockInterval)) ? czm_raySegmentCollectionNew() : czm_raySegmentCollectionNew(czm_intersection(maxClockInterval, minClockInterval)));

    czm_raySegmentCollection sensor = (clockIntervals.count == 0) ? czm_raySegmentCollectionNew() : czm_intersection(capped, clockIntervals);
    if (sensor.count == 0)
    {
        discard;
    }

    // Determine the obstruction primitive intervals.

    czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();

    czm_ellipsoidSilhouetteCone silhouetteCone = czm_ellipsoidSilhouetteConeNew(ellipsoid, v_sensorVertexEC);
    czm_raySegment silhouetteConeInterval = czm_rayEllipsoidSilhouetteConeIntersectionInterval(ray, silhouetteCone);

    if (czm_isEmpty(silhouetteConeInterval))
    {
        gl_FragColor = shade(ray, sensor.intervals[0].start,
            sphere, outerCone, innerCone, maxClock, minClock,
            sphereInterval, outerConeInterval, innerConeInterval, maxClockInterval, minClockInterval,
            sensor);
    }
    else
    {	
	    czm_ellipsoidSilhouetteHalfspace silhouetteHalfspace = czm_ellipsoidSilhouetteHalfspaceNew(ellipsoid, v_sensorVertexEC);    
	    czm_raySegment silhouetteHalfspaceInterval = czm_rayEllipsoidSilhouetteHalfspaceIntersectionInterval(ray, silhouetteHalfspace);
	    
	    // Build up the CSG representation of the composite.
	    czm_raySegment temp = (czm_isEmpty(silhouetteHalfspaceInterval)) ? czm_emptyRaySegment : czm_intersection(silhouetteConeInterval, silhouetteHalfspaceInterval);
	    czm_raySegmentCollection stuff = (czm_isEmpty(temp)) ? sensor : czm_subtraction(sensor, temp);
	    if (stuff.count == 0)
	    {
	       discard;
	    }

        czm_raySegment ellipsoidInterval = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);
	    czm_raySegmentCollection result = (czm_isEmpty(ellipsoidInterval)) ? stuff : czm_subtraction(stuff, ellipsoidInterval);
	    
	    if ((result.count == 0)
	        || (!czm_isEmpty(ellipsoidInterval) && (result.intervals[0].start > ellipsoidInterval.start))) // Fails depth test with ellipsoid
	    {
	        discard;
	    }
	    
	    gl_FragColor = shade(ray, result.intervals[0].start,
	        sphere, outerCone, innerCone, maxClock, minClock,
	        silhouetteCone, silhouetteHalfspace,
	        sphereInterval, outerConeInterval, innerConeInterval, maxClockInterval, minClockInterval, clockIntervals,
	        silhouetteConeInterval, silhouetteHalfspaceInterval, ellipsoidInterval,
	        result);
    }
}
