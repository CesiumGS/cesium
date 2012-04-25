float _agi_addWithCancellationCheck(float left, float right, float tolerance)
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
 * @name agi_quadraticRoots
 * @glslStruct
 */
struct agi_quadraticRoots
{
    int numberOfRoots;
    float root0;
    float root1;
};

/**
 * Computes the real-valued roots of the 2nd order polynomial function of one variable with only real coefficients.
 *
 * @name agi_quadraticRealPolynomialRealRoots
 * @glslFunction
 *
 * @param {float} a The coefficient of the 2nd order monomial.
 * @param {float} b The coefficient of the 1st order monomial.
 * @param {float} c The coefficient of the 0th order monomial.
 * 
 * @returns {agi_quadraticRoots} Zero, one, or two real-valued roots.
 * 
 * @example
 * agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, -4.0, -6.0); // 2(x + 1)(x - 3)
 * // The result is r.numberOfRoots = 2, r.root0 = -1.0, and r.root1 = 3.0.
 */
agi_quadraticRoots agi_quadraticRealPolynomialRealRoots(float a, float b, float c)
{
    // This function's return statements have an ANGLE workaround:  http://code.google.com/p/angleproject/issues/detail?id=185

    const float tolerance = agi_epsilon7;

    if (a == 0.0)
    {
        if (b == 0.0)
        {
            // Constant function: c = 0.  No real polynomial roots possible.
            agi_quadraticRoots r = agi_quadraticRoots(0, 0.0, 0.0);
            return r;
        }
        else
        {
            // Linear function: b * x + c = 0.
            agi_quadraticRoots r = agi_quadraticRoots(1, -c / b, 0.0);
            return r;           
        }
    }
    else if (b == 0.0)
    {
        if (c == 0.0)
        {
            // 2nd order monomial: a * x^2 = 0.
            agi_quadraticRoots r = agi_quadraticRoots(2, 0.0, 0.0);
            return r;
        }
        else
        {
            float cMagnitude = abs(c);
            float aMagnitude = abs(a);
    
            if ((cMagnitude < aMagnitude) && (cMagnitude / aMagnitude < tolerance)) // c ~= 0.0.
            {
                // 2nd order monomial: a * x^2 = 0.
                agi_quadraticRoots r = agi_quadraticRoots(2, 0.0, 0.0);
                return r;
            }
            else if ((cMagnitude > aMagnitude) && (aMagnitude / cMagnitude < tolerance)) // a ~= 0.0.
            {
                // Constant function: c = 0.
                agi_quadraticRoots r = agi_quadraticRoots(0, 0.0, 0.0);
                return r;
            }
            else
            {
                // a * x^2 + c = 0
                float ratio = -c / a;
    
                if (ratio < 0.0)
                {
                    // Both roots are complex.
                    agi_quadraticRoots r = agi_quadraticRoots(0, 0.0, 0.0);
                    return r;
                }
                else
                {
                    // Both roots are real.
                    float root = sqrt(ratio);
    
                    // Return them in ascending order.
                    agi_quadraticRoots r = agi_quadraticRoots(2, -root, root);
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
            agi_quadraticRoots r = agi_quadraticRoots(2, ratio, 0.0);
            return r;           
        }
        else
        {
            agi_quadraticRoots r = agi_quadraticRoots(2, 0.0, ratio);
            return r;
        }
    }
    else
    {
        // a * x^2 + b * x + c = 0
        float b2 = b * b;
        float four_ac = 4.0 * a * c;
        float radicand = _agi_addWithCancellationCheck(b2, -four_ac, tolerance);
    
        if (radicand < 0.0)
        {
            // Both roots are complex.
            agi_quadraticRoots r = agi_quadraticRoots(0, 0.0, 0.0);
            return r;
        }
        else
        {
            // Both roots are real.
            float q = -0.5 * _agi_addWithCancellationCheck(b, sign(b) * sqrt(radicand), tolerance);
    
            // Return them in ascending order.
            if (b > 0.0)
            {
                // q < 0.0
                agi_quadraticRoots r = agi_quadraticRoots(2, q / a, c / q);
                return r;               
            }
            else
            {
                // q > 0.0
                agi_quadraticRoots r = agi_quadraticRoots(2, c / q, q / a);
                return r;               
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_sphere
 * @glslStruct
 */
struct agi_sphere
{
    vec3 center;
    float radius;
};

/**
 * DOC_TBA
 *
 * @name agi_raySphereIntersectionInterval
 * @glslFunction
 *
 * @see agi_sphereNormal
 */
agi_raySegment agi_raySphereIntersectionInterval(agi_ray ray, agi_sphere sphere)
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
        return agi_emptyRaySegment;  // ray does not intersect (at least not along the indicated direction).
    }
    
    float s2 = s * s;
    float m2 = l2 - s2;
    
    if (m2 > r2) // Discriminant is negative, yielding only imaginary roots.
    {
        return agi_emptyRaySegment;  // ray does not intersect.
    }
    
    float q = sqrt(r2 - m2);

    if (agi_equalsEpsilon(q, 0.0)) // Discriminant is zero, yielding a double root.
    {
        return agi_raySegment(s, s);  // ray is tangent.
    }
        
    if (l2 > r2) // Outside of sphere.
    {
	    agi_raySegment i = agi_raySegment(s - q, s + q);
	    return i;
    }
    else if (l2 < r2) // Inside of sphere.
   	{
        agi_raySegment i = agi_raySegment(0.0, s + q);
        return i;
    }
    else if (s > 0.0) // On sphere and looking inward.
    {
        agi_raySegment i = agi_raySegment(0.0, s + q);
        return i;
    }
    else // On sphere and looking outward or tangent.
    {
        return agi_emptyRaySegment;
   	}
}

/**
 * DOC_TBA
 *
 * @name agi_sphereNormal
 * @glslFunction
 *
 * @see agi_raySphereIntersectionInterval 
 * @see agi_pointAlongRay
 */
vec3 agi_sphereNormal(agi_sphere sphere, vec3 pointOnSphere)
{
    return normalize(pointOnSphere - sphere.center);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_ellipsoid
 * @glslStruct
 */
struct agi_ellipsoid
{
    vec3 center;
    vec3 radii;
    vec3 inverseRadii;
    vec3 inverseRadiiSquared;
};

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidNew
 * @glslFunction
 *
 */
agi_ellipsoid agi_ellipsoidNew(vec3 center, vec3 radii)
{
	vec3 inverseRadii = vec3(1.0 / radii.x, 1.0 / radii.y, 1.0 / radii.z);
	vec3 inverseRadiiSquared = inverseRadii * inverseRadii;
	agi_ellipsoid temp = agi_ellipsoid(center, radii, inverseRadii, inverseRadiiSquared);
	return temp;
}

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidContainsPoint
 * @glslFunction
 *
 */
bool agi_ellipsoidContainsPoint(agi_ellipsoid ellipsoid, vec3 point)
{
	vec3 scaled = ellipsoid.inverseRadii * (agi_inverseView * vec4(point, 1.0)).xyz;
	return (dot(scaled, scaled) <= 1.0);
}

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidNormal
 * @glslFunction
 *
 */
vec3 agi_ellipsoidNormal(agi_ellipsoid ellipsoid, vec3 pointOnEllipsoid)
{
    vec3 n = ellipsoid.inverseRadiiSquared * (agi_inverseView * vec4(pointOnEllipsoid, 1.0)).xyz;
    vec3 rotated = (agi_view * vec4(n, 0.0)).xyz;
    return normalize(rotated);
}

/**
 * DOC_TBA
 *
 *
 * @name agi_rayEllipsoidIntersectionInterval
 * @glslFunction
 */
agi_raySegment agi_rayEllipsoidIntersectionInterval(agi_ray ray, agi_ellipsoid ellipsoid)
{
    vec3 q = ellipsoid.inverseRadii * (agi_inverseView * vec4(ray.origin, 1.0)).xyz;
    vec3 w = ellipsoid.inverseRadii * (agi_inverseView * vec4(ray.direction, 0.0)).xyz;
   
    float q2 = dot(q, q);
    float qw = dot(q, w);
    
    if (q2 > 1.0) // Outside ellipsoid.
    {
    	if (qw >= 0.0) // Looking outward or tangent (0 intersections).
    	{
	        return agi_emptyRaySegment;
    	}
    	else // qw < 0.0.
    	{
    		float qw2 = qw * qw;
	    	float difference = q2 - 1.0; // Positively valued.
		    float w2 = dot(w, w);
		    float product = w2 * difference;
	    	
	    	if (qw2 < product) // Imaginary roots (0 intersections).
	    	{
		        return agi_emptyRaySegment; 	
	    	}	
	    	else if (qw2 > product) // Distinct roots (2 intersections).
	    	{
		    	float discriminant = qw * qw - product;
		    	float temp = -qw + sqrt(discriminant); // Avoid cancellation.
		    	float root0 = temp / w2;
		    	float root1 = difference / temp;
		    	if (root0 < root1)
		    	{
			        agi_raySegment i = agi_raySegment(root0, root1);
			        return i;
		    	}
		    	else
		    	{
			        agi_raySegment i = agi_raySegment(root1, root0);
			        return i;
		    	}
	    	}
	    	else // qw2 == product.  Repeated roots (2 intersections).
	    	{
	    		float root = sqrt(difference / w2);
		        agi_raySegment i = agi_raySegment(root, root);
		        return i;
	    	}
    	}
    }
    else if (q2 < 1.0) // Inside ellipsoid (2 intersections).
    {
    	float difference = q2 - 1.0; // Negatively valued.
	    float w2 = dot(w, w);
	    float product = w2 * difference; // Negatively valued.
    	if (qw < 0.0) // Looking inward.
    	{
	    	float discriminant = qw * qw - product;
	    	float temp = qw - sqrt(discriminant); // Avoid cancellation.  Negatively valued.
	        agi_raySegment i = agi_raySegment(0.0, difference / temp);
	        return i;
    	}
    	else if (qw > 0.0) // Looking outward.
    	{
	    	float discriminant = qw * qw - product;
	    	float temp = qw + sqrt(discriminant); // Avoid cancellation. Positively valued.
	        agi_raySegment i = agi_raySegment(0.0, temp / w2);
	        return i;
    	}
    	else // qw == 0.0 // Looking tangent.
    	{
	    	float temp = sqrt(-product);
	        agi_raySegment i = agi_raySegment(0.0, temp / w2);
	        return i;
    	}
    }
    else // q2 == 1.0. On ellipsoid.
    {
    	if (qw < 0.0) // Looking inward.
    	{
		    float w2 = dot(w, w);
	        agi_raySegment i = agi_raySegment(0.0, -qw / w2);
	        return i;
		}
    	else // qw >= 0.0.  Looking outward or tangent.
    	{
			return agi_emptyRaySegment;
    	}
	}
}

/**
 * Returns the WGS84 ellipsoid, with its center at the origin of world coordinates, in eye coordinates.
 *
 * @name agi_getWgs84EllipsoidEC
 * @glslFunction
 *
 * @returns {agi_ellipsoid} The WGS84 ellipsoid, with its center at the origin of world coordinates, in eye coordinates.
 *
 * @see Ellipsoid.getWgs84
 *
 * @example
 * agi_ellipsoid ellipsoid = agi_getWgs84EllipsoidEC();
 */
agi_ellipsoid agi_getWgs84EllipsoidEC()
{
    return agi_ellipsoidNew(
        vec3(agi_view[3].x, agi_view[3].y, agi_view[3].z),              // center
        vec3(6378137.0, 6378137.0, 6356752.314245));                    // radii
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_cone
 * @glslStruct
 */
struct agi_cone
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

agi_cone agi_coneNew(vec3 vertex, vec3 axis, float halfAperture)
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
	
    agi_cone temp = agi_cone(vertex, axis, halfAperture,
    	cosineOfHalfAperture, cosineSquaredOfHalfAperture,
    	sineOfHalfAperture, sineSquaredOfHalfAperture, intersectionMatrix);
    return temp;
}

/**
 * Determines if a point is in, or on the boundary, of an infinite cone.
 *
 * @name agi_coneContainsPoint
 * @glslFunction
 *
 * @param {agi_cone} cone The infinite cone.
 * @param {vec3} point The point to test for containment.
 *
 * @returns {bool} <code>true</code> if the point is in the infinite cone; otherwise, <code>false</code>.
 *
 * @see agi_rayConeIntersectionInterval
 *
 * @example
 * agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0)); // vertex, axis, halfAperture
 * vec3 point = vec3(1.0, 0.0, 0.0);
 * bool b = agi_coneContainsPoint(cone, point)); // false
 */
bool agi_coneContainsPoint(agi_cone cone, vec3 point)
{
    vec3 n = normalize(point - cone.vertex);
    return (dot(n, cone.axis) >= cone.cosineOfHalfAperture);
}

bool _agi_rayIntersectsReflectedCone(agi_ray ray, agi_cone cone, float time, float cosine)
{
    vec3 s = ray.origin + (time * ray.direction) - cone.vertex;  // The vector from the origin is at (vertex + s)
    vec3 sUnit = normalize(s);
    float c = dot(sUnit, cone.axis);
    
    return (sign(c) != sign(cosine));
}

/**
 * DOC_TBA
 *
 * @name agi_rayConeIntersectionInterval
 * @glslFunction
 *
 * @see agi_coneNormal
 * @see agi_coneContainsPoint
 */
agi_raySegmentCollection agi_rayConeIntersectionInterval(agi_ray ray, agi_cone cone)
{
    vec3 temp = ray.origin - cone.vertex;

    float t2 = dot(temp, temp);

    float cosineNu = dot(ray.direction, cone.axis);

    if (t2 == 0.0) // At vertex.
    {
        if (cosineNu >= cone.cosineOfHalfAperture) // Looking inward or along surface.
        {
            return agi_raySegmentCollectionNew(agi_fullRaySegment);
        }
        else // Looking outward.
        {
            return agi_raySegmentCollectionNew();
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
                    return agi_raySegmentCollectionNew(agi_fullRaySegment);
                }
                else // Looking toward vertex.
                {
                    agi_raySegment i = agi_raySegment(0.0, length(temp));
                    return agi_raySegmentCollectionNew(i);
                }
            }
            else // Looking tangent at surface.
            {
                return agi_raySegmentCollectionNew();
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
                    return agi_raySegmentCollectionNew(agi_fullRaySegment);
                }
                else // Acute cone.
                {
                    return agi_raySegmentCollectionNew();
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
                        agi_raySegment one = agi_raySegment(0.0, m * first);
                        agi_raySegment two = agi_raySegment(m * second, agi_infinity);
                        return agi_raySegmentCollectionNew(one, two);
                    }
                    else if (firstTest)
                    {
                        // Ray starts inside cone and exits.
                        agi_raySegment i = agi_raySegment(0.0, m * first);
                        return agi_raySegmentCollectionNew(i);
                    }
                    else if (secondTest)
                    {
                        // Ray starts inside cone and exits.
                        agi_raySegment i = agi_raySegment(0.0, m * second);
                        return agi_raySegmentCollectionNew(i);
                    }
                    else
                    {
                        // Ray starts inside cone and never exits.
                        return agi_raySegmentCollectionNew(agi_fullRaySegment);
                    }
                }
                else
                {
                    if (firstTest && secondTest)
                    {
                        // Ray enters and exits.
                        agi_raySegment i = agi_raySegment(m * first, m * second);
                        return agi_raySegmentCollectionNew(i);
                    }
                    else if (firstTest)
                    {
                        // Ray enters and never exits.
                        agi_raySegment i = agi_raySegment(m * first, agi_infinity);
                        return agi_raySegmentCollectionNew(i);
                    }
                    else if (secondTest)
                    {
                        // Ray enters and never exits.
                        agi_raySegment i = agi_raySegment(m * second, agi_infinity);
                        return agi_raySegmentCollectionNew(i);
                    }
                    else
                    {
                        // Ray never enters.
                        return agi_raySegmentCollectionNew();
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
                            return agi_raySegmentCollectionNew(agi_fullRaySegment);
                        }
                        else
                        {
                            // Ray starts inside cone and intersects.
                            agi_raySegment i = agi_raySegment(0.0, -sqrt(t2) * cosineTau / cosineNu);
                            return agi_raySegmentCollectionNew(i);
                        }
                    }
                    else // Outside.
                    {
                        if (cosineNu <= 0.0) // Looking outward or tangent.
                        {
                            // Ray starts outside cone and never enters.
                            return agi_raySegmentCollectionNew();
                        }
                        else
                        {
                            // Ray starts outside cone and intersects.
                            agi_raySegment i = agi_raySegment(-sqrt(t2) * cosineTau / cosineNu, agi_infinity);
                            return agi_raySegmentCollectionNew(i);
                        }
                    }
                }
                else
                {
                    float a = cosineNu2 - cosineAlpha2;
                    float c = cosineTau2 - cosineAlpha2;
                    float b = 2.0 * (stuff - cosineDelta * cosineAlpha2);

                    float root = (a == 0.0) ? -sign(b) * agi_infinity : (-sign(b) / sign(a)) * sqrt(c / a);

                    // Check roots to ensure that they are non-negative and intersect the desired nape of the cone.
                    bool rootTest = (root >= 0.0) && !(sign(dot(t + root * ray.direction, cone.axis)) == -sign(cone.cosineOfHalfAperture));

                    float m = sqrt(t2);

                    if (cosineTau > cone.cosineOfHalfAperture) // Inside cone.
                    {
                        if (rootTest)
                        {
                            // Ray starts inside cone and exits or becomes tangent.
                            agi_raySegment i = agi_raySegment(0.0, m * root);
                            return agi_raySegmentCollectionNew(i);
                        }
                        else
                        {
                            // Ray starts inside cone and never exits.
                            return agi_raySegmentCollectionNew(agi_fullRaySegment);
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
                                agi_raySegment i = agi_raySegment(thing, thing);
                                return agi_raySegmentCollectionNew(i);
                            }
                            else
                            {
                                // Ray starts outside cone and enters at vertex.
                                float thing = m * root;
                                agi_raySegment i = agi_raySegment(thing, agi_infinity);
                                return agi_raySegmentCollectionNew(i);
                            }
                        }
                        else
                        {
                            // Ray never enters.
                            return agi_raySegmentCollectionNew();
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
 * @name agi_rayConeIntersectNormal
 * @glslFunction 
 *
 * @see agi_rayConeIntersectionInterval
 * @see agi_pointAlongRay
 *
 * @example
 * // Compute the outward-facing cone normal where a ray first intersects a cone
 * agi_ray ray = agi_ray(vec3(0.0), vec3(0.0, 0.0, 1.0)); // origin, direction
 * agi_cone cone = agi_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0)); // vertex, axis, halfAperture
 * agi_raySegment i = agi_rayConeIntersectionInterval(ray, cone);
 * vec3 normal = agi_coneNormal(cone, agi_pointAlongRay(ray, i.start));
 */
vec3 agi_coneNormal(agi_cone cone, vec3 pointOnCone)
{
    // PERFORMANCE_IDEA: Remove duplicate computation with _agi_rayIntersectsReflectedCone
    vec3 s = pointOnCone - cone.vertex;     // Vector from the origin is at (vertex + s)
    vec3 sUnit = normalize(s);
    return normalize((cone.cosineOfHalfAperture * sUnit - cone.axis) / cone.sineOfHalfAperture);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidSilhouetteCone
 * @glslStruct
 */
struct agi_ellipsoidSilhouetteCone
{
    agi_ellipsoid ellipsoid;
    vec3 pointOutsideEllipsoid;
    agi_cone coneInScaledSpace;
};

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidSilhouetteConeNormal
 * @glslFunction
 *
 */
vec3 agi_ellipsoidSilhouetteConeNormal(agi_ellipsoidSilhouetteCone cone, vec3 pointOnCone)
{
    vec3 pointOnScaledCone = cone.ellipsoid.inverseRadii * (agi_inverseView * vec4(pointOnCone, 1.0)).xyz;

    vec3 scaledNormal = agi_coneNormal(cone.coneInScaledSpace, pointOnScaledCone);

    vec3 temp = -normalize((agi_view * vec4(cone.ellipsoid.radii * scaledNormal, 0.0)).xyz);
    
    return temp;
}

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidSilhouetteConeNew
 * @glslFunction
 *
 */
agi_ellipsoidSilhouetteCone agi_ellipsoidSilhouetteConeNew(agi_ellipsoid ellipsoid, vec3 pointOutsideEllipsoid)
{
	vec3 q = ellipsoid.inverseRadii * (agi_inverseView * vec4(pointOutsideEllipsoid, 1.0)).xyz;
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
	
	agi_cone coneInScaledSpace = agi_cone(q, axis, halfAperture,
		cosineOfHalfAperture, cosineSquaredOfHalfAperture,
		sineOfHalfAperture, sineSquaredOfHalfAperture, intersectionMatrix);

    // ANGLE workaround:  http://code.google.com/p/angleproject/issues/detail?id=185		
	agi_ellipsoidSilhouetteCone temp = agi_ellipsoidSilhouetteCone(ellipsoid, pointOutsideEllipsoid, coneInScaledSpace);
	return temp;
}

/**
 * DOC_TBA
 *
 * @name agi_rayEllipsoidSilhouetteConeIntersectionInterval
 * @glslFunction
 *
 */
agi_raySegment agi_rayEllipsoidSilhouetteConeIntersectionInterval(agi_ray ray, agi_ellipsoidSilhouetteCone cone)
{
	// Determine the ray in the scaled space.
	vec3 origin = cone.ellipsoid.inverseRadii * (agi_inverseView * vec4(ray.origin, 1.0)).xyz;
	vec3 direction = normalize(cone.ellipsoid.inverseRadii * (agi_inverseView * vec4(ray.direction, 0.0)).xyz);
	agi_ray rayInScaledSpace = agi_ray(origin, direction);
	
	// Perform the intersection in the scaled space.
	agi_raySegmentCollection collection = agi_rayConeIntersectionInterval(rayInScaledSpace, cone.coneInScaledSpace);

	if (collection.count == 0) // No intersection.
	{
		return agi_emptyRaySegment;
	}
	else // Intersection.
	{
        agi_raySegment interval = collection.intervals[0];
        
		// Honor ray origin case (start == 0.0).
		float start = interval.start;
		if (start != 0.0)
		{
			// Determine start in unscaled space.
			vec3 temp = (agi_view * vec4(cone.ellipsoid.radii * agi_pointAlongRay(rayInScaledSpace, start), 1.0)).xyz;
			start = dot(temp, ray.direction);
		}
		
		// Honor infinite ray (stop == infinity).
		float stop = interval.stop;
		if (stop != agi_infinity)
		{
			// Determine stop in unscaled space.
			vec3 temp = (agi_view * vec4(cone.ellipsoid.radii * agi_pointAlongRay(rayInScaledSpace, stop), 1.0)).xyz;
			stop = dot(temp, ray.direction);
		}
		
		return agi_raySegment(start, stop);
	}
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_halfspace
 * @glslStruct
 */
struct agi_halfspace
{
	vec3 center;
	vec3 normal; // Unit vector.
};

/**
 * DOC_TBA
 *
 * @name agi_rayHalfspaceIntersectionInterval
 * @glslFunction
 *
 */
agi_raySegment agi_rayHalfspaceIntersectionInterval(agi_ray ray, agi_halfspace halfspace)
{
	float numerator = dot(halfspace.center - ray.origin, halfspace.normal);
	float denominator = dot(ray.direction, halfspace.normal);
	
	if (numerator > 0.0) // Inside.
	{
		if (denominator > 0.0) // Looking outward.
		{
			return agi_raySegment(0.0, numerator / denominator);
		}
		else // Looking inward or parallel.
		{
			return agi_fullRaySegment;		
		}
	}
	else if (numerator < 0.0) // Outside.
	{
		if (denominator < 0.0 ) // Looking inward.
		{
			return agi_raySegment(numerator / denominator, agi_infinity);		
		}
		else // Looking outward or parallel.
		{
			return agi_emptyRaySegment;
		}
	}
	else // On surface.
	{
		if (denominator < 0.0 ) // Looking inward.
		{
			return agi_fullRaySegment;		
		}
		else // Looking outward or parallel.
		{
			return agi_emptyRaySegment;
		}
	}
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidSilhouetteHalfspace
 * @glslStruct
 */
struct agi_ellipsoidSilhouetteHalfspace
{
    agi_ellipsoid ellipsoid;
    vec3 pointOutsideEllipsoid;
    agi_halfspace halfspaceInScaledSpace;
};

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidSilhouetteHalfspaceNew
 * @glslFunction
 *
 */
agi_ellipsoidSilhouetteHalfspace agi_ellipsoidSilhouetteHalfspaceNew(agi_ellipsoid ellipsoid, vec3 pointOutsideEllipsoid)
{
	vec3 q = ellipsoid.inverseRadii * (agi_inverseView * vec4(pointOutsideEllipsoid, 1.0)).xyz;
	float magnitude = 1.0 / length(q);
	vec3 normal = normalize(q);
	vec3 center = magnitude * normal;      
	
	agi_halfspace halfspaceInScaledSpace = agi_halfspace(center, normal);

    // ANGLE workaround:  http://code.google.com/p/angleproject/issues/detail?id=185		
	agi_ellipsoidSilhouetteHalfspace temp = agi_ellipsoidSilhouetteHalfspace(ellipsoid, pointOutsideEllipsoid, halfspaceInScaledSpace);
	return temp;
}

/**
 * DOC_TBA
 *
 * @name agi_rayEllipsoidSilhouetteHalfspaceIntersectionInterval
 * @glslFunction
 *
 */
agi_raySegment agi_rayEllipsoidSilhouetteHalfspaceIntersectionInterval(agi_ray ray, agi_ellipsoidSilhouetteHalfspace halfspace)
{
	// Determine the ray in the scaled space.
	vec3 origin = halfspace.ellipsoid.inverseRadii * (agi_inverseView * vec4(ray.origin, 1.0)).xyz;
	vec3 direction = halfspace.ellipsoid.inverseRadii * (agi_inverseView * vec4(ray.direction, 0.0)).xyz;
	agi_ray rayInScaledSpace = agi_ray(origin, direction);
	
	// Perform the intersection in the scaled space.
	agi_raySegment interval = agi_rayHalfspaceIntersectionInterval(rayInScaledSpace, halfspace.halfspaceInScaledSpace);

	if (agi_isEmpty(interval)) // No intersection.
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
			vec3 temp = (agi_view * vec4(halfspace.ellipsoid.radii * agi_pointAlongRay(rayInScaledSpace, start), 1.0)).xyz;
			start = dot(temp, ray.direction);
		}
		
		// Honor infinite ray (stop == infinity).
		float stop = interval.stop;
		if (stop != agi_infinity)
		{
			// Determine stop in unscaled space.
			vec3 temp = (agi_view * vec4(halfspace.ellipsoid.radii * agi_pointAlongRay(rayInScaledSpace, stop), 1.0)).xyz;
			stop = dot(temp, ray.direction);
		}
		
		return agi_raySegment(start, stop);
	}
}
