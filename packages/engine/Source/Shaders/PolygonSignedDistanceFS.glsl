in vec2 v_textureCoordinates;

uniform vec4 u_rectangle;

uniform float u_polygonLength;
uniform highp sampler2D u_polygonTexture;
uniform vec2 u_polygonTextureDimensions;

vec2 getLookupUv(int i) {
    int pixY = i / u_polygonTextureDimensions.x;
    int pixX = i - (pixY * u_polygonTextureDimensions.x);
    float pixelWidth = 1.0 / float(u_polygonTextureDimensions.x);
    float pixelHeight = 1.0 / float(u_polygonTextureDimensions.y);
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    return vec2(u, v);
}

int getPositionsLength(highp sampler2D polygonTexture, int i) {
    vec2 uv = getLookupUv(i);
    return int(texture(polygonTexture, uv).x);
}

vec2 getCoordinates(vec2 textureCoordinates) {
    float longitude = mix(u_rectangle.x, u_rectangle.z, textureCoordinates.x);
    float latitude = mix(u_rectangle.y, u_rectangle.w, textureCoordinates.y);
    return vec2(longitude, latitude); // TODO: Should these be spherical or does it matter?
}

void main() {
    vec2 p = getCoordinates(v_textureCoordinates);
    p.y = czm_branchFreeTernary(p.y < czm_pi, p.y, p.y - czm_twoPi);
    p.x /= 2.0;

    float clipAmount = czm_infinity;
      for (int polygonIndex = 0; polygonIndex < u_polygonLength; ++polygonIndex) {
        int positionsLength = getPositionsLength(u_polygonTexture, lastPolygonIndex++);
        
            for (int i = 0, j = positionsLength - 1; i < positionsLength; j = i++) {
                vec2 pi = getPolygonPosition(u_polygonTexture, lastPolygonIndex + i);
                vec2 pj = getPolygonPosition(u_polygonTexture, lastPolygonIndex + j);
 
                vec2 e = pi - pj;
                vec2 lineNormal = normalize(vec2(e.y, -e.x));

                vec2 a = p - pj;
                float t = dot(a, e) / (length(e) * length(e));
                t = min(1.0, max(0.0, t));
                vec2 q = pj + t * e;
                float d = length(p-q) * sign(dot(lineNormal, p-q));
                if (abs(d) < abs(v_clipAmount)) {
                    v_clipAmount = d;
                }
            }
        
        lastPolygonIndex += positionsLength;
    }
    out_FragColor = vec4(clipAmount, clipAmount, clipAmount, 1.0);
}