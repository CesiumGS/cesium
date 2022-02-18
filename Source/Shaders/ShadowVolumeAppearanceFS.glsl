#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

#ifdef TEXTURE_COORDINATES
#ifdef SPHERICAL
varying vec4 v_sphericalExtents;
#else // SPHERICAL
varying vec2 v_inversePlaneExtents;
varying vec4 v_westPlane;
varying vec4 v_southPlane;
#endif // SPHERICAL
varying vec3 v_uvMinAndSphericalLongitudeRotation;
varying vec3 v_uMaxAndInverseDistance;
varying vec3 v_vMaxAndInverseDistance;
#endif // TEXTURE_COORDINATES

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif

#ifdef NORMAL_EC
vec3 getEyeCoordinate3FromWindowCoordinate(vec2 fragCoord, float logDepthOrDepth) {
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord, logDepthOrDepth);
    return eyeCoordinate.xyz / eyeCoordinate.w;
}

vec3 vectorFromOffset(vec4 eyeCoordinate, vec2 positiveOffset) {
    vec2 glFragCoordXY = gl_FragCoord.xy;
    // Sample depths at both offset and negative offset
    float upOrRightLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY + positiveOffset) / czm_viewport.zw));
    float downOrLeftLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY - positiveOffset) / czm_viewport.zw));
    // Explicitly evaluate both paths
    // Necessary for multifrustum and for edges of the screen
    bvec2 upOrRightInBounds = lessThan(glFragCoordXY + positiveOffset, czm_viewport.zw);
    float useUpOrRight = float(upOrRightLogDepth > 0.0 && upOrRightInBounds.x && upOrRightInBounds.y);
    float useDownOrLeft = float(useUpOrRight == 0.0);
    vec3 upOrRightEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY + positiveOffset, upOrRightLogDepth);
    vec3 downOrLeftEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY - positiveOffset, downOrLeftLogDepth);
    return (upOrRightEC - (eyeCoordinate.xyz / eyeCoordinate.w)) * useUpOrRight + ((eyeCoordinate.xyz / eyeCoordinate.w) - downOrLeftEC) * useDownOrLeft;
}
#endif // NORMAL_EC

void main(void)
{
#ifdef REQUIRES_EC
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw));
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
#endif

#ifdef REQUIRES_WC
    vec4 worldCoordinate4 = czm_inverseView * eyeCoordinate;
    vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;
#endif

#ifdef TEXTURE_COORDINATES
    vec2 uv;
#ifdef SPHERICAL
    // Treat world coords as a sphere normal for spherical coordinates
    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate);
    sphericalLatLong.y += v_uvMinAndSphericalLongitudeRotation.z;
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);
    uv.x = (sphericalLatLong.y - v_sphericalExtents.y) * v_sphericalExtents.w;
    uv.y = (sphericalLatLong.x - v_sphericalExtents.x) * v_sphericalExtents.z;
#else // SPHERICAL
    // Unpack planes and transform to eye space
    uv.x = czm_planeDistance(v_westPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.x;
    uv.y = czm_planeDistance(v_southPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.y;
#endif // SPHERICAL
#endif // TEXTURE_COORDINATES

#ifdef PICK
#ifdef CULL_FRAGMENTS
    // When classifying translucent geometry, logDepthOrDepth == 0.0
    // indicates a region that should not be classified, possibly due to there
    // being opaque pixels there in another buffer.
    // Check for logDepthOrDepth != 0.0 to make sure this should be classified.
    if (0.0 <= uv.x && uv.x <= 1.0 && 0.0 <= uv.y && uv.y <= 1.0 && logDepthOrDepth != 0.0) {
        gl_FragColor.a = 1.0; // 0.0 alpha leads to discard from ShaderSource.createPickFragmentShaderSource
        czm_writeDepthClamp();
    }
#else // CULL_FRAGMENTS
        gl_FragColor.a = 1.0;
#endif // CULL_FRAGMENTS
#else // PICK

#ifdef CULL_FRAGMENTS
    // When classifying translucent geometry, logDepthOrDepth == 0.0
    // indicates a region that should not be classified, possibly due to there
    // being opaque pixels there in another buffer.
    if (uv.x <= 0.0 || 1.0 <= uv.x || uv.y <= 0.0 || 1.0 <= uv.y || logDepthOrDepth == 0.0) {
        discard;
    }
#endif

#ifdef NORMAL_EC
    // Compute normal by sampling adjacent pixels in 2x2 block in screen space
    vec3 downUp = vectorFromOffset(eyeCoordinate, vec2(0.0, 1.0));
    vec3 leftRight = vectorFromOffset(eyeCoordinate, vec2(1.0, 0.0));
    vec3 normalEC = normalize(cross(leftRight, downUp));
#endif


#ifdef PER_INSTANCE_COLOR

    vec4 color = czm_gammaCorrect(v_color);
#ifdef FLAT
    gl_FragColor = color;
#else // FLAT
    czm_materialInput materialInput;
    materialInput.normalEC = normalEC;
    materialInput.positionToEyeEC = -eyeCoordinate.xyz;
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = color.rgb;
    material.alpha = color.a;

    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material, czm_lightDirectionEC);
#endif // FLAT

    // Premultiply alpha. Required for classification primitives on translucent globe.
    gl_FragColor.rgb *= gl_FragColor.a;

#else // PER_INSTANCE_COLOR

    // Material support.
    // USES_ is distinct from REQUIRES_, because some things are dependencies of each other or
    // dependencies for culling but might not actually be used by the material.

    czm_materialInput materialInput;

#ifdef USES_NORMAL_EC
    materialInput.normalEC = normalEC;
#endif

#ifdef USES_POSITION_TO_EYE_EC
    materialInput.positionToEyeEC = -eyeCoordinate.xyz;
#endif

#ifdef USES_TANGENT_TO_EYE
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(worldCoordinate, normalEC);
#endif

#ifdef USES_ST
    // Remap texture coordinates from computed (approximately aligned with cartographic space) to the desired
    // texture coordinate system, which typically forms a tight oriented bounding box around the geometry.
    // Shader is provided a set of reference points for remapping.
    materialInput.st.x = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_uMaxAndInverseDistance.xy, uv) * v_uMaxAndInverseDistance.z;
    materialInput.st.y = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_vMaxAndInverseDistance.xy, uv) * v_vMaxAndInverseDistance.z;
#endif

    czm_material material = czm_getMaterial(materialInput);

#ifdef FLAT
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#else // FLAT
    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material, czm_lightDirectionEC);
#endif // FLAT

    // Premultiply alpha. Required for classification primitives on translucent globe.
    gl_FragColor.rgb *= gl_FragColor.a;

#endif // PER_INSTANCE_COLOR
    czm_writeDepthClamp();
#endif // PICK
}
