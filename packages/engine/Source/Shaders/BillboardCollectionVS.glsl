uniform float u_threePointDepthTestDistance;
#ifdef INSTANCED
in vec2 direction;
#endif
in vec4 positionHighAndScale;
in vec4 positionLowAndRotation;
in vec4 compressedAttribute0;                       // pixel offset, translate, horizontal origin, vertical origin, show, direction, texture coordinates (texture offset)
in vec4 compressedAttribute1;                       // aligned axis, translucency by distance, image width
in vec4 compressedAttribute2;                       // label horizontal origin, image height, color, pick color, size in meters, valid aligned axis, 13 bits free
in vec4 eyeOffset;                                  // eye offset in meters, 4 bytes free (texture range)
in vec4 scaleByDistance;                            // near, nearScale, far, farScale
in vec4 pixelOffsetScaleByDistance;                 // near, nearScale, far, farScale
in vec4 compressedAttribute3;                       // distance display condition near, far, disableDepthTestDistanceSq, dimensions
in vec2 sdf;                                        // sdf outline color (rgb) and width (w)
in float splitDirection;                            // splitDirection
#if defined(VS_THREE_POINT_DEPTH_CHECK) || defined(FS_THREE_POINT_DEPTH_CHECK)
in vec4 textureCoordinateBoundsOrLabelTranslate;    // the min and max x and y values for the texture coordinates
#endif
#ifdef VECTOR_TILE
in float a_batchId;
#endif

out vec2 v_textureCoordinates;
#ifdef FS_THREE_POINT_DEPTH_CHECK
out vec4 v_textureCoordinateBounds;
out vec4 v_originTextureCoordinateAndTranslate;
out mat2 v_rotationMatrix;
#endif
out vec4 v_compressed;                                 // x: eyeDepth, y: applyTranslate & enableDepthCheck, z: dimensions, w: imageSize

out vec4 v_pickColor;
out vec4 v_color;
out float v_splitDirection;
#ifdef SDF
out vec4 v_outlineColor;
out float v_outlineWidth;
#endif

const float UPPER_BOUND = 32768.0;

const float SHIFT_LEFT16 = 65536.0;
const float SHIFT_LEFT12 = 4096.0;
const float SHIFT_LEFT8 = 256.0;
const float SHIFT_LEFT7 = 128.0;
const float SHIFT_LEFT5 = 32.0;
const float SHIFT_LEFT3 = 8.0;
const float SHIFT_LEFT2 = 4.0;
const float SHIFT_LEFT1 = 2.0;

const float SHIFT_RIGHT12 = 1.0 / 4096.0;
const float SHIFT_RIGHT8 = 1.0 / 256.0;
const float SHIFT_RIGHT7 = 1.0 / 128.0;
const float SHIFT_RIGHT5 = 1.0 / 32.0;
const float SHIFT_RIGHT3 = 1.0 / 8.0;
const float SHIFT_RIGHT2 = 1.0 / 4.0;
const float SHIFT_RIGHT1 = 1.0 / 2.0;

vec4 addScreenSpaceOffset(vec4 positionEC, vec2 imageSize, float scale, vec2 direction, vec2 origin, vec2 translate, vec2 pixelOffset, vec3 alignedAxis, bool validAlignedAxis, float rotation, bool sizeInMeters, out mat2 rotationMatrix, out float mpp)
{
    // Note the halfSize cannot be computed in JavaScript because it is sent via
    // compressed vertex attributes that coerce it to an integer.
    vec2 halfSize = imageSize * scale * 0.5;
    halfSize *= ((direction * 2.0) - 1.0);

    vec2 originTranslate = origin * abs(halfSize);

#if defined(ROTATION) || defined(ALIGNED_AXIS)
    if (validAlignedAxis || rotation != 0.0)
    {
        float angle = rotation;
        if (validAlignedAxis)
        {
            vec4 projectedAlignedAxis = czm_modelView3D * vec4(alignedAxis, 0.0);
            angle += sign(-projectedAlignedAxis.x) * acos(sign(projectedAlignedAxis.y) * (projectedAlignedAxis.y * projectedAlignedAxis.y) /
                    (projectedAlignedAxis.x * projectedAlignedAxis.x + projectedAlignedAxis.y * projectedAlignedAxis.y));
        }

        float cosTheta = cos(angle);
        float sinTheta = sin(angle);
        rotationMatrix = mat2(cosTheta, sinTheta, -sinTheta, cosTheta);
        halfSize = rotationMatrix * halfSize;
    }
    else
    {
        rotationMatrix = mat2(1.0, 0.0, 0.0, 1.0);
    }
#endif

    mpp = czm_metersPerPixel(positionEC);
    positionEC.xy += (originTranslate + halfSize) * czm_branchFreeTernary(sizeInMeters, 1.0, mpp);
    positionEC.xy += (translate + pixelOffset) * mpp;

    return positionEC;
}

