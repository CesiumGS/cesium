uniform highp sampler2D u_vectorColorTexture;
uniform highp sampler2D u_vectorPickColorTexture;

// Primitive index of the topmost vector draped over this fragment, or -1 for none.
int vectorPickPrimitiveIndex = -1;

#ifdef HAS_VECTOR_POLYLINES
uniform highp sampler2D u_vectorSegmentTexture;
uniform highp sampler2D u_vectorWidthTexture;
uniform highp sampler2D u_vectorSegmentPrimitiveIndicesTexture;
uniform highp sampler2D u_vectorGridCellIndicesTexture;
// Ground size, in meters, of the tile's UV domain.
uniform vec2 u_vectorMetersPerUv;
#endif

#ifdef HAS_VECTOR_POLYGONS
uniform highp sampler2D u_vectorPolygonEdgeTexture;
uniform highp sampler2D u_vectorPolygonEdgePrimitiveIndicesTexture;
uniform highp sampler2D u_vectorPolygonGridCellIndicesTexture;
#endif

uniform highp sampler2D u_clippingEdgeTexture;
uniform highp sampler2D u_clippingEdgePrimitiveIndicesTexture;
uniform highp sampler2D u_clippingGridCellIndicesTexture;

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

// Returns [start, end) index range for the grid cell containing uv. An empty
// range (start == end == 0) means a placeholder grid, so callers loop zero times.
ivec2 vectorCellRange(vec2 uv, highp sampler2D gridCellIndicesTexture)
{
    ivec2 headerSize = textureSize(gridCellIndicesTexture, 0);
    if (headerSize.x * headerSize.y < 3)
    {
        return ivec2(0);
    }

    int gridWidth  = int(texelFetch(gridCellIndicesTexture, vectorIndexToUv(0, headerSize), 0).r);
    int gridHeight = int(texelFetch(gridCellIndicesTexture, vectorIndexToUv(1, headerSize), 0).r);
    int cellX = clamp(int(uv.x * float(gridWidth)),  0, gridWidth  - 1);
    int cellY = clamp(int(uv.y * float(gridHeight)), 0, gridHeight - 1);
    int cellIndex = cellX + cellY * gridWidth;

    int indexEnd = int(texelFetch(gridCellIndicesTexture, vectorIndexToUv(cellIndex + 2, headerSize), 0).r);
    int indexStart = cellIndex == 0
        ? 0
        : int(texelFetch(gridCellIndicesTexture, vectorIndexToUv(cellIndex + 1, headerSize), 0).r);

    return ivec2(indexStart, indexEnd);
}

#ifdef VECTOR_ANTIALIAS
// Half-pixel band across a line's edge over which coverage fades.
const float vectorCoverageRadius = 0.5;
#else
const float vectorCoverageRadius = 0.0;
#endif

