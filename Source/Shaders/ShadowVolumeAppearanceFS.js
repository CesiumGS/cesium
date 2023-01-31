//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef GL_EXT_frag_depth\n\
#extension GL_EXT_frag_depth : enable\n\
#endif\n\
\n\
#ifdef TEXTURE_COORDINATES\n\
#ifdef SPHERICAL\n\
varying vec4 v_sphericalExtents;\n\
#else // SPHERICAL\n\
varying vec2 v_inversePlaneExtents;\n\
varying vec4 v_westPlane;\n\
varying vec4 v_southPlane;\n\
#endif // SPHERICAL\n\
varying vec3 v_uvMinAndSphericalLongitudeRotation;\n\
varying vec3 v_uMaxAndInverseDistance;\n\
varying vec3 v_vMaxAndInverseDistance;\n\
#endif // TEXTURE_COORDINATES\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
varying vec4 v_color;\n\
#endif\n\
\n\
#ifdef NORMAL_EC\n\
vec3 getEyeCoordinate3FromWindowCoordinate(vec2 fragCoord, float logDepthOrDepth) {\n\
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord, logDepthOrDepth);\n\
    return eyeCoordinate.xyz / eyeCoordinate.w;\n\
}\n\
\n\
vec3 vectorFromOffset(vec4 eyeCoordinate, vec2 positiveOffset) {\n\
    vec2 glFragCoordXY = gl_FragCoord.xy;\n\
    // Sample depths at both offset and negative offset\n\
    float upOrRightLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY + positiveOffset) / czm_viewport.zw));\n\
    float downOrLeftLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY - positiveOffset) / czm_viewport.zw));\n\
    // Explicitly evaluate both paths\n\
    // Necessary for multifrustum and for edges of the screen\n\
    bvec2 upOrRightInBounds = lessThan(glFragCoordXY + positiveOffset, czm_viewport.zw);\n\
    float useUpOrRight = float(upOrRightLogDepth > 0.0 && upOrRightInBounds.x && upOrRightInBounds.y);\n\
    float useDownOrLeft = float(useUpOrRight == 0.0);\n\
    vec3 upOrRightEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY + positiveOffset, upOrRightLogDepth);\n\
    vec3 downOrLeftEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY - positiveOffset, downOrLeftLogDepth);\n\
    return (upOrRightEC - (eyeCoordinate.xyz / eyeCoordinate.w)) * useUpOrRight + ((eyeCoordinate.xyz / eyeCoordinate.w) - downOrLeftEC) * useDownOrLeft;\n\
}\n\
#endif // NORMAL_EC\n\
\n\
void main(void)\n\
{\n\
#ifdef REQUIRES_EC\n\
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw));\n\
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);\n\
#endif\n\
\n\
#ifdef REQUIRES_WC\n\
    vec4 worldCoordinate4 = czm_inverseView * eyeCoordinate;\n\
    vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;\n\
#endif\n\
\n\
#ifdef TEXTURE_COORDINATES\n\
    vec2 uv;\n\
#ifdef SPHERICAL\n\
    // Treat world coords as a sphere normal for spherical coordinates\n\
    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate);\n\
    sphericalLatLong.y += v_uvMinAndSphericalLongitudeRotation.z;\n\
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);\n\
    uv.x = (sphericalLatLong.y - v_sphericalExtents.y) * v_sphericalExtents.w;\n\
    uv.y = (sphericalLatLong.x - v_sphericalExtents.x) * v_sphericalExtents.z;\n\
