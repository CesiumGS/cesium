in vec2 v_textureCoordinates;

uniform int u_polygonsLength;
uniform highp sampler2D u_polygonTexture;
uniform vec2 u_polygonTextureDimensions;
uniform highp sampler2D u_extentsTexture;
uniform vec2 u_extentsTextureDimensions;

int getPolygonIndex(float dimension, vec2 coord) {
   vec2 uv = coord.xy * dimension;
   return int(floor(uv.y) * dimension + floor(uv.x));
}

vec2 getLookupUv(vec2 dimensions, int i) {
    int pixY = i / int(dimensions.x);
    int pixX = i - (pixY * int(dimensions.x));
    float pixelWidth = 1.0 / dimensions.x;
    float pixelHeight = 1.0 / dimensions.y;
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    return vec2(u, v);
}

vec4 getRectangle(int i) {
    return texture(u_extentsTexture, getLookupUv(u_extentsTextureDimensions, i));
}

int getPositionsLength(int i) {
    vec2 uv = getLookupUv(u_polygonTextureDimensions, i);
    return int(texture(u_polygonTexture, uv).x);
}

vec2 getPolygonPosition(int i) {
    vec2 uv = getLookupUv(u_polygonTextureDimensions, i);
    return texture(u_polygonTexture, uv).xy;
}

vec2 getCoordinates(vec2 textureCoordinates, vec4 rectangle) {
    float latitude = mix(rectangle.y, rectangle.w, textureCoordinates.y);
    float longitude = mix(rectangle.x, rectangle.z, textureCoordinates.x);
    return vec2(latitude, longitude);
}

void main() {
    int lastPolygonIndex = 0;
    float clipAmount = czm_infinity;
    float dimension = ceil(log2(float(u_polygonsLength + 1)));
    int polygonRegionIndex = getPolygonIndex(dimension, v_textureCoordinates);

    // Only traverse up to the needed polygon
    for (int polygonIndex = 0; polygonIndex < u_polygonsLength && polygonIndex <= polygonRegionIndex; polygonIndex++) {
        vec4 rectangle = getRectangle(polygonIndex);

        int positionsLength = getPositionsLength(lastPolygonIndex);
        lastPolygonIndex += 1;

         // Only compute signed distance for the relevant polygon
         if (polygonIndex == polygonRegionIndex) {
                     vec2 extents = abs(rectangle.zw - rectangle.xy);
            vec2 textureOffset = vec2(mod(float(polygonIndex), dimension), floor(float(polygonIndex) / dimension));
            vec2 p = getCoordinates(v_textureCoordinates * dimension - textureOffset, rectangle);
            float s = 1.0;

            // Check each edge for absolute distance
            for (int i = 0, j = positionsLength - 1; i < positionsLength; j = i, i++) {
                vec2 a = getPolygonPosition(lastPolygonIndex + i);
                vec2 b = getPolygonPosition(lastPolygonIndex + j);
 
                vec2 ab = b - a;
                vec2 abn = a + vec2(-ab.y, ab.x);

                vec2 pa = p - a;
                float t = dot(pa, ab) / dot(ab, ab);
                t = clamp(t, 0.0, 1.0);

                vec2 pq = pa - t * ab;
                float d = length(pq);

                // Inside / outside computation to determine sign
                bvec3 cond = bvec3(p.y >= a.y, 
                            p.y < b.y, 
                            ab.x * pa.y > ab.y * pa.x);
                if( all(cond) || all(not(cond)) ) s=-s;   
                if (abs(d) < abs(clipAmount)) {
                    clipAmount = d;
                }
            }

            // Normalize the range to [0,1]
            out_FragColor = (s * vec4(clipAmount / length(extents))) / 2.0 + 0.5;
         }

        lastPolygonIndex += positionsLength;
    }
}