uniform highp sampler2D u_vectorSegmentTexture;
uniform highp sampler2D u_vectorWidthTexture;
uniform highp sampler2D u_vectorColorTexture;
uniform highp sampler2D u_vectorSegmentPrimitiveIndicesTexture;
uniform highp sampler2D u_vectorGridCellIndicesTexture;
uniform highp sampler2D u_vectorPolygonEdgeTexture;
uniform highp sampler2D u_vectorPolygonEdgePrimitiveIndicesTexture;
uniform highp sampler2D u_vectorPolygonGridCellIndicesTexture;

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
    // A tile without polylines binds a 1x1 placeholder; a real grid header
    // [gridWidth, gridHeight, ...] is at least 3 texels.
    ivec2 headerSize = textureSize(u_vectorGridCellIndicesTexture, 0);
    if (headerSize.x * headerSize.y < 3)
    {
        return baseColor;
    }

    // Inverse UV-per-pixel Jacobian: measures line distance in screen pixels so
    // width stays constant under anisotropic (oblique) foreshortening.
    mat2 screenFromUv = inverse(mat2(dFdx(vectorUv), dFdy(vectorUv)));
    int gridWidth = int(texelFetch(u_vectorGridCellIndicesTexture, vectorIndexToUv(0, headerSize), 0).r);
    int gridHeight = int(texelFetch(u_vectorGridCellIndicesTexture, vectorIndexToUv(1, headerSize), 0).r);
    int cellX = clamp(int(vectorUv.x * float(gridWidth)), 0, gridWidth - 1);
    int cellY = clamp(int(vectorUv.y * float(gridHeight)), 0, gridHeight - 1);
    int cellIndex = cellX + cellY * gridWidth;

    int indexEnd = int(texelFetch(u_vectorGridCellIndicesTexture, vectorIndexToUv(cellIndex + 2, headerSize), 0).r);
    int indexStart = cellIndex == 0
        ? 0
        : int(texelFetch(u_vectorGridCellIndicesTexture, vectorIndexToUv(cellIndex + 1, headerSize), 0).r);

    ivec2 segmentTextureSize = textureSize(u_vectorSegmentTexture, 0);
    ivec2 primitiveTextureSize = textureSize(u_vectorWidthTexture, 0);

    for (int i = indexStart; i < indexEnd; i++)
    {
        ivec2 segmentUv = vectorIndexToUv(i, segmentTextureSize);
        vec4 segment = texelFetch(u_vectorSegmentTexture, segmentUv, 0);

        int primitiveIndex = int(texelFetch(u_vectorSegmentPrimitiveIndicesTexture, segmentUv, 0).r);
        ivec2 primitiveUv = vectorIndexToUv(primitiveIndex, primitiveTextureSize);

        float lineWidth = texelFetch(u_vectorWidthTexture, primitiveUv, 0).r * 255.0;

        vec2 offsetUv = vectorOffsetToLine(vectorUv, segment);
        if (length(screenFromUv * offsetUv) < lineWidth)
        {
            // Alpha-composite vector over terrain.
            vec4 vectorColor = texelFetch(u_vectorColorTexture, primitiveUv, 0);
            baseColor = vectorColor * vec4(vectorColor.aaa, 1.0) + baseColor * (1.0 - vectorColor.a);
            break;
        }
    }

    return baseColor;
}

// Drape clamped vector polygon fills onto the terrain surface. The fragment's
// tile UV picks a grid cell whose edges were clipped to the cell on the CPU,
// forming closed loops, so an even-odd horizontal ray cast within the cell
// decides coverage. Edges arrive grouped by primitive; each covering
// primitive's fill color is alpha-composited in primitive order (no discard).
vec4 vectorPolygonRender(vec2 vectorUv, vec4 baseColor)
{
    // A tile without polygons binds a 1x1 placeholder; a real grid header
    // [gridWidth, gridHeight, ...] is at least 3 texels.
    ivec2 headerSize = textureSize(u_vectorPolygonGridCellIndicesTexture, 0);
    if (headerSize.x * headerSize.y < 3)
    {
        return baseColor;
    }

    int gridWidth = int(texelFetch(u_vectorPolygonGridCellIndicesTexture, vectorIndexToUv(0, headerSize), 0).r);
    int gridHeight = int(texelFetch(u_vectorPolygonGridCellIndicesTexture, vectorIndexToUv(1, headerSize), 0).r);
    int cellX = clamp(int(vectorUv.x * float(gridWidth)), 0, gridWidth - 1);
    int cellY = clamp(int(vectorUv.y * float(gridHeight)), 0, gridHeight - 1);
    int cellIndex = cellX + cellY * gridWidth;

    int indexEnd = int(texelFetch(u_vectorPolygonGridCellIndicesTexture, vectorIndexToUv(cellIndex + 2, headerSize), 0).r);
    int indexStart = cellIndex == 0
        ? 0
        : int(texelFetch(u_vectorPolygonGridCellIndicesTexture, vectorIndexToUv(cellIndex + 1, headerSize), 0).r);

    ivec2 edgeTextureSize = textureSize(u_vectorPolygonEdgeTexture, 0);
    ivec2 primitiveTextureSize = textureSize(u_vectorColorTexture, 0);

    int currentPrimitive = -1;
    bool inside = false;

    // One extra iteration (i == indexEnd) flushes the final primitive group.
    for (int i = indexStart; i <= indexEnd; i++)
    {
        int primitiveIndex = -1;
        vec4 edge = vec4(0.0);
        if (i < indexEnd)
        {
            ivec2 edgeUv = vectorIndexToUv(i, edgeTextureSize);
            edge = texelFetch(u_vectorPolygonEdgeTexture, edgeUv, 0);
            primitiveIndex = int(texelFetch(u_vectorPolygonEdgePrimitiveIndicesTexture, edgeUv, 0).r);
        }

        if (primitiveIndex != currentPrimitive)
        {
            if (currentPrimitive >= 0 && inside)
            {
                ivec2 primitiveUv = vectorIndexToUv(currentPrimitive, primitiveTextureSize);
                vec4 fillColor = texelFetch(u_vectorColorTexture, primitiveUv, 0);
                baseColor = fillColor * vec4(fillColor.aaa, 1.0) + baseColor * (1.0 - fillColor.a);
            }
            currentPrimitive = primitiveIndex;
            inside = false;
        }

        // Even-odd rule with a horizontal +x ray; the half-open interval
        // (> vs <=) counts a ray through a shared vertex exactly once.
        if (i < indexEnd && (edge.y > vectorUv.y) != (edge.w > vectorUv.y))
        {
            float t = (vectorUv.y - edge.y) / (edge.w - edge.y);
            float xIntersect = edge.x + t * (edge.z - edge.x);
            if (vectorUv.x < xIntersect)
            {
                inside = !inside;
            }
        }
    }

    return baseColor;
}
