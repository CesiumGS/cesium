void modelClippingPolygonsStage()
{
    // Scaling a surface position by 1/radii² is exactly what turns it into the
    // geodetic surface normal, so atan/asin of that normal give geodetic
    // longitude/latitude that match the CPU's cartesianToCartographic edge
    // packing (up to the precision of hardware-trig operations).
    vec3 normal = normalize(v_positionWC * czm_ellipsoidInverseRadii * czm_ellipsoidInverseRadii);
    float longitude = atan(normal.y, normal.x);
    float latitude = asin(normal.z);

    vec2 uv = (vec2(longitude, latitude) - u_clippingRectangle.xy) / (u_clippingRectangle.zw - u_clippingRectangle.xy);

    bool insideAny = vectorClip(uv);

#ifdef CLIPPING_INVERSE
    if (!insideAny)
    {
        discard;
    }
#else
    if (insideAny)
    {
        discard;
    }
#endif
}
