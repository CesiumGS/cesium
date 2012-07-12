/**
 * DOC_TBA
 *
 * @name agi_infinity
 * @glslConstant 
 */
const float agi_infinity = 5906376272000.0; // Distance from the Sun to Pluto in meters.  TODO: What is best given lowp, mediump, and highp?

/**
 * DOC_TBA
 *
 * @name agi_epsilon1
 * @glslConstant 
 */
const float agi_epsilon1 = 0.1;
        
/**
 * DOC_TBA
 *
 * @name agi_epsilon2
 * @glslConstant 
 */
const float agi_epsilon2 = 0.01;
        
/**
 * DOC_TBA
 *
 * @name agi_epsilon3
 * @glslConstant 
 */
const float agi_epsilon3 = 0.001;
        
/**
 * DOC_TBA
 *
 * @name agi_epsilon4
 * @glslConstant 
 */
const float agi_epsilon4 = 0.0001;
        
/**
 * DOC_TBA
 *
 * @name agi_epsilon5
 * @glslConstant 
 */
const float agi_epsilon5 = 0.00001;
        
/**
 * DOC_TBA
 *
 * @name agi_epsilon6
 * @glslConstant 
 */
const float agi_epsilon6 = 0.000001;
        
/**
 * DOC_TBA
 *
 * @name agi_epsilon7
 * @glslConstant 
 */
const float agi_epsilon7 = 0.0000001;

/**
 * DOC_TBA
 *
 * @name agi_equalsEpsilon
 * @glslFunction
 */
bool agi_equalsEpsilon(float left, float right, float epsilon) {
    return (abs(left - right) <= epsilon);
}

