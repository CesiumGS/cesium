in vec2 v_textureCoordinates;

uniform int u_polygonsLength;
uniform int u_extentsLength;
uniform highp sampler2D u_polygonTexture;
uniform highp sampler2D u_extentsTexture;

int getPolygonIndex(float dimension, vec2 coord) {
   vec2 uv = coord.xy * dimension;
   return int(floor(uv.y) * dimension + floor(uv.x));
}

vec2 getLookupUv(ivec2 dimensions, int i) {
    int pixY = i / dimensions.x;
    int pixX = i - (pixY * dimensions.x);
    float pixelWidth = 1.0 / float(dimensions.x);
    float pixelHeight = 1.0 / float(dimensions.y);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    return vec2(u, v);
}

vec4 getExtents(int i) {
    return texture(u_extentsTexture, getLookupUv(textureSize(u_extentsTexture, 0), i));
}

ivec2 getPositionsLengthAndExtentsIndex(int i) {
    vec2 uv = getLookupUv(textureSize(u_polygonTexture, 0), i);
    vec4 value = texture(u_polygonTexture, uv);
    return ivec2(int(value.x), int(value.y));
}

vec2 getPolygonPosition(int i) {
    vec2 uv = getLookupUv(textureSize(u_polygonTexture, 0), i);
    return texture(u_polygonTexture, uv).xy;
}

vec2 getCoordinates(vec2 textureCoordinates, vec4 extents) {
    float latitude = mix(extents.x, extents.x + 1.0 / extents.z, textureCoordinates.y);
    float longitude = mix(extents.y, extents.y + 1.0 / extents.w, textureCoordinates.x);
    return vec2(latitude, longitude);
}

void main() {
    int lastPolygonIndex = 0;
    out_FragColor = vec4(1.0);

    // Get the relevant region of the texture
    float dimension = float(u_extentsLength);
    if (u_extentsLength > 2) {
        dimension = ceil(log2(float(u_extentsLength)));
    }
    int regionIndex = getPolygonIndex(dimension, v_textureCoordinates);

    if (regionIndex >= u_extentsLength) {
        return; // done (no polygons in this region)
    }

    for (int polygonIndex = 0; polygonIndex < u_polygonsLength; polygonIndex++) {
        ivec2 positionsLengthAndExtents = getPositionsLengthAndExtentsIndex(lastPolygonIndex);
        int positionsLength = positionsLengthAndExtents.x;
        int polygonExtentsIndex = positionsLengthAndExtents.y;
        lastPolygonIndex += 1;

        // Read the individual polygon extent (2 pixels: south/west, latRange/lonRange)
        vec2 extentsSouthWest = getPolygonPosition(lastPolygonIndex);
        vec2 extentsRange = getPolygonPosition(lastPolygonIndex + 1);
        vec4 polygonExtent = vec4(extentsSouthWest, extentsRange);
        lastPolygonIndex += 2;

        if (polygonExtentsIndex < regionIndex) {
            lastPolygonIndex += positionsLength;
            continue; // skip to next (TODO: could optimize further if we knew how many polygons to skip)
        } else if (polygonExtentsIndex > regionIndex) {
            break; // done (we know polygons are sorted by regionIndex)
        }

         // Only compute signed distance for the relevant part of the atlas
        float clipAmount = czm_infinity;
        vec4 extents = getExtents(polygonExtentsIndex);
        vec2 textureOffset = vec2(mod(float(polygonExtentsIndex), dimension), floor(float(polygonExtentsIndex) / dimension)) / dimension;
        vec2 p = getCoordinates((v_textureCoordinates - textureOffset) * dimension, extents);   // current pixel position

        // Only consider polygons whos boundingbox includes current pixel (with a slight padding)
        float padding = 0.05;   // 5% of polygon extents
        float polygonNorth = polygonExtent.x + polygonExtent.z;
        float polygonEast = polygonExtent.y + polygonExtent.w;
        float latPadding = padding * polygonExtent.z; // padding as fraction of latitude range
        float lonPadding = padding * polygonExtent.w; // padding as fraction of longitude range
        if (p.x < polygonExtent.x - latPadding || p.x > polygonNorth + latPadding ||
            p.y < polygonExtent.y - lonPadding || p.y > polygonEast + lonPadding) {
            lastPolygonIndex += positionsLength;
            continue;   // skip to next
        }

        float s = 1.0;

        // Check each edge for absolute distance.
        // Cache the previous vertex to halve the texture reads per iteration.
        vec2 prev = getPolygonPosition(lastPolygonIndex + positionsLength - 1);
        for (int i = 0; i < positionsLength; i++) {
            vec2 a = getPolygonPosition(lastPolygonIndex + i);
            vec2 b = prev;
            prev = a;

            vec2 ab = b - a;
            vec2 pa = p - a;
            float t = dot(pa, ab) / dot(ab, ab);
            t = clamp(t, 0.0, 1.0);

            vec2 pq = pa - t * ab;
            float d = length(pq);

            // Inside / outside computation to determine sign
            bvec3 cond = bvec3(p.y >= a.y, 
                        p.y < b.y, 
                        ab.x * pa.y > ab.y * pa.x);
            if (all(cond) || all(not(cond))) s = -s;
            if (abs(d) < abs(clipAmount)) {
                clipAmount = d;
            }
        }

        // Normalize the range to [0,1]
        vec4 result = (s * vec4(clipAmount * length(extents.zw))) / 2.0 + 0.5;
        // In the case where we've iterated through multiple polygons, take the minimum
        out_FragColor = min(out_FragColor, result);

        lastPolygonIndex += positionsLength;
    }
}