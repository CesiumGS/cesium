in vec2 v_textureCoordinates;

uniform vec4 u_rectangle;

uniform int u_polygonLength;
uniform highp sampler2D u_polygonTexture;
uniform vec2 u_polygonTextureDimensions;

vec2 getLookupUv(int i) {
    int pixY = i / int(u_polygonTextureDimensions.x);
    int pixX = i - (pixY * int(u_polygonTextureDimensions.x));
    float pixelWidth = 1.0 / u_polygonTextureDimensions.x;
    float pixelHeight = 1.0 / u_polygonTextureDimensions.y;
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    return vec2(u, v);
}

int getPositionsLength(highp sampler2D polygonTexture, int i) {
    vec2 uv = getLookupUv(i);
    return int(texture(polygonTexture, uv).x);
}

vec2 getPolygonPosition(highp sampler2D polygonTexture, int i) {
    vec2 uv = getLookupUv(i);
    return texture(polygonTexture, uv).xy;
}

vec2 getCoordinates(vec2 textureCoordinates) {
    float latitude = mix(u_rectangle.y, u_rectangle.w, textureCoordinates.y);
    float longitude = mix(u_rectangle.x, u_rectangle.z, textureCoordinates.x);
    return vec2(latitude, longitude);
}

void main() {
    vec2 p = getCoordinates(v_textureCoordinates);
    int lastPolygonIndex = 0;
    vec2 extents = abs(u_rectangle.zw - u_rectangle.xy);

    float s = 1.0;

    float clipAmount = czm_infinity;
      for (int polygonIndex = 0; polygonIndex < u_polygonLength; polygonIndex++) {
        int positionsLength = getPositionsLength(u_polygonTexture, lastPolygonIndex);
        lastPolygonIndex += 1;
        
            
            // Check each edge
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

                // Inside / outside
                bvec3 cond = bvec3(p.y >= a.y, 
                            p.y < b.y, 
                            ab.x * pa.y > ab.y * pa.x);
                if( all(cond) || all(not(cond)) ) s=-s;   
                if (abs(d) < abs(clipAmount)) {
                    clipAmount = d;
                }
            }
        lastPolygonIndex += positionsLength;
    }
    
    out_FragColor = (s * vec4(clipAmount / length(extents))) / 2.0 + 0.5;
}