bool agi_equalsEpsilon(float left, float right) {
    // Workaround bug in Opera Next 12.  Do not delegate to the other agi_equalsEpsilon.
    return (abs(left - right) <= agi_epsilon7);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Returns the transpose of the matrix.  The input <code>matrix</code> can be 
 * a <code>mat2</code>, <code>mat3</code>, or <code>mat4</code>.
 *
 * @name agi_transpose
 * @glslFunction
 *
 * @param {} matrix The matrix to transpose.
 *
 * @returns {} The transposed matrix.
 *
 * @example
 * // GLSL declarations
 * mat2 agi_transpose(mat2 matrix);
 * mat3 agi_transpose(mat3 matrix);
 * mat4 agi_transpose(mat4 matrix);
 *
 * // Tranpose a 3x3 rotation matrix to find its inverse.
 * mat3 eastNorthUpToEye = agi_eastNorthUpToEyeCoordinates(
 *     positionMC, normalEC);
 * mat3 eyeToEastNorthUp = agi_transpose(eastNorthUpToEye);
 */
mat2 agi_transpose(mat2 matrix)
{
    return mat2(
        matrix[0][0], matrix[1][0],
        matrix[0][1], matrix[1][1]);
}

mat3 agi_transpose(mat3 matrix)
{
    return mat3(
        matrix[0][0], matrix[1][0], matrix[2][0],
        matrix[0][1], matrix[1][1], matrix[2][1],
        matrix[0][2], matrix[1][2], matrix[2][2]);
}

mat4 agi_transpose(mat4 matrix)
{
    return mat4(
        matrix[0][0], matrix[1][0], matrix[2][0], matrix[3][0],
        matrix[0][1], matrix[1][1], matrix[2][1], matrix[3][1],
        matrix[0][2], matrix[1][2], matrix[2][2], matrix[3][2],
        matrix[0][3], matrix[1][3], matrix[2][3], matrix[3][3]);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Transforms a position from model to window coordinates.  The transformation
 * from model to clip coordinates is done using {@link agi_modelViewProjection}.
 * The transform from normalized device coordinates to window coordinates is
 * done using {@link agi_viewportTransformation}, which assumes a depth range
 * of <code>near = 0</code> and <code>far = 1</code>.
 * <br /><br />
 * This transform is useful when there is a need to manipulate window coordinates
 * in a vertex shader as done by {@link BillboardCollection}.
 * <br /><br />
 * This function should not be confused with {@link agi_viewportOrthographic},
 * which is an orthographic projection matrix that transforms from window 
 * coordinates to clip coordinates.
 *
 * @name agi_modelToWindowCoordinates
 * @glslFunction
 *
 * @param {vec4} position The position in model coordinates to transform.
 *
 * @returns {vec4} The transformed position in window coordinates.
 *
 * @see agi_eyeToWindowCoordinates
 * @see agi_modelViewProjection
 * @see agi_viewportTransformation
 * @see agi_viewportOrthographic
 * @see BillboardCollection
 *
 * @example
 * vec4 positionWC = agi_modelToWindowCoordinates(positionMC);
 */
vec4 agi_modelToWindowCoordinates(vec4 position)
{
    vec4 q = agi_modelViewProjection * position;                // clip coordinates
    q.xyz /= q.w;                                                // normalized device coordinates
    q.xyz = (agi_viewportTransformation * vec4(q.xyz, 1.0)).xyz; // window coordinates
    return q;
}

/**
 * Transforms a position from eye to window coordinates.  The transformation
 * from eye to clip coordinates is done using {@link agi_projection}.
 * The transform from normalized device coordinates to window coordinates is
 * done using {@link agi_viewportTransformation}, which assumes a depth range
 * of <code>near = 0</code> and <code>far = 1</code>.
 * <br /><br />
 * This transform is useful when there is a need to manipulate window coordinates
 * in a vertex shader as done by {@link BillboardCollection}.
 *
 * @name agi_eyeToWindowCoordinates
 * @glslFunction
 *
 * @param {vec4} position The position in eye coordinates to transform.
 *
 * @returns {vec4} The transformed position in window coordinates.
 *
 * @see agi_modelToWindowCoordinates
 * @see agi_projection
 * @see agi_viewportTransformation
 * @see BillboardCollection
 *
 * @example
 * vec4 positionWC = agi_eyeToWindowCoordinates(positionEC);
 */
vec4 agi_eyeToWindowCoordinates(vec4 positionEC)
{
    vec4 q = agi_projection * positionEC;                       // clip coordinates
    q.xyz /= q.w;                                                // normalized device coordinates
    q.xyz = (agi_viewportTransformation * vec4(q.xyz, 1.0)).xyz; // window coordinates
    return q;
}

/**
 * Transforms a position from window to eye coordinates.
 * The transform from window to normalized device coordinates is done using components
 * of (@link agi_viewport} and {@link agi_viewportTransformation} instead of calculating
 * the inverse of <code>agi_viewportTransformation</code>. The transformation from 
 * normalized device coordinates to clip coordinates is done using <code>positionWC.w</code>,
 * which is expected to be the scalar used in the perspective divide. The transformation
 * from clip to eye coordinates is done using {@link agi_inverseProjection}.
 *
 * @name agi_windowToEyeCoordinates
 * @glslFunction
 *
 * @param {vec4} fragmentCoordinate The position in window coordinates to transform.
 *
 * @returns {vec4} The transformed position in eye coordinates.
 *
 * @see agi_modelToWindowCoordinates
 * @see agi_eyeToWindowCoordinates
 * @see agi_inverseProjection
 * @see agi_viewport
 * @see agi_viewportTransformation
 *
 * @example
 * vec4 positionEC = agi_windowToEyeCoordinates(gl_FragCoord);
 */
vec4 agi_windowToEyeCoordinates(vec4 fragmentCoordinate)
{
    float x = 2.0 * (fragmentCoordinate.x - float(agi_viewport.x)) / float(agi_viewport.z) - 1.0;
    float y = 2.0 * (fragmentCoordinate.y - float(agi_viewport.y)) / float(agi_viewport.w) - 1.0;
    float z = (fragmentCoordinate.z - agi_viewportTransformation[3][2]) / agi_viewportTransformation[2][2];
    vec4 q = vec4(x, y, z, 1.0);
    q /= fragmentCoordinate.w;
    q = agi_inverseProjection * q;
    return q;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_eyeOffset
 * @glslFunction
 *
 * @param {vec4} positionEC DOC_TBA.
 * @param {vec3} eyeOffset DOC_TBA.
 *
 * @returns {vec4} DOC_TBA.
 */
vec4 agi_eyeOffset(vec4 positionEC, vec3 eyeOffset)
{
    // This equation is approximate in x and y.
    vec4 p = positionEC;
    vec4 zEyeOffset = normalize(p) * eyeOffset.z;
    p.xy += eyeOffset.xy + zEyeOffset.xy;
    p.z += zEyeOffset.z;
    return p;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_geodeticSurfaceNormal
 * @glslFunction
 *
 * @param {vec3} positionOnEllipsoid DOC_TBA
 * @param {vec3} ellipsoidCenter DOC_TBA
 * @param {vec3} oneOverEllipsoidRadiiSquared DOC_TBA
 * 
 * @returns {vec3} DOC_TBA.
 */
vec3 agi_geodeticSurfaceNormal(vec3 positionOnEllipsoid, vec3 ellipsoidCenter, vec3 oneOverEllipsoidRadiiSquared)
{
    return normalize((positionOnEllipsoid - ellipsoidCenter) * oneOverEllipsoidRadiiSquared);
}

/**
 * DOC_TBA
 *
 * @name agi_ellipsoidWgs84TextureCoordinates
 * @glslFunction
 */
vec2 agi_ellipsoidWgs84TextureCoordinates(vec3 normal)
{
    return vec2(atan(normal.y, normal.x) * agi_oneOverTwoPi + 0.5, asin(normal.z) * agi_oneOverPi + 0.5);
}

/**
 * Computes a 3x3 rotation matrix that transforms vectors from an ellipsoid's east-north-up coordinate system 
 * to eye coordinates.  In east-north-up coordinates, x points east, y points north, and z points along the 
 * surface normal.  East-north-up can be used as an ellipsoid's tangent space for operations such as bump mapping.
 * <br /><br />
 * The ellipsoid is assumed to be centered at the model coordinate's origin.
 *
 * @name agi_eastNorthUpToEyeCoordinates
 * @glslFunction
 *
 * @param {vec3} positionMC The position on the ellipsoid in model coordinates.
 * @param {vec3} normalEC The normalized ellipsoid surface normal, at <code>positionMC</code>, in eye coordinates.
 *
 * @returns {mat3} A 3x3 rotation matrix that transforms vectors from the east-north-up coordinate system to eye coordinates.
 *
 * @example
 * // Transform a vector defined in the east-north-up coordinate 
 * // system, (0, 0, 1) which is the surface normal, to eye 
 * // coordinates.
 * mat3 m = agi_eastNorthUpToEyeCoordinates(positionMC, normalEC);
 * vec3 normalEC = m * vec3(0.0, 0.0, 1.0);
 */
mat3 agi_eastNorthUpToEyeCoordinates(vec3 positionMC, vec3 normalEC)
{
    vec3 tangentMC = normalize(vec3(-positionMC.y, positionMC.x, 0.0));  // normalized surface tangent in model coordinates
    vec3 tangentEC = normalize(agi_normal * tangentMC);                  // normalized surface tangent in eye coordiantes
    vec3 bitangentEC = normalize(cross(normalEC, tangentEC));            // normalized surface bitangent in eye coordinates

    return mat3(
        tangentEC.x,   tangentEC.y,   tangentEC.z,
        bitangentEC.x, bitangentEC.y, bitangentEC.z,
        normalEC.x,    normalEC.y,    normalEC.z);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_lightIntensity
 * @glslFunction
 */
float agi_lightIntensity(vec3 normal, vec3 toLight, vec3 toEye)
{
    // TODO: where does this come from?
    vec4 diffuseSpecularAmbientShininess = vec4(0.8, 0.1, 0.1, 10.0);
    
    vec3 toReflectedLight = reflect(-toLight, normal);

    float diffuse = max(dot(toLight, normal), 0.0);
    float specular = max(dot(toReflectedLight, toEye), 0.0);
    specular = pow(specular, diffuseSpecularAmbientShininess.w);

    return (diffuseSpecularAmbientShininess.x * diffuse) +
           (diffuseSpecularAmbientShininess.y * specular) +
            diffuseSpecularAmbientShininess.z;
}

/**
 * DOC_TBA
 *
 * @name agi_twoSidedLightIntensity
 * @glslFunction
 */
float agi_twoSidedLightIntensity(vec3 normal, vec3 toLight, vec3 toEye)
{
    // TODO: This is temporary.
    vec4 diffuseSpecularAmbientShininess = vec4(0.8, 0.1, 0.1, 10.0);
    
    vec3 toReflectedLight = reflect(-toLight, normal);

    float diffuse = abs(dot(toLight, normal));
    float specular = abs(dot(toReflectedLight, toEye));
    specular = pow(specular, diffuseSpecularAmbientShininess.w);

    return (diffuseSpecularAmbientShininess.x * diffuse) +
           (diffuseSpecularAmbientShininess.y * specular) +
            diffuseSpecularAmbientShininess.z;
}

/**
 * DOC_TBA
 *
 * @name agi_multiplyWithColorBalance
 * @glslFunction
 */
vec3 agi_multiplyWithColorBalance(vec3 left, vec3 right)
{
    // Algorithm from Chapter 10 of Graphics Shaders.
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    
    vec3 target = left * right;
    float leftLuminance = dot(left, W);
    float rightLumiance = dot(right, W);
    float targetLumiance = dot(target, W);
    
    return ((leftLuminance + rightLumiance) / (2.0 * targetLumiance)) * target;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_columbusViewMorph
 * @glslFunction
 */
vec4 agi_columbusViewMorph(vec3 position2D, vec3 position3D, float time)
{
    // Just linear for now.
    vec3 p = mix(position2D, position3D, time);
    return vec4(p, 1.0);
} 

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_ray
 * @glslStruct
 */
struct agi_ray
{
    vec3 origin;
    vec3 direction;
};

/**
 * Computes the point along a ray at the given time.  <code>time</code> can be positive, negative, or zero.
 *
 * @name agi_pointAlongRay
 * @glslFunction
 *
 * @param {agi_ray} ray The ray to compute the point along.
 * @param {float} time The time along the ray.
 * 
 * @returns {vec3} The point along the ray at the given time.
 * 
 * @example
 * agi_ray ray = agi_ray(vec3(0.0), vec3(1.0, 0.0, 0.0)); // origin, direction
 * vec3 v = agi_pointAlongRay(ray, 2.0); // (2.0, 0.0, 0.0)
 */
vec3 agi_pointAlongRay(agi_ray ray, float time)
{
    return ray.origin + (time * ray.direction);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_raySegment
 * @glslStruct
 */
struct agi_raySegment
{
    float start;
    float stop;
};

/**
 * DOC_TBA
 *
 * @name agi_emptyRaySegment
 * @glslConstant 
 */
const agi_raySegment agi_emptyRaySegment = agi_raySegment(-agi_infinity, -agi_infinity);

/**
 * DOC_TBA
 *
 * @name agi_fullRaySegment
 * @glslConstant 
 */
const agi_raySegment agi_fullRaySegment = agi_raySegment(0.0, agi_infinity);

/**
 * Determines if a time interval is empty.
 *
 * @name agi_isEmpty
 * @glslFunction 
 * 
 * @param {agi_raySegment} interval The interval to test.
 * 
 * @returns {bool} <code>true</code> if the time interval is empty; otherwise, <code>false</code>.
 *
 * @example
 * bool b0 = agi_isEmpty(agi_emptyRaySegment);      // true
 * bool b1 = agi_isEmpty(agi_raySegment(0.0, 1.0)); // false
 * bool b2 = agi_isEmpty(agi_raySegment(1.0, 1.0)); // false, contains 1.0.
 */
bool agi_isEmpty(agi_raySegment interval)
{
    return (interval.stop < 0.0);
}

/**
 * Determines if a time interval is empty.
 *
 * @name agi_isFull
 * @glslFunction 
 * 
 * @param {agi_raySegment} interval The interval to test.
 * 
 * @returns {bool} <code>true</code> if the time interval is empty; otherwise, <code>false</code>.
 *
 * @example
 * bool b0 = agi_isEmpty(agi_emptyRaySegment);      // true
 * bool b1 = agi_isEmpty(agi_raySegment(0.0, 1.0)); // false
 * bool b2 = agi_isEmpty(agi_raySegment(1.0, 1.0)); // false, contains 1.0.
 */
bool agi_isFull(agi_raySegment interval)
{
    return (interval.start == 0.0 && interval.stop == agi_infinity);
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
