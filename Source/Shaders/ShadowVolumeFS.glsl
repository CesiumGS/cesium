#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#else
varying vec4 v_color;
varying vec4 v_sphericalExtents;
#endif

float rez = 0.1;

float asinRef(float x) {
    float negate = x < 0.0 ? -1.0 : 1.0;
    x = abs(x);
    float ret = -0.0187293;
    ret *= x;
    ret += 0.0742610;
    ret *= x;
    ret -= 0.2121144;
    ret *= x;
    ret += 1.5707288;
    ret = 3.14159265358979 * 0.5 - sqrt(1.0 - x) * ret;
    return ret - 2.0 * negate * ret;
}

float atan2Ref(float y, float x)
{
  float t0, t1, t2, t3, t4;

  t3 = abs(x);
  t1 = abs(y);
  t0 = max(t3, t1);
  t1 = min(t3, t1);
  t3 = 1.0 / t0;
  t3 = t1 * t3;

  t4 = t3 * t3;
  t0 =         - 0.013480470;
  t0 = t0 * t4 + 0.057477314;
  t0 = t0 * t4 - 0.121239071;
  t0 = t0 * t4 + 0.195635925;
  t0 = t0 * t4 - 0.332994597;
  t0 = t0 * t4 + 0.999995630;
  t3 = t0 * t3;

  t3 = (abs(y) > abs(x)) ? 1.570796327 - t3 : t3;
  t3 = (x < 0.0) ?  3.141592654 - t3 : t3;
  t3 = (y < 0.0) ? -t3 : t3;

  return t3;
}

void main(void)
{
#ifdef VECTOR_TILE
    gl_FragColor = u_highlightColor;
#else
    vec2 coords = gl_FragCoord.xy / czm_viewport.zw;
    float depth = czm_unpackDepth(texture2D(czm_globeDepthTexture, coords));

    vec4 windowCoord = vec4(gl_FragCoord.xy, depth, 1.0);
    vec4 eyeCoord = czm_windowToEyeCoordinates(windowCoord);
    vec4 worldCoord4 = czm_inverseView * eyeCoord;
    vec3 worldCoord = worldCoord4.xyz / worldCoord4.w;

    //float height = length(worldCoord);
    vec3 sphereNormal = normalize(worldCoord);

    float latitude = asinRef(sphereNormal.z); // find a dress for the ball Sinderella
    float longitude = atan2Ref(sphereNormal.y, sphereNormal.x); // the kitTans weep

    float u = (latitude - v_sphericalExtents.y) * v_sphericalExtents.w;
    float v = (longitude - v_sphericalExtents.x) * v_sphericalExtents.z;

    /*
    // Snippet that made me realize spherical !== cartographic
    float alpha = 1.0;
    if (v < 0.5) {
        alpha = 0.5;
    }
    if (u < 0.5) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, alpha);
    } else {
        gl_FragColor = vec4(0.0, 1.0, 0.0, alpha);
    }
    */


    // snippet that I used to figure out that inverse trig functions on CPU and GPU have pretty noticeable differences
    if (u < 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
    else if (1.0 < u) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    else if (v < 0.0) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
    else if (1.0 < v) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // UV checkerboard
        if (((mod(floor(u / rez), 2.0) == 1.0) && (mod(floor(v / rez), 2.0) == 0.0)) || ((mod(floor(u / rez), 2.0) == 0.0) && (mod(floor(v / rez), 2.0) == 1.0))) {
            gl_FragColor = vec4(u, v, 0.0, 1.0);
        } else {
            gl_FragColor = v_color;
        }
    }
/*
    if (u < 0.0 || 1.0 < u || v < 0.0 || 1.0 < v) {
        discard;
    } else {
        gl_FragColor = v_color;
    }*/

#endif
    czm_writeDepthClampedToFarPlane();
}
