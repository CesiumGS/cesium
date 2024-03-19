in vec2 v_textureCoordinates;

uniform int u_polygonLength;
uniform highp sampler2D u_polygonTexture;
uniform vec2 u_polygonTextureDimensions;

int getPolygonIndex(vec4 coord) {
   float dimension = ceil(log2(float(u_polygonLength)));
   vec2 uv = coord.xy * dimension;
   return int(floor(uv.y) * dimension + floor(uv.x)));
}

vec2 getLookupUv(int i) {
    int pixY = i / int(u_polygonTextureDimensions.x);
    int pixX = i - (pixY * int(u_polygonTextureDimensions.x));
    float pixelWidth = 1.0 / u_polygonTextureDimensions.x;
    float pixelHeight = 1.0 / u_polygonTextureDimensions.y;
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    return vec2(u, v);
}

vec4 getRectangle(highp sampler2D polygonTexture, int i) {
    return vec4(texture(polygonTexture, getLookupUv(i)).xy, texture(polygonTexture, getLookupUv(i + 1)).xy);
}

int getPositionsLength(highp sampler2D polygonTexture, int i) {
    vec2 uv = getLookupUv(i);
    return int(texture(polygonTexture, uv).x);
}

vec2 getPolygonPosition(highp sampler2D polygonTexture, int i) {
    vec2 uv = getLookupUv(i);
    return texture(polygonTexture, uv).xy;
}

vec2 getCoordinates(vec2 textureCoordinates, rectangle) {
    float latitude = mix(rectangle.y, rectangle.w, textureCoordinates.y);
    float longitude = mix(rectangle.x, rectangle.z, textureCoordinates.x);
    return vec2(latitude, longitude);
}

void main() {
    int lastPolygonIndex = 0;
    float clipAmount = czm_infinity;
    int polygonRegionIndex = getPolygonIndex(gl_FragCoord);

    // Only traverse up to the needed polygon
    for (int polygonIndex = 0; polygonIndex <= u_polygonLength && polygonIndex <= polygonRegionIndex; polygonIndex++) {
        vec4 rectangle = getRectangle(u_polygonTexture, lastPolygonIndex);
        lastPolygonIndex += 2;

        int positionsLength = getPositionsLength(u_polygonTexture, lastPolygonIndex);
        lastPolygonIndex += 1;

         vec2 extents = abs(rectangle.zw - rectangle.xy);
         vec2 p = getCoordinates(v_textureCoordinates, rectangle);
         float s = 1.0;

         // Only compute signed distance for the relevant polygon
         if (polygonIndex == polygonRegionIndex) {
            // Check each edge for absolute distance
            for (int i = 0, j = positionsLength - 1; i < positionsLength; j = i, i++) {
                vec2 a = getPolygonPosition(u_polygonTexture, lastPolygonIndex + i);
                vec2 b = getPolygonPosition(u_polygonTexture, lastPolygonIndex + j);
 
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