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

agi_materialInput getagi_materialInput(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    agi_materialInput materialInput;

    vec3 pointMC = (agi_inverseModelView * vec4(pointEC, 1.0)).xyz;
    vec3 positionToEyeEC = normalize(-v_positionEC);
    materialInput.positionToEyeWC = normalize(vec3(agi_inverseView * vec4(positionToEyeEC, 0.0))); 
    
    materialInput.zDistance = pointMC.z;                                    // 1D distance
    materialInput.st = sensor2dTextureCoordinates(sensorRadius, pointMC);   // 2D texture coordinates
    materialInput.str = pointMC / sensorRadius;                             // 3D texture coordinates
    
    materialInput.normalEC = normalEC;
    
    return materialInput;
}
vec4 getOuterColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    agi_materialInput materialInput = getagi_materialInput(sensorRadius, pointEC, normalEC);
    
    //Get different material values from material shader
    vec3 normalComponent = agi_getOuterMaterialNormalComponent(materialInput);
    vec4 diffuseComponent = agi_getOuterMaterialDiffuseComponent(materialInput);
    float specularComponent = agi_getOuterMaterialSpecularComponent(materialInput);
    vec3 emissionComponent = agi_getOuterMaterialEmissionComponent(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);
    return agi_lightValuePhong(agi_sunDirectionEC, positionToEyeEC, normalComponent, diffuseComponent, specularComponent, emissionComponent);
}

vec4 getInnerColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    agi_materialInput materialInput = getagi_materialInput(sensorRadius, pointEC, normalEC);
    
    //Get different material values from material shader
    vec3 normalComponent = agi_getInnerMaterialNormalComponent(materialInput);
    vec4 diffuseComponent = agi_getInnerMaterialDiffuseComponent(materialInput);
    float specularComponent = agi_getInnerMaterialSpecularComponent(materialInput);
    vec3 emissionComponent = agi_getInnerMaterialEmissionComponent(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);
    return agi_lightValuePhong(agi_sunDirectionEC, positionToEyeEC, normalComponent, diffuseComponent, specularComponent, emissionComponent);
}

vec4 getCapColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    agi_materialInput materialInput = getagi_materialInput(sensorRadius, pointEC, normalEC);
    
    //Get different material values from material shader
    vec3 normalComponent = agi_getCapMaterialNormalComponent(materialInput);
    vec4 diffuseComponent = agi_getCapMaterialDiffuseComponent(materialInput);
    float specularComponent = agi_getCapMaterialSpecularComponent(materialInput);
    vec3 emissionComponent = agi_getCapMaterialEmissionComponent(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);
    return agi_lightValuePhong(agi_sunDirectionEC, positionToEyeEC, normalComponent, diffuseComponent, specularComponent, emissionComponent);
}

vec4 getSilhouetteColor(float sensorRadius, vec3 pointEC, vec3 normalEC)
{
    sensorErode(sensorRadius, pointEC);
    
    agi_materialInput materialInput = getagi_materialInput(sensorRadius, pointEC, normalEC);
    
    //Get different material values from material shader
    vec3 normalComponent = agi_getSilhouetteMaterialNormalComponent(materialInput);
    vec4 diffuseComponent = agi_getSilhouetteMaterialDiffuseComponent(materialInput);
    float specularComponent = agi_getSilhouetteMaterialSpecularComponent(materialInput);
    vec3 emissionComponent = agi_getSilhouetteMaterialEmissionComponent(materialInput);
    
    //Final
    vec3 positionToEyeEC = normalize(-v_positionEC);
    return agi_lightValuePhong(agi_sunDirectionEC, positionToEyeEC, normalComponent, diffuseComponent, specularComponent, emissionComponent);
}

#endif

bool agi_isOnOrNear(float d, agi_raySegment interval, float epsilon)
{
    bool answer = (agi_equalsEpsilon(d, interval.start, epsilon) || agi_equalsEpsilon(d, interval.stop, epsilon));
    return answer;
}

bool agi_isOnOrNear(float d, agi_raySegmentCollection coneIntervals, float epsilon)
{
    // Can have a maximum of two ray segments from cone intersection.
    bool answer = (coneIntervals.count > 0 && (agi_isOnOrNear(d, coneIntervals.intervals[0], epsilon)))
               || (coneIntervals.count > 1 && (agi_isOnOrNear(d, coneIntervals.intervals[1], epsilon)));
    return answer;
}

