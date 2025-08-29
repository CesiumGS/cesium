vec3 projectToGeographic(vec3 cartographic)
{
	float lon = cartographic.y;
	float lat = cartographic.x;
	float altitude = cartographic.z;

	float plate_x = u_ellipsoidRadii.x * lat;
	float plate_y = u_ellipsoidRadii.x * lon;

	return vec3(altitude, plate_x, plate_y);
}

vec3 cartesianToCartographic(vec3 cartesian) {
    // Correct the incoming (y, z, x) coordinate order to standard ECEF (x, y, z).
    vec3 ecef = vec3(cartesian.z, cartesian.x, cartesian.y);

    // Check if the ellipsoid is a sphere, which allows for a much faster, direct calculation.
    bool isSphere = (u_ellipsoidRadii.x == u_ellipsoidRadii.y) && (u_ellipsoidRadii.x == u_ellipsoidRadii.z);

    if (isSphere) {
        float mag = length(ecef);
        // Avoid division by zero at the center
        if (mag < czm_epsilon6) {
            return vec3(0.0, 0.0, -u_ellipsoidRadii.x);
        }
        float longitude = atan(ecef.y, ecef.x);
        float latitude = asin(ecef.z / mag);
        float height = mag - u_ellipsoidRadii.x;
        return vec3(longitude, latitude, height);
    }

    // --- Ellipsoidal Calculation (Iterative Method) ---

    // The vector from the center to the point on the XY plane
    vec2 p = ecef.xy;
    float pLength = length(p);

    // If the point is near the Z-axis, the calculation is straightforward
    if (pLength < czm_epsilon6) {
        // Longitude is undefined at the poles, but 0.0 is a standard convention.
        float longitude = 0.0; 
        float latitude = (ecef.z >= 0.0) ? czm_pi / 2.0 : -czm_pi / 2.0;
        float height = abs(ecef.z) - u_ellipsoidRadii.z;
        return vec3(longitude, latitude, height);
    }

    // Key ellipsoid parameters
    float a = u_ellipsoidRadii.x;
    float c = u_ellipsoidRadii.z;
    float a2 = u_ellipsoidRadiiSquared.x;
    float c2 = u_ellipsoidRadiiSquared.z;
    float e2 = (a2 - c2) / a2; // First eccentricity squared

    // Initial guess for latitude is the geocentric latitude
    float latitude = atan(ecef.z, pLength);
    float N; // Radius of curvature in the prime vertical

    // Iteratively refine the latitude. 3-4 iterations are sufficient for high precision.
    for (int i = 0; i < 4; ++i) {
        float sinLat = sin(latitude);
        N = a / sqrt(1.0 - e2 * sinLat * sinLat);
        latitude = atan((ecef.z + N * e2 * sinLat) / pLength);
    }

    // With the final latitude, calculate longitude and height
    float longitude = atan(ecef.y, ecef.x);
    float sinLat = sin(latitude);
    float cosLat = cos(latitude);
    N = a / sqrt(1.0 - e2 * sinLat * sinLat);
    float height = (pLength / cosLat) - N;

    return vec3(longitude, latitude, height);
}

vec4 geometryStage(inout ProcessedAttributes attributes, mat4 modelView, mat3 normal)
{
    vec4 computedPosition;

    // Compute positions in different coordinate systems
    vec3 positionMC = attributes.positionMC;
    v_positionMC = positionMC;

    #if defined(USE_2D_POSITIONS) || defined(USE_2D_INSTANCING)
    vec3 position2D = attributes.position2D;
    vec3 positionEC = (u_modelView2D * vec4(position2D, 1.0)).xyz;
    computedPosition = czm_projection * vec4(positionEC, 1.0);
    #else
	if(czm_morphTime != 1.){
		vec3 cartographic = cartesianToCartographic(positionMC);
		vec3 position = projectToGeographic(cartographic);

		vec3 positionEC = (czm_view * vec4(position, 1.0)).xyz;
		computedPosition = czm_projection * vec4(positionEC, 1.0);	
	}else{
		v_positionEC = (modelView * vec4(positionMC, 1.0)).xyz;
		computedPosition = czm_projection * vec4(v_positionEC, 1.0);
	}
    #endif

    // Sometimes the custom shader and/or style needs this
    #if defined(COMPUTE_POSITION_WC_CUSTOM_SHADER) || defined(COMPUTE_POSITION_WC_STYLE) || defined(COMPUTE_POSITION_WC_ATMOSPHERE) || defined(ENABLE_CLIPPING_POLYGONS)
    // Note that this is a 32-bit position which may result in jitter on small
    // scales.
    v_positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;
    #endif

    #ifdef HAS_NORMALS
    v_normalEC = normalize(normal * attributes.normalMC);
    #endif

    #ifdef HAS_TANGENTS
    v_tangentEC = normalize(normal * attributes.tangentMC);
    #endif

    #ifdef HAS_BITANGENTS
    v_bitangentEC = normalize(normal * attributes.bitangentMC);
    #endif

    // All other varyings need to be dynamically generated in
    // GeometryPipelineStage
    setDynamicVaryings(attributes);

    return computedPosition;
}
