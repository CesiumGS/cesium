//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef USE_CLIPPING_PLANES_FLOAT_TEXTURE\n\
vec4 getClippingPlane(\n\
    highp sampler2D packedClippingPlanes,\n\
    int clippingPlaneNumber,\n\
    mat4 transform\n\
) {\n\
    int pixY = clippingPlaneNumber / CLIPPING_PLANES_TEXTURE_WIDTH;\n\
    int pixX = clippingPlaneNumber - (pixY * CLIPPING_PLANES_TEXTURE_WIDTH);\n\
    float pixelWidth = 1.0 / float(CLIPPING_PLANES_TEXTURE_WIDTH);\n\
    float pixelHeight = 1.0 / float(CLIPPING_PLANES_TEXTURE_HEIGHT);\n\
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel\n\
    float v = (float(pixY) + 0.5) * pixelHeight;\n\
    vec4 plane = texture2D(packedClippingPlanes, vec2(u, v));\n\
    return czm_transformPlane(plane, transform);\n\
}\n\
#else\n\
// Handle uint8 clipping texture instead\n\
vec4 getClippingPlane(\n\
    highp sampler2D packedClippingPlanes,\n\
    int clippingPlaneNumber,\n\
    mat4 transform\n\
) {\n\
    int clippingPlaneStartIndex = clippingPlaneNumber * 2; // clipping planes are two pixels each\n\
    int pixY = clippingPlaneStartIndex / CLIPPING_PLANES_TEXTURE_WIDTH;\n\
    int pixX = clippingPlaneStartIndex - (pixY * CLIPPING_PLANES_TEXTURE_WIDTH);\n\
    float pixelWidth = 1.0 / float(CLIPPING_PLANES_TEXTURE_WIDTH);\n\
    float pixelHeight = 1.0 / float(CLIPPING_PLANES_TEXTURE_HEIGHT);\n\
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel\n\
    float v = (float(pixY) + 0.5) * pixelHeight;\n\
    vec4 oct32 = texture2D(packedClippingPlanes, vec2(u, v)) * 255.0;\n\
    vec2 oct = vec2(oct32.x * 256.0 + oct32.y, oct32.z * 256.0 + oct32.w);\n\
    vec4 plane;\n\
    plane.xyz = czm_octDecode(oct, 65535.0);\n\
    plane.w = czm_unpackFloat(texture2D(packedClippingPlanes, vec2(u + pixelWidth, v)));\n\
    return czm_transformPlane(plane, transform);\n\
}\n\
#endif\n\
\n\
float clip(vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix) {\n\
    vec4 position = czm_windowToEyeCoordinates(fragCoord);\n\
    vec3 clipNormal = vec3(0.0);\n\
    vec3 clipPosition = vec3(0.0);\n\
    float pixelWidth = czm_metersPerPixel(position);\n\
    \n\
    #ifdef UNION_CLIPPING_REGIONS\n\
    float clipAmount; // For union planes, we want to get the min distance. So we set the initial value to the first plane distance in the loop below.\n\
    #else\n\
    float clipAmount = 0.0;\n\
    bool clipped = true;\n\
    #endif\n\
\n\
    for (int i = 0; i < CLIPPING_PLANES_LENGTH; ++i) {\n\
        vec4 clippingPlane = getClippingPlane(clippingPlanes, i, clippingPlanesMatrix);\n\
        clipNormal = clippingPlane.xyz;\n\
        clipPosition = -clippingPlane.w * clipNormal;\n\
        float amount = dot(clipNormal, (position.xyz - clipPosition)) / pixelWidth;\n\
        \n\
        #ifdef UNION_CLIPPING_REGIONS\n\
        clipAmount = czm_branchFreeTernary(i == 0, amount, min(amount, clipAmount));\n\
        if (amount <= 0.0) {\n\
            discard;\n\
        }\n\
        #else\n\
        clipAmount = max(amount, clipAmount);\n\
        clipped = clipped && (amount <= 0.0);\n\
        #endif\n\
    }\n\
\n\
    #ifndef UNION_CLIPPING_REGIONS\n\
    if (clipped) {\n\
        discard;\n\
    }\n\
    #endif\n\
    \n\
    return clipAmount;\n\
}\n\
\n\
void modelClippingPlanesStage(inout vec4 color)\n\
{\n\
    float clipDistance = clip(gl_FragCoord, model_clippingPlanes, model_clippingPlanesMatrix);\n\
    vec4 clippingPlanesEdgeColor = vec4(1.0);\n\
    clippingPlanesEdgeColor.rgb = model_clippingPlanesEdgeStyle.rgb;\n\
    float clippingPlanesEdgeWidth = model_clippingPlanesEdgeStyle.a;\n\
    \n\
    if (clipDistance > 0.0 && clipDistance < clippingPlanesEdgeWidth) {\n\
        color = clippingPlanesEdgeColor;\n\
    }\n\
}\n\
";