bool agi_isOnOrNearSensor(float d, agi_raySegmentCollection outerIntervals, agi_raySegmentCollection innerIntervals, float epsilon)
{
    bool answer = agi_isOnOrNear(d, outerIntervals, epsilon) || agi_isOnOrNear(d, innerIntervals, epsilon);
    return answer;
}

bool ellipsoidSensorIntersection(agi_raySegment sphereInterval,
    agi_raySegmentCollection outerIntervals, agi_raySegmentCollection innerIntervals,
    agi_raySegmentCollection clockIntervals,
    agi_raySegment ellipsoidInterval, agi_raySegment silhouetteHalfspaceInterval, agi_raySegmentCollection solid)
{
    if (agi_isEmpty(ellipsoidInterval))
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
         && (agi_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
          || agi_isOnOrNear(d, sphereInterval, epsilon) 
          || agi_isOnOrNear(d, clockIntervals, epsilon) 
          || agi_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;
        d = solid.intervals[0].stop;
        if (d == ellipsoidInterval.start
         && (agi_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
          || agi_isOnOrNear(d, sphereInterval, epsilon) 
          || agi_isOnOrNear(d, clockIntervals, epsilon) 
          || agi_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;

	    if (solid.count > 1)
	    {
	        d = solid.intervals[1].start;
	        if (d == ellipsoidInterval.start
	         && (agi_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
	          || agi_isOnOrNear(d, sphereInterval, epsilon) 
              || agi_isOnOrNear(d, clockIntervals, epsilon) 
	          || agi_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;
	        d = solid.intervals[1].stop;
            if (d == ellipsoidInterval.start
             && (agi_isOnOrNear(d, silhouetteHalfspaceInterval, epsilon)
              || agi_isOnOrNear(d, sphereInterval, epsilon) 
              || agi_isOnOrNear(d, clockIntervals, epsilon) 
              || agi_isOnOrNearSensor(d, outerIntervals, innerIntervals, epsilon))) return true;
	    }
	    
	    return false;
    }
    else
    {
        false;
    }
}

vec4 shade(
    agi_ray ray,
    float nearestRayTime,
    agi_sphere sphere,
    agi_cone outerCone,
    agi_cone innerCone,
    agi_halfspace maxClock,
    agi_halfspace minClock,
	agi_ellipsoidSilhouetteCone silhouetteCone,
	agi_ellipsoidSilhouetteHalfspace silhouetteHalfspace,    
    agi_raySegment sphereInterval,
    agi_raySegmentCollection outerConeInterval,
    agi_raySegmentCollection innerConeInterval,
    agi_raySegment maxClockInterval,
    agi_raySegment minClockInterval,
    agi_raySegmentCollection clockIntervals,
    agi_raySegment silhouetteConeInterval,
    agi_raySegment silhouetteHalfspaceInterval,
    agi_raySegment ellipsoidInterval,
    agi_raySegmentCollection intervals)
{
#ifdef RENDER_FOR_PICK
    return u_pickColor;
#else
    vec3 nearestPoint = agi_pointAlongRay(ray, nearestRayTime);

    // Visualization TODO:  Segment stop surface can be used to determine which pixels to "fill" 
    // in order to indicate projection onto the ellipsoid surface.

    if (u_showIntersection && ellipsoidSensorIntersection(sphereInterval,
        outerConeInterval, innerConeInterval, clockIntervals,
        ellipsoidInterval, silhouetteHalfspaceInterval, intervals))
    {
        return getIntersectionColor(u_sensorRadius, nearestPoint);
    } 

    vec3 positionToEyeEC = -ray.direction;               // normalized position-to-eye vector in eye coordinates
    vec3 agi_sunDirectionEC = agi_sunDirectionEC;           // normalized position-to-sun vector in eye coordinates

    for (int i = 0; i < agi_raySegmentCollectionCapacity; ++i)
    {
	    if (i < outerConeInterval.count &&
	       ((nearestRayTime == outerConeInterval.intervals[i].start) ||      // Viewer outside sensor CSG volume
	        (nearestRayTime == outerConeInterval.intervals[i].stop)))         // Viewer inside
	    {
	        // Shade outer cone
	        vec3 normal = agi_coneNormal(outerCone, nearestPoint);
	        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
	        return getOuterColor(u_sensorRadius, nearestPoint, normal);
	    }
    }
    
    for (int i = 0; i < agi_raySegmentCollectionCapacity; ++i)
    {
	    if (i < innerConeInterval.count &&
	       ((nearestRayTime == innerConeInterval.intervals[i].start) ||  // Viewer outside sensor CSG volume
	        (nearestRayTime == innerConeInterval.intervals[i].stop)))     // Viewer inside
	    {
	        // Shade inner cone
	        vec3 normal = -agi_coneNormal(innerCone, nearestPoint);
	        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
	        return getInnerColor(u_sensorRadius, nearestPoint, normal);       
	    }
    }
    
    if ((nearestRayTime == sphereInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == sphereInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = agi_sphereNormal(sphere, nearestPoint);
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
        vec3 normal = agi_ellipsoidSilhouetteConeNormal(silhouetteCone, nearestPoint); // Normal is already inverted.
        normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
        return getSilhouetteColor(u_sensorRadius, nearestPoint, normal);   
    }

    // Should never happen
   return vec4(1.0, 0.0, 0.0, 1.0);
#endif
}

vec4 shade(
    agi_ray ray,
    float nearestRayTime,
    agi_sphere sphere,
    agi_cone outerCone,
    agi_cone innerCone,
    agi_halfspace maxClock,
    agi_halfspace minClock,
    agi_raySegment sphereInterval,
    agi_raySegmentCollection outerConeInterval,
    agi_raySegmentCollection innerConeInterval,
    agi_raySegment maxClockInterval,
    agi_raySegment minClockInterval,
    agi_raySegmentCollection intervals)
{
#ifdef RENDER_FOR_PICK
    return u_pickColor;
#else
    vec3 nearestPoint = agi_pointAlongRay(ray, nearestRayTime);

    vec3 positionToEyeEC = -ray.direction;               // normalized position-to-eye vector in eye coordinates

    for (int i = 0; i < agi_raySegmentCollectionCapacity; ++i)
    {
        if (i < outerConeInterval.count &&
           ((nearestRayTime == outerConeInterval.intervals[i].start) ||      // Viewer outside sensor CSG volume
            (nearestRayTime == outerConeInterval.intervals[i].stop)))         // Viewer inside
        {
            // Shade outer cone
            vec3 normal = agi_coneNormal(outerCone, nearestPoint);
            normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
            return getOuterColor(u_sensorRadius, nearestPoint, normal);
        }
    }
    
    for (int i = 0; i < agi_raySegmentCollectionCapacity; ++i)
    {
        if (i < innerConeInterval.count &&
           ((nearestRayTime == innerConeInterval.intervals[i].start) ||  // Viewer outside sensor CSG volume
            (nearestRayTime == innerConeInterval.intervals[i].stop)))     // Viewer inside
        {
            // Shade inner cone
            vec3 normal = -agi_coneNormal(innerCone, nearestPoint);
            normal = mix(normal, -normal, step(normal.z, 0.0));  // Normal facing viewer
            return getInnerColor(u_sensorRadius, nearestPoint, normal);       
        }
    }
    
    if ((nearestRayTime == sphereInterval.start) ||    // Viewer outside sensor CSG volume
        (nearestRayTime == sphereInterval.stop))       // Viewer inside
    {
        // Shade top cap
        vec3 normal = agi_sphereNormal(sphere, nearestPoint);
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
    agi_ray ray = agi_ray(vec3(0.0), normalize(v_positionEC));  // Ray from eye to fragment in eye coordinates

    // Determine the sensor primitive intervals.

    agi_sphere sphere = agi_sphere(v_sensorVertexEC, u_sensorRadius);
    agi_raySegment sphereInterval = agi_raySphereIntersectionInterval(ray, sphere);
    if (agi_isEmpty(sphereInterval))
    {
        discard;
    }

    vec3 coneAxisEC = normalize(v_sensorAxisEC);    

    agi_cone outerCone = agi_coneNew(v_sensorVertexEC, coneAxisEC, u_outerHalfAngle);
    agi_raySegmentCollection outerConeInterval = agi_rayConeIntersectionInterval(ray, outerCone);
    if (outerConeInterval.count == 0)
    {
        discard;
    }

    agi_cone innerCone = agi_coneNew(v_sensorVertexEC, coneAxisEC, u_innerHalfAngle);
    agi_raySegmentCollection innerConeInterval = agi_rayConeIntersectionInterval(ray, innerCone);
    
    // Build up the CSG representation of the sensor.    
    agi_raySegmentCollection difference = (innerConeInterval.count == 0) ? outerConeInterval : agi_subtraction(outerConeInterval, innerConeInterval);
    if (difference.count == 0)
    {
        discard;
    }
    agi_raySegmentCollection capped = agi_intersection(difference, sphereInterval);
    if (capped.count == 0)
    {
        discard;
    }

    vec3 maxNormal = normalize((agi_modelView * vec4(-sin(u_maximumClockAngle), cos(u_maximumClockAngle), 0.0, 0.0)).xyz);
    agi_halfspace maxClock = agi_halfspace(v_sensorVertexEC, maxNormal);
    agi_raySegment maxClockInterval = agi_rayHalfspaceIntersectionInterval(ray, maxClock);

    vec3 minNormal = normalize((agi_modelView * vec4(sin(u_minimumClockAngle), -cos(u_minimumClockAngle), 0.0, 0.0)).xyz);
    agi_halfspace minClock = agi_halfspace(v_sensorVertexEC, minNormal);
    agi_raySegment minClockInterval = agi_rayHalfspaceIntersectionInterval(ray, minClock);

    agi_raySegmentCollection clockIntervals = ((u_maximumClockAngle - u_minimumClockAngle) > agi_pi)
        ? (agi_isEmpty(maxClockInterval) 
	        ? (agi_isEmpty(minClockInterval) ? agi_raySegmentCollectionNew() : agi_raySegmentCollectionNew(minClockInterval))
	        : (agi_isEmpty(minClockInterval) ? agi_raySegmentCollectionNew(maxClockInterval) : agi_union(maxClockInterval, minClockInterval)))
        : ((agi_isEmpty(maxClockInterval) || agi_isEmpty(minClockInterval)) ? agi_raySegmentCollectionNew() : agi_raySegmentCollectionNew(agi_intersection(maxClockInterval, minClockInterval)));

    agi_raySegmentCollection sensor = (clockIntervals.count == 0) ? agi_raySegmentCollectionNew() : agi_intersection(capped, clockIntervals);
    if (sensor.count == 0)
    {
        discard;
    }

    // Determine the obstruction primitive intervals.

    agi_ellipsoid ellipsoid = agi_getWgs84EllipsoidEC();

    agi_ellipsoidSilhouetteCone silhouetteCone = agi_ellipsoidSilhouetteConeNew(ellipsoid, v_sensorVertexEC);
    agi_raySegment silhouetteConeInterval = agi_rayEllipsoidSilhouetteConeIntersectionInterval(ray, silhouetteCone);

    if (agi_isEmpty(silhouetteConeInterval))
    {
        gl_FragColor = shade(ray, sensor.intervals[0].start,
            sphere, outerCone, innerCone, maxClock, minClock,
            sphereInterval, outerConeInterval, innerConeInterval, maxClockInterval, minClockInterval,
            sensor);
    }
    else
    {	
	    agi_ellipsoidSilhouetteHalfspace silhouetteHalfspace = agi_ellipsoidSilhouetteHalfspaceNew(ellipsoid, v_sensorVertexEC);    
	    agi_raySegment silhouetteHalfspaceInterval = agi_rayEllipsoidSilhouetteHalfspaceIntersectionInterval(ray, silhouetteHalfspace);
	    
	    // Build up the CSG representation of the composite.
	    agi_raySegment temp = (agi_isEmpty(silhouetteHalfspaceInterval)) ? agi_emptyRaySegment : agi_intersection(silhouetteConeInterval, silhouetteHalfspaceInterval);
	    agi_raySegmentCollection stuff = (agi_isEmpty(temp)) ? sensor : agi_subtraction(sensor, temp);
	    if (stuff.count == 0)
	    {
	       discard;
	    }

        agi_raySegment ellipsoidInterval = agi_rayEllipsoidIntersectionInterval(ray, ellipsoid);
	    agi_raySegmentCollection result = (agi_isEmpty(ellipsoidInterval)) ? stuff : agi_subtraction(stuff, ellipsoidInterval);
	    
	    if ((result.count == 0)
	        || (!agi_isEmpty(ellipsoidInterval) && (result.intervals[0].start > ellipsoidInterval.start))) // Fails depth test with ellipsoid
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
