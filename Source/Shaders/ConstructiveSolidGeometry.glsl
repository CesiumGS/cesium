float _czm_addWithCancellationCheck(float left, float right, float tolerance)
{
    float difference = left + right;
    if ((sign(left) != sign(right)) && abs(difference / max(abs(left), abs(right))) < tolerance)
    {
        return 0.0;
    }
    else
    {
        return difference;
    }
}
        
/**
 * DOC_TBA
 *
 * @name czm_quadraticRoots
 * @glslStruct
 */
struct czm_quadraticRoots
{
    int numberOfRoots;
    float root0;
    float root1;
};

/**
 * Computes the real-valued roots of the 2nd order polynomial function of one variable with only real coefficients.
 *
 * @name czm_quadraticRealPolynomialRealRoots
 * @glslFunction
 *
 * @param {float} a The coefficient of the 2nd order monomial.
 * @param {float} b The coefficient of the 1st order monomial.
 * @param {float} c The coefficient of the 0th order monomial.
 * 
 * @returns {czm_quadraticRoots} Zero, one, or two real-valued roots.
 * 
 * @example
 * czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, -4.0, -6.0); // 2(x + 1)(x - 3)
 * // The result is r.numberOfRoots = 2, r.root0 = -1.0, and r.root1 = 3.0.
 */
