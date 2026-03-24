in vec2 v_uv;

uniform highp sampler2D u_segmentTexture;
uniform highp sampler2D u_gridCellIndicesTexture;
uniform vec4 u_fillColor;

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

void main()
{
    int segmentCount = int(texelFetch(u_gridCellIndicesTexture, ivec2(2, 0), 0).r);
    ivec2 segmentTextureSize = textureSize(u_segmentTexture, 0);
    bool inside = false;
    float minDistance = 1.0e9;

    for (int i = 0; i < segmentCount; i++)
    {
        int texelY = i / segmentTextureSize.x;
        int texelX = i - texelY * segmentTextureSize.x;
        vec4 segment = texelFetch(u_segmentTexture, ivec2(texelX, texelY), 0);
        if (segment.x < 0.0)
        {
            break;
        }

        minDistance = min(minDistance, distanceToLine(v_uv, segment));

        if ((v_uv.y > segment.y && v_uv.y <= segment.w) || (v_uv.y > segment.w && v_uv.y <= segment.y))
        {
            float t = (v_uv.y - segment.y) / (segment.w - segment.y);
            float intersectionX = segment.x + t * (segment.z - segment.x);
            if (intersectionX > v_uv.x)
            {
                inside = !inside;
            }
        }
    }

    if (!inside && minDistance >= scaleDistanceToUv(1.0))
    {
        discard;
    }

    out_FragColor = czm_gammaCorrect(u_fillColor);
    czm_writeLogDepth();
}