#else // SPHERICAL\n\
    // Unpack planes and transform to eye space\n\
    uv.x = czm_planeDistance(v_westPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.x;\n\
    uv.y = czm_planeDistance(v_southPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.y;\n\
#endif // SPHERICAL\n\
#endif // TEXTURE_COORDINATES\n\
\n\
#ifdef PICK\n\
#ifdef CULL_FRAGMENTS\n\
    // When classifying translucent geometry, logDepthOrDepth == 0.0\n\
    // indicates a region that should not be classified, possibly due to there\n\
    // being opaque pixels there in another buffer.\n\
    // Check for logDepthOrDepth != 0.0 to make sure this should be classified.\n\
    if (0.0 <= uv.x && uv.x <= 1.0 && 0.0 <= uv.y && uv.y <= 1.0 || logDepthOrDepth != 0.0) {\n\
        gl_FragColor.a = 1.0; // 0.0 alpha leads to discard from ShaderSource.createPickFragmentShaderSource\n\
        czm_writeDepthClamp();\n\
    }\n\
#else // CULL_FRAGMENTS\n\
        gl_FragColor.a = 1.0;\n\
#endif // CULL_FRAGMENTS\n\
#else // PICK\n\
\n\
#ifdef CULL_FRAGMENTS\n\
    // When classifying translucent geometry, logDepthOrDepth == 0.0\n\
    // indicates a region that should not be classified, possibly due to there\n\
    // being opaque pixels there in another buffer.\n\
    if (uv.x <= 0.0 || 1.0 <= uv.x || uv.y <= 0.0 || 1.0 <= uv.y || logDepthOrDepth == 0.0) {\n\
        discard;\n\
    }\n\
#endif\n\
\n\
#ifdef NORMAL_EC\n\
    // Compute normal by sampling adjacent pixels in 2x2 block in screen space\n\
    vec3 downUp = vectorFromOffset(eyeCoordinate, vec2(0.0, 1.0));\n\
    vec3 leftRight = vectorFromOffset(eyeCoordinate, vec2(1.0, 0.0));\n\
    vec3 normalEC = normalize(cross(leftRight, downUp));\n\
#endif\n\
\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
\n\
    vec4 color = czm_gammaCorrect(v_color);\n\
#ifdef FLAT\n\
    gl_FragColor = color;\n\
#else // FLAT\n\
    czm_materialInput materialInput;\n\
    materialInput.normalEC = normalEC;\n\
    materialInput.positionToEyeEC = -eyeCoordinate.xyz;\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
    material.diffuse = color.rgb;\n\
    material.alpha = color.a;\n\
\n\
    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material, czm_lightDirectionEC);\n\
#endif // FLAT\n\
\n\
    // Premultiply alpha. Required for classification primitives on translucent globe.\n\
    gl_FragColor.rgb *= gl_FragColor.a;\n\
\n\
#else // PER_INSTANCE_COLOR\n\
\n\
    // Material support.\n\
    // USES_ is distinct from REQUIRES_, because some things are dependencies of each other or\n\
    // dependencies for culling but might not actually be used by the material.\n\
\n\
    czm_materialInput materialInput;\n\
\n\
#ifdef USES_NORMAL_EC\n\
    materialInput.normalEC = normalEC;\n\
#endif\n\
\n\
#ifdef USES_POSITION_TO_EYE_EC\n\
    materialInput.positionToEyeEC = -eyeCoordinate.xyz;\n\
#endif\n\
\n\
#ifdef USES_TANGENT_TO_EYE\n\
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(worldCoordinate, normalEC);\n\
#endif\n\
\n\
#ifdef USES_ST\n\
    // Remap texture coordinates from computed (approximately aligned with cartographic space) to the desired\n\
    // texture coordinate system, which typically forms a tight oriented bounding box around the geometry.\n\
    // Shader is provided a set of reference points for remapping.\n\
    materialInput.st.x = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_uMaxAndInverseDistance.xy, uv) * v_uMaxAndInverseDistance.z;\n\
    materialInput.st.y = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_vMaxAndInverseDistance.xy, uv) * v_vMaxAndInverseDistance.z;\n\
#endif\n\
\n\
    czm_material material = czm_getMaterial(materialInput);\n\
\n\
#ifdef FLAT\n\
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
#else // FLAT\n\
    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material, czm_lightDirectionEC);\n\
#endif // FLAT\n\
\n\
    // Premultiply alpha. Required for classification primitives on translucent globe.\n\
    gl_FragColor.rgb *= gl_FragColor.a;\n\
\n\
#endif // PER_INSTANCE_COLOR\n\
    czm_writeDepthClamp();\n\
#endif // PICK\n\
}\n\
";
