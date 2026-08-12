uniform highp sampler2D u_vectorColorTexture;

#ifdef HAS_VECTOR_POLYLINES
uniform highp sampler2D u_vectorSegmentTexture;
uniform highp sampler2D u_vectorWidthTexture;
uniform highp sampler2D u_vectorSegmentPrimitiveIndicesTexture;
uniform highp sampler2D u_vectorGridCellIndicesTexture;
#endif

#ifdef HAS_VECTOR_POLYGONS
uniform highp sampler2D u_vectorPolygonEdgeTexture;
uniform highp sampler2D u_vectorPolygonEdgePrimitiveIndicesTexture;
uniform highp sampler2D u_vectorPolygonGridCellIndicesTexture;
#endif

#ifdef HAS_VECTOR_POINTS
uniform highp sampler2D u_vectorPointTexture;
uniform highp sampler2D u_vectorPointPrimitiveIndicesTexture;
uniform highp sampler2D u_vectorPointGridCellIndicesTexture;
#endif

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
#ifdef HAS_VECTOR_POLYLINES
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

    // Cell end offsets follow the two gridWidth/gridHeight texels, so cell
    // N's end is at texel N + 2. A cell's start is the previous cell's end
    // (texel N + 1); cell 0's start is implicitly 0.
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
#else
    return baseColor;
#endif
}

// Composites a polygon's fill over baseColor when the pixel is inside it. A
// negative index (empty cell or first iteration) or an outside pixel is a
// no-op.
vec4 vectorCompositePolygonFill(vec4 baseColor, int primitiveIndex, bool inside, ivec2 primitiveTextureSize)
{
    if (!inside || primitiveIndex < 0)
    {
        return baseColor;
    }

    ivec2 primitiveUv = vectorIndexToUv(primitiveIndex, primitiveTextureSize);
    vec4 fillColor = texelFetch(u_vectorColorTexture, primitiveUv, 0);
    return fillColor * vec4(fillColor.aaa, 1.0) + baseColor * (1.0 - fillColor.a);
}

// True if a horizontal +x ray from p crosses the edge. The half-open interval
// (> vs <=) counts a ray through a shared vertex exactly once.
bool vectorEdgeCrossesRay(vec4 edge, vec2 p)
{
    if ((edge.y > p.y) == (edge.w > p.y))
    {
        return false;
    }

    float t = (p.y - edge.y) / (edge.w - edge.y);
    float xIntersect = edge.x + t * (edge.z - edge.x);
    return p.x < xIntersect;
}

// Drape clamped vector polygon fills onto the terrain surface. The fragment's
// tile UV picks a grid cell whose edges were clipped to the cell on the CPU,
// forming closed loops, so an even-odd horizontal ray cast within the cell
// decides coverage. Edges arrive grouped by primitive; each covering
// primitive's fill color is alpha-composited in primitive order (no discard).
vec4 vectorPolygonRender(vec2 vectorUv, vec4 baseColor)
{
#ifdef HAS_VECTOR_POLYGONS
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

    // Cell end offsets follow the two gridWidth/gridHeight texels, so cell
    // N's end is at texel N + 2. A cell's start is the previous cell's end
    // (texel N + 1); cell 0's start is implicitly 0.
    int indexEnd = int(texelFetch(u_vectorPolygonGridCellIndicesTexture, vectorIndexToUv(cellIndex + 2, headerSize), 0).r);
    int indexStart = cellIndex == 0
        ? 0
        : int(texelFetch(u_vectorPolygonGridCellIndicesTexture, vectorIndexToUv(cellIndex + 1, headerSize), 0).r);

    ivec2 edgeTextureSize = textureSize(u_vectorPolygonEdgeTexture, 0);
    ivec2 primitiveTextureSize = textureSize(u_vectorColorTexture, 0);

    int currentPrimitive = -1;
    bool inside = false;

    for (int i = indexStart; i < indexEnd; i++)
    {
        ivec2 edgeUv = vectorIndexToUv(i, edgeTextureSize);
        vec4 edge = texelFetch(u_vectorPolygonEdgeTexture, edgeUv, 0);
        int primitiveIndex = int(texelFetch(u_vectorPolygonEdgePrimitiveIndicesTexture, edgeUv, 0).r);

        // A new primitive means the previous group is complete: composite it,
        // then start counting the new one fresh.
        if (primitiveIndex != currentPrimitive)
        {
            baseColor = vectorCompositePolygonFill(baseColor, currentPrimitive, inside, primitiveTextureSize);
            currentPrimitive = primitiveIndex;
            inside = false;
        }

        if (vectorEdgeCrossesRay(edge, vectorUv))
        {
            inside = !inside;
        }
    }

    // The last primitive group has no trailing edge to trigger its composite.
    baseColor = vectorCompositePolygonFill(baseColor, currentPrimitive, inside, primitiveTextureSize);

    return baseColor;
#else
    return baseColor;
#endif
}

