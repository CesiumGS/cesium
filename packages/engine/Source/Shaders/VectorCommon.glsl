uniform highp sampler2D u_vectorSegmentTexture;
uniform highp sampler2D u_vectorWidthTexture;
uniform highp sampler2D u_vectorColorTexture;
uniform highp sampler2D u_vectorSegmentPrimitiveIndicesTexture;
uniform highp sampler2D u_vectorGridCellIndicesTexture;

// UV-space offset from the closest point on the segment to p.
vec2 vectorOffsetToLine(vec2 p, vec4 line)
{
    vec2 a = line.xy;
    vec2 b = line.zw;
    vec2 ab = b - a;
    float abLengthSquared = dot(ab, ab);
    if (abLengthSquared < 1.0e-8)
    {
        return p - a;
    }
    float t = clamp(dot(p - a, ab) / abLengthSquared, 0.0, 1.0);
    return p - (a + t * ab);
}

ivec2 vectorIndexToUv(int index, ivec2 size)
{
    int v = index / size.x;
    int u = index - v * size.x;
    return ivec2(u, v);
}

// Drape clamped vector polylines onto the terrain surface. The fragment's
// tile UV picks a grid cell, then only that cell's line segments (packed in
// tile-local UV space) are tested for proximity. Within the line width, the
// vector color is alpha-composited over the terrain (no discard).
vec4 vectorPolylineRender(vec2 vectorUv, vec4 baseColor)
{
    // Inverse UV-per-pixel Jacobian: measures line distance in screen pixels so
    // width stays constant under anisotropic (oblique) foreshortening.
    mat2 vectorScreenFromUv = inverse(mat2(dFdx(vectorUv), dFdy(vectorUv)));
    int vectorGridWidth = int(texelFetch(u_vectorGridCellIndicesTexture, ivec2(0, 0), 0).r);
    int vectorGridHeight = int(texelFetch(u_vectorGridCellIndicesTexture, ivec2(1, 0), 0).r);
    int vectorCellX = clamp(int(vectorUv.x * float(vectorGridWidth)), 0, vectorGridWidth - 1);
    int vectorCellY = clamp(int(vectorUv.y * float(vectorGridHeight)), 0, vectorGridHeight - 1);
    int vectorCellIndex = vectorCellX + vectorCellY * vectorGridWidth;

    int vectorEnd = int(texelFetch(u_vectorGridCellIndicesTexture, ivec2(vectorCellIndex + 2, 0), 0).r);
    int vectorStart = vectorCellIndex == 0
        ? 0
        : int(texelFetch(u_vectorGridCellIndicesTexture, ivec2(vectorCellIndex + 1, 0), 0).r);

    ivec2 vectorSegmentTextureSize = textureSize(u_vectorSegmentTexture, 0);
    ivec2 vectorPrimitiveTextureSize = textureSize(u_vectorWidthTexture, 0);

    for (int i = vectorStart; i < vectorEnd; i++)
    {
        ivec2 segmentUv = vectorIndexToUv(i, vectorSegmentTextureSize);
        vec4 segment = texelFetch(u_vectorSegmentTexture, segmentUv, 0);

        int primitiveIndex = int(texelFetch(u_vectorSegmentPrimitiveIndicesTexture, segmentUv, 0).r);
        ivec2 primitiveUv = vectorIndexToUv(primitiveIndex, vectorPrimitiveTextureSize);

        float lineWidth = texelFetch(u_vectorWidthTexture, primitiveUv, 0).r * 255.0;

        vec2 vectorOffsetUv = vectorOffsetToLine(vectorUv, segment);
        if (length(vectorScreenFromUv * vectorOffsetUv) < lineWidth)
        {
            // Alpha-composite vector over terrain.
            vec4 vectorColor = texelFetch(u_vectorColorTexture, primitiveUv, 0);
            baseColor = vectorColor * vec4(vectorColor.aaa, 1.0) + baseColor * (1.0 - vectorColor.a);
            break;
        }
    }

    return baseColor;
}