// Drape vector polylines onto the terrain surface. The fragment's
// tile UV picks a grid cell, then only that cell's line segments (packed in
// tile-local UV space) are tested for proximity. Within the line width, the
// vector color is alpha-composited over the terrain (no discard).
vec4 vectorPolylineRender(vec2 vectorUv, vec3 positionEC, vec4 baseColor)
{
#ifdef HAS_VECTOR_POLYLINES
    // A width in pixels is sized at the fragment's depth, which is independent of the surface orientation.
    mat2 metersFromUv = mat2(u_vectorMetersPerUv.x, 0.0, 0.0, u_vectorMetersPerUv.y);
    float metersPerPixel = czm_metersPerPixel(vec4(positionEC, 1.0));

    // A tile without polylines binds a 1x1 placeholder; a real grid header
    // [gridWidth, gridHeight, ...] is at least 3 texels.
    ivec2 headerSize = textureSize(u_vectorGridCellIndicesTexture, 0);
    if (headerSize.x * headerSize.y < 3)
    {
        return baseColor;
    }

    ivec2 range = vectorCellRange(vectorUv, u_vectorGridCellIndicesTexture);
    ivec2 segmentTextureSize = textureSize(u_vectorSegmentTexture, 0);
    ivec2 primitiveTextureSize = textureSize(u_vectorWidthTexture, 0);

    // Signed distance to the nearest edge, negative inside the line. Consecutive
    // segments overlap at their shared vertex, so only the nearest is composited;
    // compositing each in turn would darken the joints.
    float nearestEdgeDistance = 1.0e30;
    int nearestPrimitiveIndex = -1;

    for (int i = range.x; i < range.y; i++)
    {
        ivec2 segmentUv = vectorIndexToUv(i, segmentTextureSize);
        vec4 segment = texelFetch(u_vectorSegmentTexture, segmentUv, 0);

        int primitiveIndex = int(texelFetch(u_vectorSegmentPrimitiveIndicesTexture, segmentUv, 0).r);
        ivec2 primitiveUv = vectorIndexToUv(primitiveIndex, primitiveTextureSize);

        float width = texelFetch(u_vectorWidthTexture, primitiveUv, 0).r;
        float halfWidth = abs(width) * 0.5;
        vec2 offsetToLine = vectorOffsetToLine(vectorUv, segment);

#if defined(VECTOR_WIDTH_MIXED_UNITS)
        // A negative width marks a width in meters; see VectorPipeline.
        float halfWidthMeters = width < 0.0 ? halfWidth : halfWidth * metersPerPixel;
#elif defined(VECTOR_WIDTH_IN_METERS)
        float halfWidthMeters = halfWidth;
#else
        float halfWidthMeters = halfWidth * metersPerPixel;
#endif
        float edgeDistance = (length(metersFromUv * offsetToLine) - halfWidthMeters) / metersPerPixel;

        if (edgeDistance < nearestEdgeDistance)
        {
            nearestEdgeDistance = edgeDistance;
            nearestPrimitiveIndex = primitiveIndex;
        }

        // Coverage is saturated; no further segment can raise it. Only the nearest
        // segment supplies the color, so overlapping translucent lines do not blend.
        if (nearestEdgeDistance <= -vectorCoverageRadius)
        {
            break;
        }
    }

    if (nearestEdgeDistance > vectorCoverageRadius)
    {
        return baseColor;
    }

#ifdef VECTOR_ANTIALIAS
    float coverage = 1.0 - smoothstep(-vectorCoverageRadius, vectorCoverageRadius, nearestEdgeDistance);
#else
    float coverage = 1.0;
#endif

    vectorPickPrimitiveIndex = nearestPrimitiveIndex;

    // Alpha-composite vector over terrain.
    ivec2 primitiveUv = vectorIndexToUv(nearestPrimitiveIndex, primitiveTextureSize);
    vec4 vectorColor = texelFetch(u_vectorColorTexture, primitiveUv, 0);
    vectorColor.a *= coverage;
    return vectorColor * vec4(vectorColor.aaa, 1.0) + baseColor * (1.0 - vectorColor.a);
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

    vectorPickPrimitiveIndex = primitiveIndex;

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

// Drape vector polygon fills onto the terrain surface. The fragment's
// tile UV picks a grid cell whose edges were clipped to the cell on the CPU,
// forming closed loops, so an even-odd horizontal ray cast within the cell
// decides coverage. Edges arrive grouped by primitive; each covering
// primitive's fill color is alpha-composited in primitive order (no discard).
vec4 vectorPolygonRender(vec2 vectorUv, vec4 baseColor)
{
#ifdef HAS_VECTOR_POLYGONS
    ivec2 range = vectorCellRange(vectorUv, u_vectorPolygonGridCellIndicesTexture);
    ivec2 edgeTextureSize = textureSize(u_vectorPolygonEdgeTexture, 0);
    ivec2 primitiveTextureSize = textureSize(u_vectorColorTexture, 0);

    int currentPrimitive = -1;
    bool inside = false;

    for (int i = range.x; i < range.y; i++)
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

// Pick color of the vector draped over this fragment, or the surface's own where none is.
vec4 vectorPickColorOver(vec4 surfacePickColor)
{
    if (vectorPickPrimitiveIndex < 0)
    {
        return surfacePickColor;
    }

    ivec2 primitiveTextureSize = textureSize(u_vectorPickColorTexture, 0);
    return texelFetch(u_vectorPickColorTexture, vectorIndexToUv(vectorPickPrimitiveIndex, primitiveTextureSize), 0);
}

// Returns true if uv is inside any polygon in its grid cell
// If performing inverse-clipping, it is up to the caller to negate the result.
bool vectorClip(vec2 uv)
{
    // Clamp to [0, 1] to address small interpolation precision error that can occur at the boundaries of tiles
    uv = clamp(uv, vec2(0.0), vec2(1.0));
    ivec2 range = vectorCellRange(uv, u_clippingGridCellIndicesTexture);
    ivec2 edgeTextureSize = textureSize(u_clippingEdgeTexture, 0);

    int currentPrimitive = -1;
    bool inside = false;

    for (int i = range.x; i < range.y; i++)
    {
        ivec2 edgeUv = vectorIndexToUv(i, edgeTextureSize);
        int primitiveIndex = int(texelFetch(u_clippingEdgePrimitiveIndicesTexture, edgeUv, 0).r);

        // New primitive: the previous group is complete, check if it was inside and return early if so.
        if (primitiveIndex != currentPrimitive)
        {
            if (inside)
            {
                return true;
            }
            currentPrimitive = primitiveIndex;
            inside = false;
        }

        vec4 edge = texelFetch(u_clippingEdgeTexture, edgeUv, 0);
        if (vectorEdgeCrossesRay(edge, uv))
        {
            inside = !inside;
        }
    }

    return inside; // last group
}
