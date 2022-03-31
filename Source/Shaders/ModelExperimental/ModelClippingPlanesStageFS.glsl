#ifdef USE_CLIPPING_PLANES_FLOAT_TEXTURE
vec4 getClippingPlane(
    highp sampler2D packedClippingPlanes,
    int clippingPlaneNumber,
    mat4 transform
) {
    int pixY = clippingPlaneNumber / CLIPPING_PLANES_TEXTURE_WIDTH;
    int pixX = clippingPlaneNumber - (pixY * CLIPPING_PLANES_TEXTURE_WIDTH);
    float pixelWidth = 1.0 / float(CLIPPING_PLANES_TEXTURE_WIDTH);
    float pixelHeight = 1.0 / float(CLIPPING_PLANES_TEXTURE_HEIGHT);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    vec4 plane = texture2D(packedClippingPlanes, vec2(u, v));
    return czm_transformPlane(plane, transform);
}
#else
// Handle uint8 clipping texture instead
vec4 getClippingPlane(
    highp sampler2D packedClippingPlanes,
    int clippingPlaneNumber,
    mat4 transform
) {
    int clippingPlaneStartIndex = clippingPlaneNumber * 2; // clipping planes are two pixels each
    int pixY = clippingPlaneStartIndex / CLIPPING_PLANES_TEXTURE_WIDTH;
    int pixX = clippingPlaneStartIndex - (pixY * CLIPPING_PLANES_TEXTURE_WIDTH);
    float pixelWidth = 1.0 / float(CLIPPING_PLANES_TEXTURE_WIDTH);
    float pixelHeight = 1.0 / float(CLIPPING_PLANES_TEXTURE_HEIGHT);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    vec4 oct32 = texture2D(packedClippingPlanes, vec2(u, v)) * 255.0;
    vec2 oct = vec2(oct32.x * 256.0 + oct32.y, oct32.z * 256.0 + oct32.w);
    vec4 plane;
    plane.xyz = czm_octDecode(oct, 65535.0);
    plane.w = czm_unpackFloat(texture2D(packedClippingPlanes, vec2(u + pixelWidth, v)));
    return czm_transformPlane(plane, transform);
}
#endif

float clip(vec4 fragCoord, sampler2D clippingPlanes, mat4 clippingPlanesMatrix) {
    vec4 position = czm_windowToEyeCoordinates(fragCoord);
    vec3 clipNormal = vec3(0.0);
    vec3 clipPosition = vec3(0.0);
    float pixelWidth = czm_metersPerPixel(position);
    
    #ifdef UNION_CLIPPING_REGIONS
    float clipAmount; // For union planes, we want to get the min distance. So we set the initial value to the first plane distance in the loop below.
    bool breakAndDiscard = false;
    #else
    float clipAmount = 0.0;
    bool clipped = true;
    #endif

    for (int i = 0; i < CLIPPING_PLANES_LENGTH; ++i) {
        vec4 clippingPlane = getClippingPlane(clippingPlanes, i, clippingPlanesMatrix);
        clipNormal = clippingPlane.xyz;
        clipPosition = -clippingPlane.w * clipNormal;
        float amount = dot(clipNormal, (position.xyz - clipPosition)) / pixelWidth;
        
        #ifdef UNION_CLIPPING_REGIONS
        clipAmount = czm_branchFreeTernary(i == 0, amount, min(amount, clipAmount));
        if (amount <= 0.0) {
            discard;
        }
        #else
        clipAmount = max(amount, clipAmount);
        clipped = clipped && (amount <= 0.0);
        #endif
    }

    #ifndef UNION_CLIPPING_REGIONS
    if (clipped) {
        discard;
    }
    #endif
    
    return clipAmount;
}

void modelClippingPlanesStage(inout vec4 color)
{
    float clipDistance = clip(gl_FragCoord, model_clippingPlanes, model_clippingPlanesMatrix);
    vec4 clippingPlanesEdgeColor = vec4(1.0);
    clippingPlanesEdgeColor.rgb = model_clippingPlanesEdgeStyle.rgb;
    float clippingPlanesEdgeWidth = model_clippingPlanesEdgeStyle.a;
    
    if (clipDistance > 0.0 && clipDistance < clippingPlanesEdgeWidth) {
        color = clippingPlanesEdgeColor;
    }
}