// Drape clamped vector points onto the terrain surface as discs sized on the
// ground rather than on screen. Each point carries its radius as a tile UV
// extent per axis, so dividing the offset by it restores a unit circle: the
// disc stays round under foreshortening without a screen-space Jacobian, and
// the packer can decide tile membership without knowing where the camera is.
vec4 vectorPointRender(vec2 vectorUv, vec4 baseColor)
{
#ifdef HAS_VECTOR_POINTS
    // A tile without points binds a 1x1 placeholder; a real grid header
    // [gridWidth, gridHeight, ...] is at least 3 texels.
    ivec2 headerSize = textureSize(u_vectorPointGridCellIndicesTexture, 0);
    if (headerSize.x * headerSize.y < 3)
    {
        return baseColor;
    }

    // Derivatives are undefined under non-uniform control flow, so the pixel
    // footprint used to antialias the rim is measured before the loop.
    vec2 uvPerPixel = fwidth(vectorUv);

    int gridWidth = int(texelFetch(u_vectorPointGridCellIndicesTexture, vectorIndexToUv(0, headerSize), 0).r);
    int gridHeight = int(texelFetch(u_vectorPointGridCellIndicesTexture, vectorIndexToUv(1, headerSize), 0).r);
    int cellX = clamp(int(vectorUv.x * float(gridWidth)), 0, gridWidth - 1);
    int cellY = clamp(int(vectorUv.y * float(gridHeight)), 0, gridHeight - 1);
    int cellIndex = cellX + cellY * gridWidth;

    // Cell end offsets follow the two gridWidth/gridHeight texels, so cell
    // N's end is at texel N + 2. A cell's start is the previous cell's end
    // (texel N + 1); cell 0's start is implicitly 0.
    int indexEnd = int(texelFetch(u_vectorPointGridCellIndicesTexture, vectorIndexToUv(cellIndex + 2, headerSize), 0).r);
    int indexStart = cellIndex == 0
        ? 0
        : int(texelFetch(u_vectorPointGridCellIndicesTexture, vectorIndexToUv(cellIndex + 1, headerSize), 0).r);

    ivec2 pointTextureSize = textureSize(u_vectorPointTexture, 0);
    ivec2 primitiveTextureSize = textureSize(u_vectorColorTexture, 0);

    for (int i = indexStart; i < indexEnd; i++)
    {
        ivec2 pointUv = vectorIndexToUv(i, pointTextureSize);
        vec4 point = texelFetch(u_vectorPointTexture, pointUv, 0);
        vec2 radiusUv = point.zw;

        float normalizedDistance = length((vectorUv - point.xy) / radiusUv);

        // Widening the band past the rim as the disc shrinks below a pixel
        // fades it out instead of letting it alias in and out.
        float band = length(uvPerPixel / radiusUv);
        float coverage = 1.0 - smoothstep(1.0 - band, 1.0 + band, normalizedDistance);
        if (coverage <= 0.0)
        {
            continue;
        }

        int primitiveIndex = int(texelFetch(u_vectorPointPrimitiveIndicesTexture, pointUv, 0).r);
        vec4 pointColor = texelFetch(u_vectorColorTexture, vectorIndexToUv(primitiveIndex, primitiveTextureSize), 0);
        pointColor.a *= coverage;

        baseColor = pointColor * vec4(pointColor.aaa, 1.0) + baseColor * (1.0 - pointColor.a);
    }

    return baseColor;
#else
    return baseColor;
#endif
}
