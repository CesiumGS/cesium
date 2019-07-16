 /**
  * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component Cartesian vector.
  * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
  * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/
  *
  * @name czm_octDecode
  * @param {vec2} encoded The oct-encoded, unit-length vector
  * @param {float} range The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
  * @returns {vec3} The decoded and normalized vector
  */
  vec3 czm_octDecode(vec2 encoded, float range)
  {
      if (encoded.x == 0.0 && encoded.y == 0.0) {
          return vec3(0.0, 0.0, 0.0);
      }

     encoded = encoded / range * 2.0 - 1.0;
     vec3 v = vec3(encoded.x, encoded.y, 1.0 - abs(encoded.x) - abs(encoded.y));
     if (v.z < 0.0)
     {
         v.xy = (1.0 - abs(v.yx)) * czm_signNotZero(v.xy);
     }

     return normalize(v);
  }

/**
 * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component Cartesian vector.
 * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
 * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/
 * 
 * @name czm_octDecode
 * @param {vec2} encoded The oct-encoded, unit-length vector
 * @returns {vec3} The decoded and normalized vector
 */
 vec3 czm_octDecode(vec2 encoded)
 {
    return czm_octDecode(encoded, 255.0);
 }

 /**
 * Decodes a unit-length vector in 'oct' encoding packed into a floating-point number to a normalized 3-component Cartesian vector.
 * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
 * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/
 * 
 * @name czm_octDecode
 * @param {float} encoded The oct-encoded, unit-length vector
 * @returns {vec3} The decoded and normalized vector
 */
 vec3 czm_octDecode(float encoded)
 {
    float temp = encoded / 256.0;
    float x = floor(temp);
    float y = (temp - x) * 256.0;
    return czm_octDecode(vec2(x, y));
 }
 
/**
 * Decodes three unit-length vectors in 'oct' encoding packed into two floating-point numbers to normalized 3-component Cartesian vectors.
 * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
 * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/
 * 
 * @name czm_octDecode
 * @param {vec2} encoded The packed oct-encoded, unit-length vectors.
 * @param {vec3} vector1 One decoded and normalized vector.
 * @param {vec3} vector2 One decoded and normalized vector.
 * @param {vec3} vector3 One decoded and normalized vector.
 */
  void czm_octDecode(vec2 encoded, out vec3 vector1, out vec3 vector2, out vec3 vector3)
 {
    float temp = encoded.x / 65536.0;
    float x = floor(temp);
    float encodedFloat1 = (temp - x) * 65536.0;

    temp = encoded.y / 65536.0;
    float y = floor(temp);
    float encodedFloat2 = (temp - y) * 65536.0;

    vector1 = czm_octDecode(encodedFloat1);
    vector2 = czm_octDecode(encodedFloat2);
    vector3 = czm_octDecode(vec2(x, y));
 }
 
