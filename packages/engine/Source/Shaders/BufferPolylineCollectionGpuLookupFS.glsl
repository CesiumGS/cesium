in vec2 v_uv;

uniform highp sampler2D u_segmentTexture;
uniform highp sampler2D u_gridCellIndicesTexture;
uniform vec4 u_color;
uniform float u_lineWidth;

float distanceToLine(vec2 p, vec4 l)
{
    vec2 a = l.xy;
    vec2 b = l.zw;
    vec2 ab = b - a;
    float abLengthSquared = dot(ab, ab);

    if (abLengthSquared < 1.0e-8)
    {
        return length(p - a);
    }

    float t = clamp(dot(p - a, ab) / abLengthSquared, 0.0, 1.0);
    vec2 closestPoint = a + t * ab;
    return length(p - closestPoint);
}

float scaleDistanceToUv(float value)
{
    mat2 pixelFootprint = mat2(dFdx(v_uv), dFdy(v_uv));
    float pixelFootprintArea = abs(determinant(pixelFootprint));
    float pixelFootprintDiameter = sqrt(max(pixelFootprintArea, 1.0e-16));
    return value * pixelFootprintDiameter;
}

ivec2 getGridCell(vec2 uv, int gridWidth, int gridHeight)
{
    int x = int(uv.x * float(gridWidth));
    int y = int(uv.y * float(gridHeight));
    x = clamp(x, 0, gridWidth - 1);
    y = clamp(y, 0, gridHeight - 1);
    return ivec2(x, y);
}

void main()
{
    int gridWidth = int(texelFetch(u_gridCellIndicesTexture, ivec2(0, 0), 0).r);
    int gridHeight = int(texelFetch(u_gridCellIndicesTexture, ivec2(1, 0), 0).r);
    ivec2 cell = getGridCell(v_uv, gridWidth, gridHeight);
    int cellIndex = cell.x + cell.y * gridWidth;

    int start = 0;
    int end = int(texelFetch(u_gridCellIndicesTexture, ivec2(cellIndex + 2, 0), 0).r);
    if (cellIndex > 0)
    {
        start = int(texelFetch(u_gridCellIndicesTexture, ivec2(cellIndex + 1, 0), 0).r);
    }

    ivec2 segmentTextureSize = textureSize(u_segmentTexture, 0);
    float minDistance = 1.0e9;
    float threshold = scaleDistanceToUv(max(u_lineWidth, 1.0));

    for (int i = start; i < end; i++)
    {
        int texelY = i / segmentTextureSize.x;
        int texelX = i - texelY * segmentTextureSize.x;
        vec4 segment = texelFetch(u_segmentTexture, ivec2(texelX, texelY), 0);
        if (segment.x < 0.0)
        {
            break;
        }

        minDistance = min(minDistance, distanceToLine(v_uv, segment));
        if (minDistance < threshold)
        {
            break;
        }
    }

    if (minDistance >= threshold)
    {
        discard;
    }

    out_FragColor = czm_gammaCorrect(u_color);
    czm_writeLogDepth();
}
