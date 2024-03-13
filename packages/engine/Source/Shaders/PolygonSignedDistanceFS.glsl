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

    float clipAmount = czm_infinity;
    vec2 cp = vec2(czm_infinity, czm_infinity);
      for (int polygonIndex = 0; polygonIndex < u_polygonLength; polygonIndex++) {
        int positionsLength = getPositionsLength(u_polygonTexture, lastPolygonIndex);
        lastPolygonIndex += 1;
        
            // Check each edge
            for (int i = 0, j = positionsLength - 1; i < positionsLength; j = i++) {
                vec2 a = getPolygonPosition(u_polygonTexture, lastPolygonIndex + i);
                vec2 b = getPolygonPosition(u_polygonTexture, lastPolygonIndex + j);
 
                vec2 ab = a - b;
                vec2 abn = normalize(vec2(ab.y, -ab.x));

                vec2 pb = p - b;
                float t = dot(pb, ab) / length(ab);
                t = min(1.0, max(0.0, t));

                vec2 q = b + t * ab;
                vec2 pq = p - q;
                float d = distance(p, q) * sign(dot(pq, abn));
                if (abs(d) < abs(clipAmount)) {
                    clipAmount = d;
                    cp = q;
                }
            }

            //Check each vertex (to avoid artifacts at the corners)
            for (int i = 0; i < positionsLength; i++) {
                vec2 a = getPolygonPosition(u_polygonTexture, lastPolygonIndex + i);
                float d = distance(a, p); // TODO: Signed
                if (abs(d) < abs(clipAmount)) {
                     clipAmount = d;
                     cp = a;
                }
            }
        lastPolygonIndex += positionsLength;
    }
    
    
    //clipAmount = (p.x - u_rectangle.y) / extents.y;
    //clipAmount = (p.y - u_rectangle.x) / extents.x;
    out_FragColor = vec4(clipAmount / length(extents));
}