czm_quadraticRoots czm_quadraticRealPolynomialRealRoots(float a, float b, float c)
{
    // This function's return statements have an ANGLE workaround:  http://code.google.com/p/angleproject/issues/detail?id=185

    const float tolerance = czm_epsilon7;

    if (a == 0.0)
    {
        if (b == 0.0)
        {
            // Constant function: c = 0.  No real polynomial roots possible.
            czm_quadraticRoots r = czm_quadraticRoots(0, 0.0, 0.0);
            return r;
        }
        else
        {
            // Linear function: b * x + c = 0.
            czm_quadraticRoots r = czm_quadraticRoots(1, -c / b, 0.0);
            return r;           
        }
    }
    else if (b == 0.0)
    {
        if (c == 0.0)
        {
            // 2nd order monomial: a * x^2 = 0.
            czm_quadraticRoots r = czm_quadraticRoots(2, 0.0, 0.0);
            return r;
        }
        else
        {
            float cMagnitude = abs(c);
            float aMagnitude = abs(a);
    
            if ((cMagnitude < aMagnitude) && (cMagnitude / aMagnitude < tolerance)) // c ~= 0.0.
            {
                // 2nd order monomial: a * x^2 = 0.
                czm_quadraticRoots r = czm_quadraticRoots(2, 0.0, 0.0);
                return r;
            }
            else if ((cMagnitude > aMagnitude) && (aMagnitude / cMagnitude < tolerance)) // a ~= 0.0.
            {
                // Constant function: c = 0.
                czm_quadraticRoots r = czm_quadraticRoots(0, 0.0, 0.0);
                return r;
            }
            else
            {
                // a * x^2 + c = 0
                float ratio = -c / a;
    
                if (ratio < 0.0)
                {
                    // Both roots are complex.
                    czm_quadraticRoots r = czm_quadraticRoots(0, 0.0, 0.0);
                    return r;
                }
                else
                {
                    // Both roots are real.
                    float root = sqrt(ratio);
    
                    // Return them in ascending order.
                    czm_quadraticRoots r = czm_quadraticRoots(2, -root, root);
                    return r;
                }
            }
        }
    }
    else if (c == 0.0)
    {
        // a * x^2 + b * x = 0
        float ratio = -b / a;
    
        // Return them in ascending order.
        if (ratio < 0.0)
        {
            czm_quadraticRoots r = czm_quadraticRoots(2, ratio, 0.0);
            return r;           
        }
        else
        {
            czm_quadraticRoots r = czm_quadraticRoots(2, 0.0, ratio);
            return r;
        }
    }
    else
    {
        // a * x^2 + b * x + c = 0
        float b2 = b * b;
        float four_ac = 4.0 * a * c;
        float radicand = _czm_addWithCancellationCheck(b2, -four_ac, tolerance);
    
        if (radicand < 0.0)
        {
            // Both roots are complex.
            czm_quadraticRoots r = czm_quadraticRoots(0, 0.0, 0.0);
            return r;
        }
        else
        {
            // Both roots are real.
            float q = -0.5 * _czm_addWithCancellationCheck(b, sign(b) * sqrt(radicand), tolerance);
    
            // Return them in ascending order.
            if (b > 0.0)
            {
                // q < 0.0
                czm_quadraticRoots r = czm_quadraticRoots(2, q / a, c / q);
                return r;               
            }
            else
            {
                // q > 0.0
                czm_quadraticRoots r = czm_quadraticRoots(2, c / q, q / a);
                return r;               
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_sphere
 * @glslStruct
 */
struct czm_sphere
{
    vec3 center;
    float radius;
};

/**
 * DOC_TBA
 *
 * @name czm_raySphereIntersectionInterval
 * @glslFunction
 *
 * @see czm_sphereNormal
 */
czm_raySegment czm_raySphereIntersectionInterval(czm_ray ray, czm_sphere sphere)
{
    // From Real-Time Rendering, Section 16.6.2, Optimized Ray/Sphere Intersection Solution, Page 741
    
    // This function's return statements have an ANGLE workaround:  http://code.google.com/p/angleproject/issues/detail?id=185
    
    // PERFORMANCE_IDEA:  A more optimized but less friendly function could take radius squared directly, 
    // assume a center or origin of zero, etc.
    
    vec3 l = sphere.center - ray.origin;
    float s = dot(l, ray.direction);
    float l2 = dot(l, l);
    float r2 = sphere.radius * sphere.radius;
    
    if ((s < 0.0) // Looking away from sphere.
    && (l2 > r2)) // Outside of sphere.
    {
        return czm_emptyRaySegment;  // ray does not intersect (at least not along the indicated direction).
    }
    
    float s2 = s * s;
    float m2 = l2 - s2;
    
    if (m2 > r2) // Discriminant is negative, yielding only imaginary roots.
    {
        return czm_emptyRaySegment;  // ray does not intersect.
    }
    
    float q = sqrt(r2 - m2);

    if (czm_equalsEpsilon(q, 0.0)) // Discriminant is zero, yielding a double root.
    {
        return czm_raySegment(s, s);  // ray is tangent.
    }
        
    if (l2 > r2) // Outside of sphere.
    {
	    czm_raySegment i = czm_raySegment(s - q, s + q);
	    return i;
    }
    else if (l2 < r2) // Inside of sphere.
   	{
        czm_raySegment i = czm_raySegment(0.0, s + q);
        return i;
    }
    else if (s > 0.0) // On sphere and looking inward.
    {
        czm_raySegment i = czm_raySegment(0.0, s + q);
        return i;
    }
    else // On sphere and looking outward or tangent.
    {
        return czm_emptyRaySegment;
   	}
}

/**
 * DOC_TBA
 *
 * @name czm_sphereNormal
 * @glslFunction
 *
 * @see czm_raySphereIntersectionInterval 
 * @see czm_pointAlongRay
 */
vec3 czm_sphereNormal(czm_sphere sphere, vec3 pointOnSphere)
{
    return normalize(pointOnSphere - sphere.center);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_cone
 * @glslStruct
 */
struct czm_cone
{
    vec3 vertex;
    vec3 axis;          // Unit-length direction vector
    float halfAperture;    // Measured from the cone axis to the cone wall
	// PERFORMANCE_IDEA: Make sure all of these are used...
    float cosineOfHalfAperture;
    float cosineSquaredOfHalfAperture;
    float sineOfHalfAperture;
    float sineSquaredOfHalfAperture;
    mat3 intersectionMatrix;
};

czm_cone czm_coneNew(vec3 vertex, vec3 axis, float halfAperture)
{
	float cosineOfHalfAperture = cos(halfAperture);
	float cosineSquaredOfHalfAperture = cosineOfHalfAperture * cosineOfHalfAperture;
	float sineOfHalfAperture = sin(halfAperture);
	float sineSquaredOfHalfAperture = sineOfHalfAperture * sineOfHalfAperture;
	
    float x2 = axis.x * axis.x;
    float y2 = axis.y * axis.y;
    float z2 = axis.z * axis.z;
    float xy = axis.x * axis.y;
    float yz = axis.y * axis.z;
    float zx = axis.z * axis.x;

    // This is a symmetric matrix.
    mat3 intersectionMatrix = mat3(
    	cosineSquaredOfHalfAperture - x2, -xy,                              -zx,
		-xy,                              cosineSquaredOfHalfAperture - y2, -yz,
		-zx,                              -yz,                              cosineSquaredOfHalfAperture - z2);            
	
    czm_cone temp = czm_cone(vertex, axis, halfAperture,
    	cosineOfHalfAperture, cosineSquaredOfHalfAperture,
    	sineOfHalfAperture, sineSquaredOfHalfAperture, intersectionMatrix);
    return temp;
}

/**
 * Determines if a point is in, or on the boundary, of an infinite cone.
 *
 * @name czm_coneContainsPoint
 * @glslFunction
 *
 * @param {czm_cone} cone The infinite cone.
 * @param {vec3} point The point to test for containment.
 *
 * @returns {bool} <code>true</code> if the point is in the infinite cone; otherwise, <code>false</code>.
 *
 * @see czm_rayConeIntersectionInterval
 *
 * @example
 * czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0)); // vertex, axis, halfAperture
 * vec3 point = vec3(1.0, 0.0, 0.0);
 * bool b = czm_coneContainsPoint(cone, point)); // false
 */
bool czm_coneContainsPoint(czm_cone cone, vec3 point)
{
    vec3 n = normalize(point - cone.vertex);
    return (dot(n, cone.axis) >= cone.cosineOfHalfAperture);
}

bool _czm_rayIntersectsReflectedCone(czm_ray ray, czm_cone cone, float time, float cosine)
{
    vec3 s = ray.origin + (time * ray.direction) - cone.vertex;  // The vector from the origin is at (vertex + s)
    vec3 sUnit = normalize(s);
    float c = dot(sUnit, cone.axis);
    
    return (sign(c) != sign(cosine));
}

/**
 * DOC_TBA
 *
 * @name czm_rayConeIntersectionInterval
 * @glslFunction
 *
 * @see czm_coneNormal
 * @see czm_coneContainsPoint
 */
czm_raySegmentCollection czm_rayConeIntersectionInterval(czm_ray ray, czm_cone cone)
{
    vec3 temp = ray.origin - cone.vertex;

    float t2 = dot(temp, temp);

    float cosineNu = dot(ray.direction, cone.axis);

    if (t2 == 0.0) // At vertex.
    {
        if (cosineNu >= cone.cosineOfHalfAperture) // Looking inward or along surface.
        {
            return czm_raySegmentCollectionNew(czm_fullRaySegment);
        }
        else // Looking outward.
        {
            return czm_raySegmentCollectionNew();
        }
    }
    else // Not at vertex
    {
        float projection = dot(normalize(temp), cone.axis);

        if (projection == cone.cosineOfHalfAperture) // On surface.
        {
            vec3 u = ray.direction;

            mat3 crossProductMatrix = mat3(0.0, -u.z, u.y,
                                            u.z, 0.0, -u.x,
                                           -u.y, u.x, 0.0);
            if (length(crossProductMatrix * temp) == 0.0) // Looking along surface.
            {
                if (dot(temp, u) > 0.0) // Looking away from vertex.
                {
                    return czm_raySegmentCollectionNew(czm_fullRaySegment);
                }
                else // Looking toward vertex.
                {
                    czm_raySegment i = czm_raySegment(0.0, length(temp));
                    return czm_raySegmentCollectionNew(i);
                }
            }
            else // Looking tangent at surface.
            {
                return czm_raySegmentCollectionNew();
            }
        }
        else // Not on surface
        {
            vec3 t = normalize(temp);

            float cosineAlpha2 = cone.cosineOfHalfAperture * cone.cosineOfHalfAperture;

            float cosineTau = dot(t, cone.axis);
            float cosineDelta = dot(t, ray.direction);

            float cosineNu2 = cosineNu * cosineNu;
            float cosineTau2 = cosineTau * cosineTau;

            float stuff = cosineTau * cosineNu;

            float positiveTerm = cosineNu2 + cosineTau2;
            float negativeTerm = (cosineDelta * cosineDelta - 1.0) * cosineAlpha2;
            float signedTerm = -2.0 * stuff * cosineDelta;

            if (signedTerm > 0.0)
            {
                positiveTerm = positiveTerm + signedTerm;
            }
            else if (signedTerm < 0.0)
            {
                negativeTerm = negativeTerm + signedTerm;
            }

            float d = 4.0 * cosineAlpha2 * (positiveTerm + negativeTerm);

            if (d < 0.0) // Imaginary roots.  No intersections.
            {
                if (cone.cosineOfHalfAperture < 0.0) // Obtuse cone.
                {
                    return czm_raySegmentCollectionNew(czm_fullRaySegment);
                }
                else // Acute cone.
                {
                    return czm_raySegmentCollectionNew();
                }
            }
            else if (d > 0.0) // Distinct real roots.  Two intersections.
            {
                float a = cosineNu2 - cosineAlpha2;
                float c = cosineTau2 - cosineAlpha2;
                float b = 2.0 * (stuff - cosineDelta * cosineAlpha2);

                float s = (b == 0.0) ? 1.0 : sign(b);
                float q = -(b + s * sqrt(d)) / 2.0;

                float first = q / a;
                float second = c / q;
                if (second < first)
                {
                    float thing = first;
                    first = second;
                    second = thing;
                }

                // Check roots to ensure that they are non-negative and intersect the desired nape of the cone.
                bool firstTest = (first >= 0.0) && !(sign(dot(t + first * ray.direction, cone.axis)) == -sign(cone.cosineOfHalfAperture));
                bool secondTest = (second >= 0.0) && !(sign(dot(t + second * ray.direction, cone.axis)) == -sign(cone.cosineOfHalfAperture));

                float m = sqrt(t2);

                if (cosineTau > cone.cosineOfHalfAperture) // Inside cone.
                {
                    if (firstTest && secondTest)
                    {
                        // Ray starts inside cone and exits; then enters and never exits.
                        czm_raySegment one = czm_raySegment(0.0, m * first);
                        czm_raySegment two = czm_raySegment(m * second, czm_infinity);
                        return czm_raySegmentCollectionNew(one, two);
                    }
                    else if (firstTest)
                    {
                        // Ray starts inside cone and exits.
                        czm_raySegment i = czm_raySegment(0.0, m * first);
                        return czm_raySegmentCollectionNew(i);
                    }
                    else if (secondTest)
                    {
                        // Ray starts inside cone and exits.
                        czm_raySegment i = czm_raySegment(0.0, m * second);
                        return czm_raySegmentCollectionNew(i);
                    }
                    else
                    {
                        // Ray starts inside cone and never exits.
                        return czm_raySegmentCollectionNew(czm_fullRaySegment);
                    }
                }
                else
                {
                    if (firstTest && secondTest)
                    {
                        // Ray enters and exits.
                        czm_raySegment i = czm_raySegment(m * first, m * second);
                        return czm_raySegmentCollectionNew(i);
                    }
                    else if (firstTest)
                    {
                        // Ray enters and never exits.
                        czm_raySegment i = czm_raySegment(m * first, czm_infinity);
                        return czm_raySegmentCollectionNew(i);
                    }
                    else if (secondTest)
                    {
                        // Ray enters and never exits.
                        czm_raySegment i = czm_raySegment(m * second, czm_infinity);
                        return czm_raySegmentCollectionNew(i);
                    }
                    else
                    {
                        // Ray never enters.
                        return czm_raySegmentCollectionNew();
                    }
                }
            }
            else // (d == 0.0)  Repeated real roots.  Two intersections.
            {
                if (cone.cosineOfHalfAperture == 0.0) // Planar cone.
                {
                    if (cosineTau >= 0.0) // Inside or on surface.
                    {
                        if (cosineNu >= 0.0) // Looking inward or tangent.
                        {
                            // Ray starts inside cone and never exits.
                            return czm_raySegmentCollectionNew(czm_fullRaySegment);
                        }
                        else
                        {
                            // Ray starts inside cone and intersects.
                            czm_raySegment i = czm_raySegment(0.0, -sqrt(t2) * cosineTau / cosineNu);
                            return czm_raySegmentCollectionNew(i);
                        }
                    }
                    else // Outside.
                    {
                        if (cosineNu <= 0.0) // Looking outward or tangent.
                        {
                            // Ray starts outside cone and never enters.
                            return czm_raySegmentCollectionNew();
                        }
                        else
                        {
                            // Ray starts outside cone and intersects.
                            czm_raySegment i = czm_raySegment(-sqrt(t2) * cosineTau / cosineNu, czm_infinity);
                            return czm_raySegmentCollectionNew(i);
                        }
                    }
                }
                else
                {
                    float a = cosineNu2 - cosineAlpha2;
                    float c = cosineTau2 - cosineAlpha2;
                    float b = 2.0 * (stuff - cosineDelta * cosineAlpha2);

                    float root = (a == 0.0) ? -sign(b) * czm_infinity : (-sign(b) / sign(a)) * sqrt(c / a);

                    // Check roots to ensure that they are non-negative and intersect the desired nape of the cone.
                    bool rootTest = (root >= 0.0) && !(sign(dot(t + root * ray.direction, cone.axis)) == -sign(cone.cosineOfHalfAperture));

                    float m = sqrt(t2);

                    if (cosineTau > cone.cosineOfHalfAperture) // Inside cone.
                    {
                        if (rootTest)
                        {
                            // Ray starts inside cone and exits or becomes tangent.
                            czm_raySegment i = czm_raySegment(0.0, m * root);
                            return czm_raySegmentCollectionNew(i);
                        }
                        else
                        {
                            // Ray starts inside cone and never exits.
                            return czm_raySegmentCollectionNew(czm_fullRaySegment);
                        }
                    }
                    else
                    {
                        if (rootTest)
                        {
                            if (c < 0.0) // Outside both napes of the cone.
                            {
                                // Ray starts outside cone and becomes tangent.
                                float thing = m * root;
                                czm_raySegment i = czm_raySegment(thing, thing);
                                return czm_raySegmentCollectionNew(i);
                            }
                            else
                            {
                                // Ray starts outside cone and enters at vertex.
                                float thing = m * root;
                                czm_raySegment i = czm_raySegment(thing, czm_infinity);
                                return czm_raySegmentCollectionNew(i);
                            }
                        }
                        else
                        {
                            // Ray never enters.
                            return czm_raySegmentCollectionNew();
                        }
                    }
                }
            }
        }
    }
}

/**
 * DOC_TBA
 *
 * @name czm_rayConeIntersectNormal
 * @glslFunction 
 *
 * @see czm_rayConeIntersectionInterval
 * @see czm_pointAlongRay
 *
 * @example
 * // Compute the outward-facing cone normal where a ray first intersects a cone
 * czm_ray ray = czm_ray(vec3(0.0), vec3(0.0, 0.0, 1.0)); // origin, direction
 * czm_cone cone = czm_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0)); // vertex, axis, halfAperture
 * czm_raySegment i = czm_rayConeIntersectionInterval(ray, cone);
 * vec3 normal = czm_coneNormal(cone, czm_pointAlongRay(ray, i.start));
 */
vec3 czm_coneNormal(czm_cone cone, vec3 pointOnCone)
{
    // PERFORMANCE_IDEA: Remove duplicate computation with _czm_rayIntersectsReflectedCone
    vec3 s = pointOnCone - cone.vertex;     // Vector from the origin is at (vertex + s)
    vec3 sUnit = normalize(s);
    return normalize((cone.cosineOfHalfAperture * sUnit - cone.axis) / cone.sineOfHalfAperture);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_ellipsoidSilhouetteCone
 * @glslStruct
 */
struct czm_ellipsoidSilhouetteCone
{
    czm_ellipsoid ellipsoid;
    vec3 pointOutsideEllipsoid;
    czm_cone coneInScaledSpace;
};

/**
 * DOC_TBA
 *
 * @name czm_ellipsoidSilhouetteConeNormal
 * @glslFunction
 *
 */
vec3 czm_ellipsoidSilhouetteConeNormal(czm_ellipsoidSilhouetteCone cone, vec3 pointOnCone)
{
    vec3 pointOnScaledCone = cone.ellipsoid.inverseRadii * (czm_inverseView * vec4(pointOnCone, 1.0)).xyz;

    vec3 scaledNormal = czm_coneNormal(cone.coneInScaledSpace, pointOnScaledCone);

    vec3 temp = -normalize(czm_viewRotation * (cone.ellipsoid.radii * scaledNormal));
    
    return temp;
}

/**
 * DOC_TBA
 *
 * @name czm_ellipsoidSilhouetteConeNew
 * @glslFunction
 *
 */
czm_ellipsoidSilhouetteCone czm_ellipsoidSilhouetteConeNew(czm_ellipsoid ellipsoid, vec3 pointOutsideEllipsoid)
{
	vec3 q = ellipsoid.inverseRadii * (czm_inverseView * vec4(pointOutsideEllipsoid, 1.0)).xyz;
	vec3 axis = -normalize(q);
	
	float q2 = dot(q, q);
	float sineSquaredOfHalfAperture = 1.0 / q2;
	float sineOfHalfAperture = sqrt(sineSquaredOfHalfAperture);
	float cosineSquaredOfHalfAperture = 1.0 - sineSquaredOfHalfAperture;
	float cosineOfHalfAperture = sqrt(cosineSquaredOfHalfAperture);
	float halfAperture = atan(sineOfHalfAperture / cosineOfHalfAperture);
	
    float x2 = axis.x * axis.x;
    float y2 = axis.y * axis.y;
    float z2 = axis.z * axis.z;
    float xy = axis.x * axis.y;
    float yz = axis.y * axis.z;
    float zx = axis.z * axis.x;

    // This is a symmetric matrix.
    mat3 intersectionMatrix = mat3(
    	cosineSquaredOfHalfAperture - x2, -xy,                              -zx,
		-xy,                              cosineSquaredOfHalfAperture - y2, -yz,
		-zx,                              -yz,                              cosineSquaredOfHalfAperture - z2);            
	
	czm_cone coneInScaledSpace = czm_cone(q, axis, halfAperture,
		cosineOfHalfAperture, cosineSquaredOfHalfAperture,
		sineOfHalfAperture, sineSquaredOfHalfAperture, intersectionMatrix);

    // ANGLE workaround:  http://code.google.com/p/angleproject/issues/detail?id=185		
	czm_ellipsoidSilhouetteCone temp = czm_ellipsoidSilhouetteCone(ellipsoid, pointOutsideEllipsoid, coneInScaledSpace);
	return temp;
}

/**
 * DOC_TBA
 *
 * @name czm_rayEllipsoidSilhouetteConeIntersectionInterval
 * @glslFunction
 *
 */
czm_raySegment czm_rayEllipsoidSilhouetteConeIntersectionInterval(czm_ray ray, czm_ellipsoidSilhouetteCone cone)
{
	// Determine the ray in the scaled space.
	vec3 origin = cone.ellipsoid.inverseRadii * (czm_inverseView * vec4(ray.origin, 1.0)).xyz;
	vec3 direction = normalize(cone.ellipsoid.inverseRadii * (czm_inverseViewRotation * ray.direction));
	czm_ray rayInScaledSpace = czm_ray(origin, direction);
	
	// Perform the intersection in the scaled space.
	czm_raySegmentCollection collection = czm_rayConeIntersectionInterval(rayInScaledSpace, cone.coneInScaledSpace);

	if (collection.count == 0) // No intersection.
	{
		return czm_emptyRaySegment;
	}
	else // Intersection.
	{
        czm_raySegment interval = collection.intervals[0];
        
		// Honor ray origin case (start == 0.0).
		float start = interval.start;
		if (start != 0.0)
		{
			// Determine start in unscaled space.
			vec3 temp = (czm_view * vec4(cone.ellipsoid.radii * czm_pointAlongRay(rayInScaledSpace, start), 1.0)).xyz;
			start = dot(temp, ray.direction);
		}
		
		// Honor infinite ray (stop == infinity).
		float stop = interval.stop;
		if (stop != czm_infinity)
		{
			// Determine stop in unscaled space.
			vec3 temp = (czm_view * vec4(cone.ellipsoid.radii * czm_pointAlongRay(rayInScaledSpace, stop), 1.0)).xyz;
			stop = dot(temp, ray.direction);
		}
		
		return czm_raySegment(start, stop);
	}
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_halfspace
 * @glslStruct
 */
struct czm_halfspace
{
	vec3 center;
	vec3 normal; // Unit vector.
};

/**
 * DOC_TBA
 *
 * @name czm_rayHalfspaceIntersectionInterval
 * @glslFunction
 *
 */
czm_raySegment czm_rayHalfspaceIntersectionInterval(czm_ray ray, czm_halfspace halfspace)
{
	float numerator = dot(halfspace.center - ray.origin, halfspace.normal);
	float denominator = dot(ray.direction, halfspace.normal);
	
	if (numerator > 0.0) // Inside.
	{
		if (denominator > 0.0) // Looking outward.
		{
			return czm_raySegment(0.0, numerator / denominator);
		}
		else // Looking inward or parallel.
		{
			return czm_fullRaySegment;		
		}
	}
	else if (numerator < 0.0) // Outside.
	{
		if (denominator < 0.0 ) // Looking inward.
		{
			return czm_raySegment(numerator / denominator, czm_infinity);		
		}
		else // Looking outward or parallel.
		{
			return czm_emptyRaySegment;
		}
	}
	else // On surface.
	{
		if (denominator < 0.0 ) // Looking inward.
		{
			return czm_fullRaySegment;		
		}
		else // Looking outward or parallel.
		{
			return czm_emptyRaySegment;
		}
	}
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_ellipsoidSilhouetteHalfspace
 * @glslStruct
 */
struct czm_ellipsoidSilhouetteHalfspace
{
    czm_ellipsoid ellipsoid;
    vec3 pointOutsideEllipsoid;
    czm_halfspace halfspaceInScaledSpace;
};

/**
 * DOC_TBA
 *
 * @name czm_ellipsoidSilhouetteHalfspaceNew
 * @glslFunction
 *
 */
czm_ellipsoidSilhouetteHalfspace czm_ellipsoidSilhouetteHalfspaceNew(czm_ellipsoid ellipsoid, vec3 pointOutsideEllipsoid)
{
	vec3 q = ellipsoid.inverseRadii * (czm_inverseView * vec4(pointOutsideEllipsoid, 1.0)).xyz;
	float magnitude = 1.0 / length(q);
	vec3 normal = normalize(q);
	vec3 center = magnitude * normal;      
	
	czm_halfspace halfspaceInScaledSpace = czm_halfspace(center, normal);

    // ANGLE workaround:  http://code.google.com/p/angleproject/issues/detail?id=185		
	czm_ellipsoidSilhouetteHalfspace temp = czm_ellipsoidSilhouetteHalfspace(ellipsoid, pointOutsideEllipsoid, halfspaceInScaledSpace);
	return temp;
}

/**
 * DOC_TBA
 *
 * @name czm_rayEllipsoidSilhouetteHalfspaceIntersectionInterval
 * @glslFunction
 *
 */
czm_raySegment czm_rayEllipsoidSilhouetteHalfspaceIntersectionInterval(czm_ray ray, czm_ellipsoidSilhouetteHalfspace halfspace)
{
	// Determine the ray in the scaled space.
	vec3 origin = halfspace.ellipsoid.inverseRadii * (czm_inverseView * vec4(ray.origin, 1.0)).xyz;
	vec3 direction = halfspace.ellipsoid.inverseRadii * (czm_inverseViewRotation * ray.direction);
	czm_ray rayInScaledSpace = czm_ray(origin, direction);
	
	// Perform the intersection in the scaled space.
	czm_raySegment interval = czm_rayHalfspaceIntersectionInterval(rayInScaledSpace, halfspace.halfspaceInScaledSpace);

	if (czm_isEmpty(interval)) // No intersection.
	{
		return interval;
	}
	else // Intersection.
	{
		// Honor ray origin case (start == 0.0).
		float start = interval.start;
		if (start != 0.0)
		{
			// Determine start in unscaled space.
			vec3 temp = (czm_view * vec4(halfspace.ellipsoid.radii * czm_pointAlongRay(rayInScaledSpace, start), 1.0)).xyz;
			start = dot(temp, ray.direction);
		}
		
		// Honor infinite ray (stop == infinity).
		float stop = interval.stop;
		if (stop != czm_infinity)
		{
			// Determine stop in unscaled space.
			vec3 temp = (czm_view * vec4(halfspace.ellipsoid.radii * czm_pointAlongRay(rayInScaledSpace, stop), 1.0)).xyz;
			stop = dot(temp, ray.direction);
		}
		
		return czm_raySegment(start, stop);
	}
}
