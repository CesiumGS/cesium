uniform sampler2D u_level1normalMap;
uniform sampler2D u_level2normalMap;
uniform sampler2D u_level3normalMap;
uniform sampler2D u_level4normalMap;
uniform sampler2D u_level5normalMap;
uniform float u_accumulationStartTime;
uniform float u_accumulationEndTime;


//IMAGE_SIZE is the size of the image used for Random noise
const float IMAGE_SIZE = 256.;

// FRACTION_NOISE is the fraction of the noise to use to modify the blend coefficient.
const float FRACTION_NOISE = 0.3;
const float PERSISTANCE =  0.6;

// orders are the number of orders to sum
const float  ORDERS = 3.;


// the base noise functions came from Ian McEwan and Stephan Gustavson.
// Using this code to generate noise was from Yuxin Hu, Anton Khabbaz, and YaoYi
//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
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

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
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
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}


// returns the x - n * scale where n is the
// largest integer that keeps x positive
// scale should be positive.
//
// takes the fractional part of pos ( pos - floor(pos))
// which is guaranteed to be between 0 and 1 and scale it
// by scale

vec3  ScaleCoordinate(vec3 pos, float scale)
{
         return fract(pos) * scale;
}

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
	float snowSlope = materialInput.slope;
	material.alpha = snowSlope;
    material.diffuse = vec3(0.8, 0.8, 0.9);
    material.shininess = 200.0;
    float snowAccumulation = 0.0;

    float interval = u_accumulationEndTime - u_accumulationStartTime;
    float lapse = czm_frameNumber - u_accumulationStartTime;
    if(lapse < 1.5 * interval){
        snowAccumulation = lapse / interval;
    }else{
        snowAccumulation = 1.5;
    }

    vec3 normalMapNormal = vec3(0.0, 0.0, 1.0);
    if(snowAccumulation < 0.3){
        normalMapNormal = texture2D(u_level1normalMap, materialInput.st).rgb;
    }else if(snowAccumulation < 0.7){
        normalMapNormal = texture2D(u_level2normalMap, materialInput.st).rgb;
    }else if(snowAccumulation < 1.0){
        normalMapNormal = texture2D(u_level3normalMap, materialInput.st).rgb;
    }else if(snowAccumulation < 1.3){
        normalMapNormal = texture2D(u_level4normalMap, materialInput.st).rgb;
    }else{
        normalMapNormal = texture2D(u_level5normalMap, materialInput.st).rgb;
    }

    mat3 tangentToEye = materialInput.tangentToEyeMatrix;
    material.normal  = tangentToEye * normalMapNormal;

    material.specular = 0.9;

    // now this is really the model coordinate position
    vec3 posCoord = materialInput.positionToEyeEC.xzy;
    posCoord /= czm_entireFrustum.y/10.0;
    float noiseval = 0.;
    for(float idx = 0.; idx < ORDERS; ++idx)
    {
	    // take multiples of the position coordinate
	    // to sample different regions of the texture
	    vec3 posScaled = idx * posCoord;
	    float amplitude = pow (PERSISTANCE, idx);
	    posScaled = amplitude * ScaleCoordinate(posCoord, IMAGE_SIZE);
	    noiseval += snoise(posScaled);
    }
    material.alpha += FRACTION_NOISE * noiseval;
    material.alpha *= snowAccumulation;
    return material;
}


