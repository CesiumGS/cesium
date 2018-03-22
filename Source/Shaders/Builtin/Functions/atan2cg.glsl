/**
 * Approximates atan2 for inputs y and x.
 * Native implementations of atan2 can differ between vendors, so use this approximation for
 * computations that require consistency across platforms and between CPU/GPU.
 *
 * Based on the nvidia cg reference implementation: http://developer.download.nvidia.com/cg/atan2.html
 * atan2 is difficult to approximate using identities and other trigonometric approximations because of limited input range.
 *
 * @name czm_atan2cg
 * @glslFunction
 *
 * @param {float} y A nonzero y-component of a coordinate.
 * @param {float} x A nonzero x-component of a coordinate
 *
 * @returns {float} The floating-point atan2 of y and x
 */
float czm_atan2cg(float y, float x)
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
