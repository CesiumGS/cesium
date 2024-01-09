vec2 getLookupUv(int i) {
    int pixY = i / CLIPPING_POLYGONS_TEXTURE_WIDTH;
    int pixX = i - (pixY * CLIPPING_POLYGONS_TEXTURE_WIDTH);
    float pixelWidth = 1.0 / float(CLIPPING_POLYGONS_TEXTURE_WIDTH);
    float pixelHeight = 1.0 / float(CLIPPING_POLYGONS_TEXTURE_HEIGHT);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    return vec2(u, v);
}

int getPositionsLength(highp sampler2D clippingPolygons, int i) {
    vec2 uv = getLookupUv(i);
    return int(texture(clippingPolygons, uv).x);
}

vec2 getPolygonPosition(highp sampler2D clippingPolygons, int i) {
    vec2 uv = getLookupUv(i);
    vec4 worldCoordinate = texture(clippingPolygons, uv);
    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate.xyz);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);
    return sphericalLatLong;
}

void clipPolygons(vec4 fragCoord, highp sampler2D clippingPolygons, int polygonLength) {
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord);
    vec4 worldCoordinate4 = czm_inverseView * eyeCoordinate;
    vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;

    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);
    float x = sphericalLatLong.x;
    float y = sphericalLatLong.y;

    bool inside = false;
    int lastPolygonIndex = 0;
    for (int polygonIndex = 0; polygonIndex < polygonLength; ++polygonIndex) {
        int positionsLength = getPositionsLength(clippingPolygons, lastPolygonIndex);
        ++lastPolygonIndex;

        for (int i = 0, j = positionsLength - 1; i < positionsLength; j = i++) {
            vec2 pi = getPolygonPosition(clippingPolygons, lastPolygonIndex + i);
            vec2 pj = getPolygonPosition(clippingPolygons, lastPolygonIndex + j);

            bool intersect = ((pi.y > y) != (pj.y > y))
                && (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y) + pi.x);
            if (intersect) {
                inside = !inside;
            }
        }
        
        lastPolygonIndex += positionsLength;
    }

    #ifdef CLIPPING_INVERSE
    if (!inside) {
        discard;
    }
    #else
    if (inside) {
        discard;
    }
    #endif
}

void modelClippingPolygonsStage()
{
    clipPolygons(gl_FragCoord, model_clippingPolygons, CLIPPING_POLYGONS_LENGTH);
}
