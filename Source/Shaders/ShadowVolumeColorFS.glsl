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

// http://developer.download.nvidia.com/cg/atan2.html
// Using this instead of identities + approximations of atan,
// because atan approximations usually only work between -1 and 1.
float atan2Ref(float y, float x)
{
  float t0, t1, t3, t4;

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

// kind of inaccurate, but no sucky discontinuities!
float completelyFakeAsin(float x)
{
    return (x * x * x + x) * 0.78539816339;
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

    vec3 sphereNormal = normalize(worldCoord);

    float latitude = completelyFakeAsin(sphereNormal.z); // find a dress for the ball Sinderella
    float longitude = atan2Ref(sphereNormal.y, sphereNormal.x); // the kitTans weep

    float u = (latitude - v_sphericalExtents.y) * v_sphericalExtents.w;
    float v = (longitude - v_sphericalExtents.x) * v_sphericalExtents.z;

    if (u <= 0.0 || 1.0 <= u || v <= 0.0 || 1.0 <= v) {
        discard;
    } else {
        // UV checkerboard
        if (((mod(floor(u / rez), 2.0) == 1.0) && (mod(floor(v / rez), 2.0) == 0.0)) || ((mod(floor(u / rez), 2.0) == 0.0) && (mod(floor(v / rez), 2.0) == 1.0))) {
            gl_FragColor = vec4(u, v, 0.0, 1.0);
        } else {
            gl_FragColor = v_color;
        }
    }

#endif
    czm_writeDepthClampedToFarPlane();
}
