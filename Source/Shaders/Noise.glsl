#ifndef czm_NOISE
#define czm_NOISE 1

/*!
 * Description : Array and textureless GLSL 2D/3D/4D simplex 
 *               noise functions.
 *      Author : Ian McEwan, Ashima Arts.
 *  Maintainer : ijm
 *     Lastmod : 20110822 (ijm)
 *     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
 *               Distributed under the MIT License. See LICENSE file.
 *               https://github.com/ashima/webgl-noise
 */ 

vec4 _czm_mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 _czm_mod289(vec3 x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 _czm_mod289(vec2 x) 
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

float _czm_mod289(float x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
  
vec4 _czm_permute(vec4 x)
{
    return _czm_mod289(((x*34.0)+1.0)*x);
}

vec3 _czm_permute(vec3 x)
{
    return _czm_mod289(((x*34.0)+1.0)*x);
}

float _czm_permute(float x) 
{
    return _czm_mod289(((x*34.0)+1.0)*x);
}

vec4 _czm_taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

float _czm_taylorInvSqrt(float r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 _czm_grad4(float j, vec4 ip)
{
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p,s;

    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

    return p;
}
  
/**
 * DOC_TBA
 *
 * Implemented by Ian McEwan, Ashima Arts, and distributed under the MIT License.  {@link https://github.com/ashima/webgl-noise}
 *
 * @name czm_snoise
 * @glslFunction
 *
 * @see <a href="https://github.com/ashima/webgl-noise">https://github.com/ashima/webgl-noise</a>
 * @see Stefan Gustavson's paper <a href="http://www.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf">Simplex noise demystified</a>
 */  
float czm_snoise(vec2 v)
{
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    // First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = _czm_mod289(i); // Avoid truncation effects in permutation
    vec3 p = _czm_permute( _czm_permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float czm_snoise(vec3 v)
{ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = _czm_mod289(i); 
    vec4 p = _czm_permute( _czm_permute( _czm_permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = _czm_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

float czm_snoise(vec4 v)
{
    const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                          0.276393202250021,  // 2 * G4
                          0.414589803375032,  // 3 * G4
                         -0.447213595499958); // -1 + 4 * G4

    // (sqrt(5) - 1)/4 = F4, used once below
    #define F4 0.309016994374947451

    // First corner
    vec4 i  = floor(v + dot(v, vec4(F4)) );
    vec4 x0 = v -   i + dot(i, C.xxxx);

    // Other corners

    // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
    vec4 i0;
    vec3 isX = step( x0.yzw, x0.xxx );
    vec3 isYZ = step( x0.zww, x0.yyz );
    //  i0.x = dot( isX, vec3( 1.0 ) );
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    // i0 now contains the unique values 0,1,2,3 in each channel
    vec4 i3 = clamp( i0, 0.0, 1.0 );
    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

    //  x0 = x0 - 0.0 + 0.0 * C.xxxx
    //  x1 = x0 - i1  + 1.0 * C.xxxx
    //  x2 = x0 - i2  + 2.0 * C.xxxx
    //  x3 = x0 - i3  + 3.0 * C.xxxx
    //  x4 = x0 - 1.0 + 4.0 * C.xxxx
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;

    // Permutations
    i = _czm_mod289(i); 
    float j0 = _czm_permute( _czm_permute( _czm_permute( _czm_permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = _czm_permute( _czm_permute( _czm_permute( _czm_permute (
               i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
             + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
             + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
             + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

    // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
    // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

    vec4 p0 = _czm_grad4(j0,   ip);
    vec4 p1 = _czm_grad4(j1.x, ip);
    vec4 p2 = _czm_grad4(j1.y, ip);
    vec4 p3 = _czm_grad4(j1.z, ip);
    vec4 p4 = _czm_grad4(j1.w, ip);

    // Normalise gradients
    vec4 norm = _czm_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= _czm_taylorInvSqrt(dot(p4,p4));

    // Mix contributions from the five corners
    vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
                  + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}

///////////////////////////////////////////////////////////////////////////////

/*!
 * Cellular noise ("Worley noise") in 2D in GLSL.
 * Copyright (c) Stefan Gustavson 2011-04-19. All rights reserved.
 * This code is released under the conditions of the MIT license.
 * See LICENSE file for details.
 */
 
//#ifdef GL_OES_standard_derivatives
//    #extension GL_OES_standard_derivatives : enable
//#endif  
//
//float aastep (float threshold , float value)
//{
//    float afwidth = 0.7 * length ( vec2 ( dFdx ( value ), dFdy ( value )));
//    return smoothstep ( threshold - afwidth , threshold + afwidth , value );
//}

// Permutation polynomial: (34x^2 + x) mod 289
vec3 _czm_permute289(vec3 x)
{
    return mod((34.0 * x + 1.0) * x, 289.0);
}

/**
 * DOC_TBA
 *
 * Implemented by Stefan Gustavson, and distributed under the MIT License.  {@link http://openglinsights.git.sourceforge.net/git/gitweb.cgi?p=openglinsights/openglinsights;a=tree;f=proceduraltextures}
 *
 * @name czm_cellular
 * @glslFunction
 *
 * @see Stefan Gustavson's chapter, <i>Procedural Textures in GLSL</i>, in <a href="http://www.openglinsights.com/">OpenGL Insights</a>.
 */  
vec2 czm_cellular(vec2 P)
// Cellular noise, returning F1 and F2 in a vec2.
// Standard 3x3 search window for good F1 and F2 values
{
#define K 0.142857142857 // 1/7
#define Ko 0.428571428571 // 3/7
#define jitter 1.0 // Less gives more regular pattern
    vec2 Pi = mod(floor(P), 289.0);
    vec2 Pf = fract(P);
    vec3 oi = vec3(-1.0, 0.0, 1.0);
    vec3 of = vec3(-0.5, 0.5, 1.5);
    vec3 px = _czm_permute289(Pi.x + oi);
    vec3 p = _czm_permute289(px.x + Pi.y + oi); // p11, p12, p13
    vec3 ox = fract(p*K) - Ko;
    vec3 oy = mod(floor(p*K),7.0)*K - Ko;
    vec3 dx = Pf.x + 0.5 + jitter*ox;
    vec3 dy = Pf.y - of + jitter*oy;
    vec3 d1 = dx * dx + dy * dy; // d11, d12 and d13, squared
    p = _czm_permute289(px.y + Pi.y + oi); // p21, p22, p23
    ox = fract(p*K) - Ko;
    oy = mod(floor(p*K),7.0)*K - Ko;
    dx = Pf.x - 0.5 + jitter*ox;
    dy = Pf.y - of + jitter*oy;
    vec3 d2 = dx * dx + dy * dy; // d21, d22 and d23, squared
    p = _czm_permute289(px.z + Pi.y + oi); // p31, p32, p33
    ox = fract(p*K) - Ko;
    oy = mod(floor(p*K),7.0)*K - Ko;
    dx = Pf.x - 1.5 + jitter*ox;
    dy = Pf.y - of + jitter*oy;
    vec3 d3 = dx * dx + dy * dy; // d31, d32 and d33, squared
    // Sort out the two smallest distances (F1, F2)
    vec3 d1a = min(d1, d2);
    d2 = max(d1, d2); // Swap to keep candidates for F2
    d2 = min(d2, d3); // neither F1 nor F2 are now in d3
    d1 = min(d1a, d2); // F1 is now in d1
    d2 = max(d1a, d2); // Swap to keep candidates for F2
    d1.xy = (d1.x < d1.y) ? d1.xy : d1.yx; // Swap if smaller
    d1.xz = (d1.x < d1.z) ? d1.xz : d1.zx; // F1 is in d1.x
    d1.yz = min(d1.yz, d2.yz); // F2 is now not in d2.yz
    d1.y = min(d1.y, d1.z); // nor in  d1.z
    d1.y = min(d1.y, d2.x); // F2 is in d1.y, we're done.
    return sqrt(d1.xy);
}

/*

// Cellular noise, returning F1 and F2 in a vec2 and the
// 2D vectors to each of the two closest points in a vec4.
// Standard 3x3 search window for good F1 and F2 values.
void czm_cellular(in vec2 P, out vec2 F, out vec4 d1d2)
{
#define K 0.142857142857 // 1/7
#define Ko 0.428571428571 // 3/7
#define jitter 1.0 // Less gives more regular pattern
    vec2 Pi = mod(floor(P), 289.0);
    vec2 Pf = fract(P);
    vec3 oi = vec3(-1.0, 0.0, 1.0);
    vec3 of = vec3(-0.5, 0.5, 1.5);
    vec3 px = _czm_permute289(Pi.x + oi);
    vec3 p = _czm_permute289(px.x + Pi.y + oi); // p11, p12, p13
    vec3 ox = fract(p*K) - Ko;
    vec3 oy = mod(floor(p*K),7.0)*K - Ko;
    vec3 d1x = Pf.x + 0.5 + jitter*ox;
    vec3 d1y = Pf.y - of + jitter*oy;
    vec3 d1 = d1x * d1x + d1y * d1y; // d11, d12 and d13, squared
    p = _czm_permute289(px.y + Pi.y + oi); // p21, p22, p23
    ox = fract(p*K) - Ko;
    oy = mod(floor(p*K),7.0)*K - Ko;
    vec3 d2x = Pf.x - 0.5 + jitter*ox;
    vec3 d2y = Pf.y - of + jitter*oy;
    vec3 d2 = d2x * d2x + d2y * d2y; // d21, d22 and d23, squared
    p = _czm_permute289(px.z + Pi.y + oi); // p31, p32, p33
    ox = fract(p*K) - Ko;
    oy = mod(floor(p*K),7.0)*K - Ko;
    vec3 d3x = Pf.x - 1.5 + jitter*ox;
    vec3 d3y = Pf.y - of + jitter*oy;
    vec3 d3 = d3x * d3x + d3y * d3y; // d31, d32 and d33, squared
    // Sort out the two smallest distances (F1, F2)
    // While also swapping dx and dy accordingly
    vec3 comp3 = step(d2, d1);
    vec3 d1a = mix(d1, d2, comp3);
    vec3 d1xa = mix(d1x, d2x, comp3);
    vec3 d1ya = mix(d1y, d2y, comp3);
    d2 = mix(d2, d1, comp3); // Swap to keep candidates for F2
    d2x = mix(d2x, d1x, comp3);
    d2y = mix(d2y, d1y, comp3);
  
    comp3 = step(d3, d2);
    d2 = mix(d2, d3, comp3); // neither F1 nor F2 are now in d3
    d2x = mix(d2x, d3x, comp3);
    d2y = mix(d2y, d3y, comp3);
  
    comp3 = step(d2, d1a);
    d1 = mix(d1a, d2, comp3); // F1 is now in d1
    d1x = mix(d1xa, d2x, comp3);
    d1y = mix(d1ya, d2y, comp3);
    d2 = mix(d2, d1a, comp3); // Swap to keep candidates for F2
    d2x = mix(d2x, d1xa, comp3);
    d2y = mix(d2y, d1ya, comp3);
  
    float comp1 = step(d1.y, d1.x);
    d1.xy = mix(d1.xy, d1.yx, comp1); // Swap if smaller
    d1x.xy = mix(d1x.xy, d1x.yx, comp1);
    d1y.xy = mix(d1y.xy, d1y.yx, comp1);
  
    comp1 = step(d1.z, d1.x);
    d1.xz = mix(d1.xz, d1.zx, comp1); // F1 is in d1.x
    d1x.xz = mix(d1x.xz, d1x.zx, comp1);
    d1y.xz = mix(d1y.xz, d1y.zx, comp1);
 
    vec2 comp2 = step(d2.yz, d1.yz);
    d1.yz = mix(d1.yz, d2.yz, comp2); // F2 is now not in d2.yz
    d1x.yz = mix(d1x.yz, d2x.yz, comp2);
    d1y.yz = mix(d1y.yz, d2y.yz, comp2);
  
    comp1 = step(d1.z, d1.y);
    d1.y = mix(d1.y, d1.z, comp1); // nor in  d1.z
    d1x.y = mix(d1x.y, d1x.z, comp1);
    d1y.y = mix(d1y.y, d1y.z, comp1);
 
    comp1 = step(d2.x, d1.y);
    d1.y = mix(d1.y, d2.x, comp1); // F2 is in d1.y, we're done.
    d1x.y = mix(d1x.y, d2x.x, comp1);
    d1y.y = mix(d1y.y, d2y.x, comp1);
    F = sqrt(d1.xy);
    d1d2 = vec4(d1x.x, d1y.x, d1x.y, d1y.y);
}

*/

#endif