#ifdef VS_THREE_POINT_DEPTH_CHECK
float getGlobeDepth(vec4 positionEC)
{
    vec4 posWC = czm_eyeToWindowCoordinates(positionEC);

    float globeDepth = czm_unpackDepth(texture(czm_globeDepthTexture, posWC.xy / czm_viewport.zw));

    if (globeDepth == 0.0)
    {
        return 0.0; // not on the globe
    }

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(posWC.xy, globeDepth);
    return eyeCoordinate.z / eyeCoordinate.w;
}
#endif
void main()
{
    // Modifying this shader may also require modifications to Billboard._computeScreenSpacePosition

    // unpack attributes
    vec3 positionHigh = positionHighAndScale.xyz;
    vec3 positionLow = positionLowAndRotation.xyz;
    float scale = positionHighAndScale.w;

#if defined(ROTATION) || defined(ALIGNED_AXIS)
    float rotation = positionLowAndRotation.w;
#else
    float rotation = 0.0;
#endif

    float compressed = compressedAttribute0.x;

    vec2 pixelOffset;
    pixelOffset.x = floor(compressed * SHIFT_RIGHT7);
    compressed -= pixelOffset.x * SHIFT_LEFT7;
    pixelOffset.x -= UPPER_BOUND;

    vec2 origin;
    origin.x = floor(compressed * SHIFT_RIGHT5);
    compressed -= origin.x * SHIFT_LEFT5;

    origin.y = floor(compressed * SHIFT_RIGHT3);
    compressed -= origin.y * SHIFT_LEFT3;

#ifdef FS_THREE_POINT_DEPTH_CHECK
    vec2 depthOrigin = origin.xy;
#endif
    origin -= vec2(1.0);

    float show = floor(compressed * SHIFT_RIGHT2);
    compressed -= show * SHIFT_LEFT2;

#ifdef INSTANCED
    vec2 textureCoordinatesBottomLeft = czm_decompressTextureCoordinates(compressedAttribute0.w);
    vec2 textureCoordinatesRange = czm_decompressTextureCoordinates(eyeOffset.w);
    vec2 textureCoordinates = textureCoordinatesBottomLeft + direction * textureCoordinatesRange;
#else
    vec2 direction;
    direction.x = floor(compressed * SHIFT_RIGHT1);
    direction.y = compressed - direction.x * SHIFT_LEFT1;

    vec2 textureCoordinates = czm_decompressTextureCoordinates(compressedAttribute0.w);
#endif

    float temp = compressedAttribute0.y  * SHIFT_RIGHT8;
    pixelOffset.y = -(floor(temp) - UPPER_BOUND);

    vec2 translate;
    translate.y = (temp - floor(temp)) * SHIFT_LEFT16;

    temp = compressedAttribute0.z * SHIFT_RIGHT8;
    translate.x = floor(temp) - UPPER_BOUND;
    translate.x *= SHIFT_RIGHT2; // undo translateX scaling (helps preserve subpixel precision, see BillboardCollection.js attribute writer for more info)

    translate.y += (temp - floor(temp)) * SHIFT_LEFT8;
    translate.y -= UPPER_BOUND;
    translate.y *= SHIFT_RIGHT2;

    temp = compressedAttribute1.x * SHIFT_RIGHT8;
    float temp2 = floor(compressedAttribute2.w * SHIFT_RIGHT2);

    vec2 imageSize = vec2(floor(temp), temp2);

#ifdef FS_THREE_POINT_DEPTH_CHECK
    float labelHorizontalOrigin = floor(compressedAttribute2.w - (temp2 * SHIFT_LEFT2));
    float applyTranslate = 0.0;
    if (labelHorizontalOrigin != 0.0) // is a label, so set apply translate to true
    {
        applyTranslate = 1.0;
        labelHorizontalOrigin -= 2.0;
        depthOrigin.x = labelHorizontalOrigin + 1.0;
    }

    depthOrigin = vec2(1.0) - (depthOrigin * 0.5);
#endif

#ifdef EYE_DISTANCE_TRANSLUCENCY
    vec4 translucencyByDistance;
    translucencyByDistance.x = compressedAttribute1.z;
    translucencyByDistance.z = compressedAttribute1.w;

    translucencyByDistance.y = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;

    temp = compressedAttribute1.y * SHIFT_RIGHT8;
    translucencyByDistance.w = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;
#endif

#if defined(VS_THREE_POINT_DEPTH_CHECK) || defined(FS_THREE_POINT_DEPTH_CHECK)
    temp = compressedAttribute3.w;
    temp = temp * SHIFT_RIGHT12;

    vec2 dimensions;
    dimensions.y = (temp - floor(temp)) * SHIFT_LEFT12;
    dimensions.x = floor(temp);
#endif

#ifdef ALIGNED_AXIS
    vec3 alignedAxis = czm_octDecode(floor(compressedAttribute1.y * SHIFT_RIGHT8));
    temp = compressedAttribute2.z * SHIFT_RIGHT5;
    bool validAlignedAxis = (temp - floor(temp)) * SHIFT_LEFT1 > 0.0;
#else
    vec3 alignedAxis = vec3(0.0);
    bool validAlignedAxis = false;
#endif

    vec4 pickColor;
    vec4 color;

    temp = compressedAttribute2.y;
    temp = temp * SHIFT_RIGHT8;
    pickColor.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    pickColor.g = (temp - floor(temp)) * SHIFT_LEFT8;
    pickColor.r = floor(temp);

    temp = compressedAttribute2.x;
    temp = temp * SHIFT_RIGHT8;
    color.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    color.g = (temp - floor(temp)) * SHIFT_LEFT8;
    color.r = floor(temp);

    temp = compressedAttribute2.z * SHIFT_RIGHT8;
    bool sizeInMeters = floor((temp - floor(temp)) * SHIFT_LEFT7) > 0.0;
    temp = floor(temp) * SHIFT_RIGHT8;

    pickColor.a = (temp - floor(temp)) * SHIFT_LEFT8;
    pickColor /= 255.0;

    color.a = floor(temp);
    color /= 255.0;

    ///////////////////////////////////////////////////////////////////////////

    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;

    positionEC = czm_eyeOffset(positionEC, eyeOffset.xyz);
    positionEC.xyz *= show;

    ///////////////////////////////////////////////////////////////////////////

#if defined(EYE_DISTANCE_SCALING) || defined(EYE_DISTANCE_TRANSLUCENCY) || defined(EYE_DISTANCE_PIXEL_OFFSET) || defined(DISTANCE_DISPLAY_CONDITION) || defined(DISABLE_DEPTH_DISTANCE)
    float lengthSq;
    if (czm_sceneMode == czm_sceneMode2D)
    {
        // 2D camera distance is a special case
        // treat all billboards as flattened to the z=0.0 plane
        lengthSq = czm_eyeHeight2D.y;
    }
    else
    {
        lengthSq = dot(positionEC.xyz, positionEC.xyz);
    }
#endif

#ifdef EYE_DISTANCE_SCALING
    float distanceScale = czm_nearFarScalar(scaleByDistance, lengthSq);
    scale *= distanceScale;
    translate *= distanceScale;
    // push vertex behind near plane for clipping
    if (scale == 0.0)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

    float translucency = 1.0;
#ifdef EYE_DISTANCE_TRANSLUCENCY
    translucency = czm_nearFarScalar(translucencyByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (translucency == 0.0)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

#ifdef EYE_DISTANCE_PIXEL_OFFSET
    float pixelOffsetScale = czm_nearFarScalar(pixelOffsetScaleByDistance, lengthSq);
    pixelOffset *= pixelOffsetScale;
#endif

#ifdef DISTANCE_DISPLAY_CONDITION
    float nearSq = compressedAttribute3.x;
    float farSq = compressedAttribute3.y;
    if (lengthSq < nearSq || lengthSq > farSq)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

    mat2 rotationMatrix;
    float mpp;

    float enableDepthCheck = 1.0;
#ifdef DISABLE_DEPTH_DISTANCE
    float disableDepthTestDistanceSq = compressedAttribute3.z;
    if (disableDepthTestDistanceSq == 0.0 && czm_minimumDisableDepthTestDistance != 0.0)
    {
        disableDepthTestDistanceSq = czm_minimumDisableDepthTestDistance;
    }

    if (lengthSq < disableDepthTestDistanceSq || disableDepthTestDistanceSq < 0.0)
    {
        enableDepthCheck = 0.0;
    }
#endif

    v_compressed.y = enableDepthCheck;

#ifdef VS_THREE_POINT_DEPTH_CHECK
if (lengthSq < (u_threePointDepthTestDistance * u_threePointDepthTestDistance) && (enableDepthCheck == 1.0)) {
    float depthsilon = 10.0;
    vec2 depthOrigin;
    // Horizontal origin for labels comes from a special attribute. If that value is 0, this is a billboard - use the regular origin. 
    // Otherwise, transform the label origin to -1, 0, 1 (right, center, left).
    depthOrigin.x = floor(compressedAttribute2.w - (temp2 * SHIFT_LEFT2));
    depthOrigin.x = czm_branchFreeTernary(depthOrigin.x == 0.0, origin.x, depthOrigin.x - 2.0);
    depthOrigin.y = origin.y;

    vec4 pEC1 = addScreenSpaceOffset(positionEC, dimensions, scale, vec2(0.0), depthOrigin, vec2(0.0), pixelOffset, alignedAxis, validAlignedAxis, rotation, sizeInMeters, rotationMatrix, mpp);
    float globeDepth1 = getGlobeDepth(pEC1);

    if (globeDepth1 != 0.0 && pEC1.z + depthsilon < globeDepth1)
    {
        vec4 pEC2 = addScreenSpaceOffset(positionEC, dimensions, scale, vec2(0.0, 1.0), depthOrigin, vec2(0.0), pixelOffset, alignedAxis, validAlignedAxis, rotation, sizeInMeters, rotationMatrix, mpp);
        float globeDepth2 = getGlobeDepth(pEC2);

        if (globeDepth2 != 0.0 && pEC2.z + depthsilon < globeDepth2)
        {
            vec4 pEC3 = addScreenSpaceOffset(positionEC, dimensions, scale, vec2(1.0), depthOrigin, vec2(0.0), pixelOffset, alignedAxis, validAlignedAxis, rotation, sizeInMeters, rotationMatrix, mpp);
            float globeDepth3 = getGlobeDepth(pEC3);
            if (globeDepth3 != 0.0 && pEC3.z + depthsilon < globeDepth3)
            {
                // "Discard" this vertex, as three key points fail depth test.
                positionEC.xyz = vec3(0.0);
            }
        }
    }
}
#endif
    // Write out the eyespace depth before applying the screen space offset, but after potentially "discarding" the vertex
    // by setting its eyespace position to zero, via the three-point depth test above.
    v_compressed.x = positionEC.z;

    positionEC = addScreenSpaceOffset(positionEC, imageSize, scale, direction, origin, translate, pixelOffset, alignedAxis, validAlignedAxis, rotation, sizeInMeters, rotationMatrix, mpp);
    gl_Position = czm_projection * positionEC;
    v_textureCoordinates = textureCoordinates;

#ifdef LOG_DEPTH
    czm_vertexLogDepth();
#endif

#ifdef DISABLE_DEPTH_DISTANCE

    if (disableDepthTestDistanceSq != 0.0)
    {
        // Don't try to "multiply both sides" by w.  Greater/less-than comparisons won't work for negative values of w.
        float zclip = gl_Position.z / gl_Position.w;
        bool clipped = (zclip < -1.0 || zclip > 1.0);
        // disableDepthTestDistanceSq can be less than zero if it's explicitly set to -1 in JS (as a sentinel value equivalent to infinity)
        if (!clipped && (disableDepthTestDistanceSq < 0.0 || (lengthSq > 0.0 && lengthSq < disableDepthTestDistanceSq)))
        {
            // Position z on the near plane.
            gl_Position.z = -gl_Position.w;
#ifdef LOG_DEPTH
            v_depthFromNearPlusOne = 1.0;
#endif
        }
    }
#endif

#ifdef FS_THREE_POINT_DEPTH_CHECK
    if (sizeInMeters) {
        translate /= mpp;
        dimensions /= mpp;
        imageSize /= mpp;
    }

#if defined(ROTATION) || defined(ALIGNED_AXIS)
    v_rotationMatrix = rotationMatrix;
#else
    v_rotationMatrix = mat2(1.0, 0.0, 0.0, 1.0);
#endif
    float dw = floor(clamp(dimensions.x, 0.0, SHIFT_LEFT12));
    float dh = floor(clamp(dimensions.y, 0.0, SHIFT_LEFT12));

    float iw = floor(clamp(imageSize.x, 0.0, SHIFT_LEFT12));
    float ih = floor(clamp(imageSize.y, 0.0, SHIFT_LEFT12));

    v_compressed.y += applyTranslate * SHIFT_LEFT1;
    v_compressed.z = dw * SHIFT_LEFT12 + dh;
    v_compressed.w = iw * SHIFT_LEFT12 + ih;
    v_originTextureCoordinateAndTranslate.xy = depthOrigin;
    v_originTextureCoordinateAndTranslate.zw = translate;
    v_textureCoordinateBounds = textureCoordinateBoundsOrLabelTranslate;

#endif

#ifdef SDF
    vec4 outlineColor;
    float outlineWidth;

    temp = sdf.x;
    temp = temp * SHIFT_RIGHT8;
    outlineColor.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    outlineColor.g = (temp - floor(temp)) * SHIFT_LEFT8;
    outlineColor.r = floor(temp);

    temp = sdf.y;
    temp = temp * SHIFT_RIGHT8;
    float temp3 = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    outlineWidth = (temp - floor(temp)) * SHIFT_LEFT8;
    outlineColor.a = floor(temp);
    outlineColor /= 255.0;

    v_outlineWidth = outlineWidth / 255.0;
    v_outlineColor = outlineColor;
    v_outlineColor.a *= translucency;
#endif

    v_pickColor = pickColor;

    v_color = color;
    v_color.a *= translucency;
    v_splitDirection = splitDirection;
}
