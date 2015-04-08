attribute vec4 positionHighAndScale;
attribute vec4 positionLowAndShow;
attribute vec4 compressedAttribute0;        // color, outlineColor, pick color
attribute vec4 compressedAttribute1;        // outlinePercent, translucency by distance, some free space
attribute vec4 scaleByDistance;             // near, nearScale, far, farScale

varying vec4 v_color;
varying vec4 v_outlineColor;
varying float v_innerPercent;
varying float v_pixelDistance;

#ifdef RENDER_FOR_PICK
varying vec4 v_pickColor;
#endif

float getNearFarScalar(vec4 nearFarScalar, float cameraDistSq)
{
    float valueAtMin = nearFarScalar.y;
    float valueAtMax = nearFarScalar.w;
    float nearDistanceSq = nearFarScalar.x * nearFarScalar.x;
    float farDistanceSq = nearFarScalar.z * nearFarScalar.z;

    float t = (cameraDistSq - nearDistanceSq) / (farDistanceSq - nearDistanceSq);

    t = pow(clamp(t, 0.0, 1.0), 0.2);

    return mix(valueAtMin, valueAtMax, t);
}

const float SHIFT_LEFT8 = 256.0;
const float SHIFT_RIGHT8 = 1.0 / 256.0;

void main()
{
    // Modifying this shader may also require modifications to PointPrimitive._computeScreenSpacePosition

    // unpack attributes
    vec3 positionHigh = positionHighAndScale.xyz;
    vec3 positionLow = positionLowAndShow.xyz;
    float scale = positionHighAndScale.w;
    float show = positionLowAndShow.w;

    float temp = compressedAttribute1.x * SHIFT_RIGHT8;
    float outlinePercent = floor(temp) / 255.0;

#ifdef EYE_DISTANCE_TRANSLUCENCY
    vec4 translucencyByDistance;
    translucencyByDistance.x = compressedAttribute1.z;
    translucencyByDistance.z = compressedAttribute1.w;

    translucencyByDistance.y = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;

    temp = compressedAttribute1.y * SHIFT_RIGHT8;
    translucencyByDistance.w = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;
#endif

    ///////////////////////////////////////////////////////////////////////////

    vec4 color;
    vec4 outlineColor;
#ifdef RENDER_FOR_PICK
    // compressedAttribute0.z => pickColor.rgb

    color = vec4(0.0);
    outlineColor = vec4(0.0);
    vec4 pickColor;
    temp = compressedAttribute0.z * SHIFT_RIGHT8;
    pickColor.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    pickColor.g = (temp - floor(temp)) * SHIFT_LEFT8;
    pickColor.r = floor(temp);
#else
    // compressedAttribute0.x => color.rgb

    temp = compressedAttribute0.x * SHIFT_RIGHT8;
    color.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    color.g = (temp - floor(temp)) * SHIFT_LEFT8;
    color.r = floor(temp);

    // compressedAttribute0.y => outlineColor.rgb

    temp = compressedAttribute0.y * SHIFT_RIGHT8;
    outlineColor.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    outlineColor.g = (temp - floor(temp)) * SHIFT_LEFT8;
    outlineColor.r = floor(temp);
#endif

    // compressedAttribute0.w => color.a, outlineColor.a, pickColor.a

    temp = compressedAttribute0.w * SHIFT_RIGHT8;
#ifdef RENDER_FOR_PICK
    pickColor.a = (temp - floor(temp)) * SHIFT_LEFT8;
    pickColor = pickColor / 255.0;
#endif
    temp = floor(temp) * SHIFT_RIGHT8;
    outlineColor.a = (temp - floor(temp)) * SHIFT_LEFT8;
    outlineColor /= 255.0;
    color.a = floor(temp);
    color /= 255.0;

    ///////////////////////////////////////////////////////////////////////////

    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    positionEC.xyz *= show;

    ///////////////////////////////////////////////////////////////////////////

#if defined(EYE_DISTANCE_SCALING) || defined(EYE_DISTANCE_TRANSLUCENCY)
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
    scale *= getNearFarScalar(scaleByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (scale < 0.1)
    {
        positionEC.xyz = vec3(0.0);
        scale = 1.0;
    }
#endif

    float translucency = 1.0;
#ifdef EYE_DISTANCE_TRANSLUCENCY
    translucency = getNearFarScalar(translucencyByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (translucency < 0.004)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);

    //maybe?? scale *= czm_resolutionScale;

    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
    v_textureCoordinates = textureCoordinates;

    v_color = color;
    v_color.a *= translucency;
    v_outlineColor = outlineColor;
    v_outlineColor.a *= translucency;

    v_innerPercent = 1.0 - outlinePercent;
    v_pixelDistance = 1.0 / scale;
    gl_PointSize = scale;

#ifdef RENDER_FOR_PICK
    v_pickColor = pickColor;
#endif
}
