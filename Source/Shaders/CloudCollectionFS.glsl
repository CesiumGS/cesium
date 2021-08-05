varying vec2 v_textureCoordinates;
varying vec2 v_scale;
varying vec3 v_positionHigh;
varying vec3 v_positionLow;
varying vec3 v_position;

vec3 quintic(vec3 t) {
    vec3 t3 = t * t * t;
    vec3 t4 = t * t3;
    vec3 t5 = t * t4;
    return 6.0 * t5 - 15.0 * t4 + 10.0 * t3;
}

float random(vec3 p) {
    return fract(sin(p.x * p.y) * 2.0 + cos(p.z) + sin(p.z));
}

vec3 random3(vec3 p) {
    float dot1 = dot(p, vec3(127.1, 311.7, 932.8));
    float dot2 = dot(p, vec3(269.5, 183.3, 421.4));
    return fract(vec3(sin(dot1 - dot2), cos(dot1 * dot2), dot1 * dot2));
}

vec3 getPerlinDirection(vec3 p) {
    int i = int(random(p) * 16.0);
    if(i == 0) {
        return vec3(1, 1, 0);
    } else if(i == 1) {
        return vec3(-1, 1, 0);
    } else if(i == 2) {
        return vec3(1, -1, 0);
    } else if(i == 3) {
        return vec3(-1, -1, 0);
    } else if(i == 4) {
        return vec3(1, 0, 1);
    } else if(i == 5) {
        return vec3(-1, 0, 1);
    } else if(i == 6) {
        return vec3(1, 0, -1);
    } else if(i == 7) {
        return vec3(-1, 0, -1);
    } else if(i == 8) {
        return vec3(0, 1, 1);
    } else if(i == 9) {
        return vec3(0, -1, 1);
    } else if(i == 10) {
        return vec3(0, 1, -1);
    } else if(i == 11) {
        return vec3(0, -1, -1);
    } else if(i == 12) {
        return vec3(1, 1, 0);
    } else if(i == 13) {
        return vec3(-1, 1, 0);
    } else if(i == 14) {
        return vec3(0, -1, 1);
    } else {
        return vec3(0, -1, -1);
    } 
}

float perlinNoise(vec3 p) {
    float noise = 0.0;
    vec3 cell = floor(p);
    for(float z = 0.0; z <= 1.0; z++) {
        for(float y = 0.0; y <= 1.0; y++) {
            for(float x = 0.0; x <= 1.0; x++) {
                vec3 corner = cell + vec3(x, y, z);
                vec3 cornerToPoint = p - corner;
                vec3 randomDir = getPerlinDirection(corner);
                vec3 falloff = vec3(1.0) - quintic(abs(cornerToPoint));

                float value = dot(cornerToPoint, randomDir);
                noise += value * falloff.x * falloff.y * falloff.z;
            } 
        }
    }
    return noise;
}

// "Frequency" corresponds to smaller cell sizes.
vec3 getWorleyCellPoint(vec3 cell, float freq) {
    vec3 p = cell + random3(cell);
    return p / freq;
}

float worleyNoise(vec3 p, float freq) {
    vec3 centerCell = floor(p * freq);
    float shortestDistance = 10.0 / freq;

    for(float z = -1.0; z <= 1.0; z++) {
        for(float y = -1.0; y <= 1.0; y++) {
            for(float x = -1.0; x <= 1.0; x++) {
                vec3 cell = centerCell + vec3(x, y, z);
                vec3 point = getWorleyCellPoint(cell, freq);

                // compare to previous distances
                float distance = length(p - point);
                if(distance < shortestDistance) {
                    shortestDistance = distance;
                }
            }
        }
    }

    return shortestDistance;
}

const float MAX_ITERATIONS = 10.0;
float perlinFBMNoise(vec3 p, float octaves, float scale) {
    float noise = 0.0;
    float freq = 1.0 * scale;
    float persistence = 1.0;
    for(float i = 0.0; i < MAX_ITERATIONS; i++) {
        if(i >= octaves) {
            break;
        }
        
        noise += perlinNoise(p * freq) * persistence;
        persistence *= 0.7;
        freq *= 2.0;
    }
    return noise;
}

float worleyFBMNoise(vec3 p, float octaves, float scale) {
    float noise = 0.0;
    float freq = 1.0;
    float persistence = 0.625;
    for(float i = 0.0; i < MAX_ITERATIONS; i++) {
        if(i >= octaves) {
            break;
        }
        
        noise += worleyNoise(p * scale, freq * scale) * persistence;
        persistence *= 0.5;
        freq *= 2.0;
    }
    return noise;
}

// Assumes the sphere is a unit sphere with radius 0.5 at center (0, 0, 0).
bool intersectSphere(vec3 origin, vec3 dir, out vec3 point, out vec3 normal) {
    // Rewrite sphere equation as variables in quadratic formula
    // where t is the solution (point = origin + t * dir)
    float A = dot(dir, dir);
    float B = 2.0 * dot(origin, dir);
    float C = dot(origin, origin) - 0.25;
    float discriminant = (B * B) - (4.0 * A * C);
    if(discriminant < 0.0) {
        return false;
    }
    float t = (-B - sqrt(discriminant)) / (2.0 * A);
    if(t < 0.0) {
        t = (-B + sqrt(discriminant)) / (2.0 * A);
    }
    point = origin + t * dir;
    normal = normalize(point);
    return true;
}

bool intersectEllipsoid(vec3 origin, vec3 dir, vec3 center, vec3 scale,
                        out vec3 point, out vec3 normal) {
    if(scale.x <= 0.0 || scale.y <= 0.0 || scale.z < 0.0) {
        return false;
    }

    // transform origin and dir to local sphere space
    vec3 o = (origin - center) / scale;
    vec3 d = dir / scale;
    vec3 p, n;
    bool intersected = intersectSphere(o, d, p, n);
    if(intersected) {
        // transform local space point + normal back to world space
        point = (p * scale) + center;
        normal = n;
    }
    return intersected;
}

#define M_PI 3.1415927
// Assume that if phase shift is being called for octave i,
// the frequency is of i - 1. This saves us from doing extra
// division / multiplication operations.
vec2 phaseShift2D(vec2 p, vec2 freq) {
    return (M_PI / 2.0) * sin(freq.yx * p.yx); 
}

vec2 phaseShift3D(vec3 p, vec2 freq) {
    return phaseShift2D(p.xy, freq) + M_PI * vec2(sin(freq.x * p.z));
}

// The cloud texture function in Gardner's paper.
const float T0  = 0.58;  // contrast of the texture pattern
const float k   = 0.1; // computed to produce a maximum value of 1 
const float C0  = 0.8;  // coefficient
const float FX0 = 0.6;  // frequency X
const float FY0 = 0.6;  // frequency Y

const int octaves = 5;

float T(vec3 point) {
    vec2 sum = vec2(0.0);
    float Ci = C0;
    vec2 FXY = vec2(FX0, FY0);
    vec2 PXY = vec2(0.0);
    for(int i = 1; i <= octaves; i++) {
        PXY = phaseShift3D(point, FXY);
        Ci *= 0.707;
        FXY *= 2.0;
        vec2 sinTerm = sin(FXY * point.xy + PXY);
        sum += Ci * sinTerm + vec2(T0);
    }
    return k * sum.x * sum.y;
}

const float a = 0.3; // fraction of surface reflection due to ambient or scattered light, 
const float t = 0.3; // fraction of texture shading 
const float s = 0.10; // fraction of specular reflection

float I(float Id, float Is, float It) {
    return (1.0 - a) * ((1.0 - t) * ((1.0 - s) * Id + s * Is) + t * It) + a;
}

const float T1 = 0.2;
const float T2 = 0.5;

const vec3 lightDir = normalize(vec3(0.2, -1.0, 0.5));

//float TR = 1.0 - (It - T1) / It; // 2D translucency
// 1.0 - (It - T1 - (T2 - T1) * (1.0 - nvDot) / It;
vec4 drawCloud(vec3 rayOrigin, vec3 rayDir, vec3 cloudCenter, vec3 cloudScale) {
    vec3 cloudPoint, cloudNormal;
    if(!intersectEllipsoid(rayOrigin, rayDir, cloudCenter, cloudScale,
                            cloudPoint, cloudNormal)) {
        return vec4(0.0);
    }

    float ndDot = clamp(dot(cloudNormal, -rayDir), 0.0, 1.0);
    float Id = clamp(dot(cloudNormal, -lightDir), 0.0, 1.0);  // diffuse reflection
    float Is = max(pow(dot(-lightDir, -rayDir), 2.0), 0.0);   // specular reflection
    float It = T(cloudPoint);                                 // texture function
    float intensity = I(Id, Is, It);
    vec3 color = intensity * vec3(1.0);

    float W = worleyFBMNoise(cloudPoint, 3.0, 1.0);
    float W2 = worleyFBMNoise(cloudPoint, 3.0, 2.0);
    float W3 = worleyFBMNoise(cloudPoint, 3.0, 3.0);
    float TR = pow(ndDot, 3.0) - W;
    float heightSignal = clamp((cloudPoint.y + cloudScale.y) / cloudScale.y, 0.0, 1.0);//(cloudPoint.y - cloudCenter.y) / cloudScale.y + 0.5;
    TR *= heightSignal * heightSignal + 1.5;
    TR -= 1.2 * W2 - ndDot * W3;
    return vec4(color, clamp(TR, 0.0, 1.0));
}


const int MAX_STEPS = 40;
vec4 drawCloud2(vec3 rayOrigin, vec3 rayDir, vec3 cloudCenter, vec3 cloudScale) {
    vec3 cloudPoint, cloudNormal;
    if(!intersectEllipsoid(rayOrigin, rayDir, cloudCenter, cloudScale,
                            cloudPoint, cloudNormal)) {
        return vec4(0.0);
    }

    float ndDot = clamp(dot(cloudNormal, -rayDir), 0.0, 1.0);
    float Id = clamp(dot(cloudNormal, -lightDir), 0.0, 1.0);  // diffuse reflection
    float Is = max(pow(dot(-lightDir, -rayDir), 2.0), 0.0);   // specular reflection
    float It = T(cloudPoint);                                 // texture function
    float intensity = I(Id, Is, It);
    vec3 color = intensity * vec3(1.0);

    float stepSize = 2.0 * cloudScale.z / float(MAX_STEPS);
    float t = -1.0;
    float alpha = 0.0;
    for(int i = 0; i < MAX_STEPS; i++) {
        if(alpha > 0.95) {
            break;
        }
        vec3 p = cloudPoint + t * rayDir;

        float P = perlinFBMNoise(cloudPoint, 4.0, 0.5);
        float W = worleyFBMNoise(cloudPoint, 3.0, 1.0);
        float PW = (1.0 - W * 1.1) * (1.0 - P);
        alpha += (1.0 - PW) * 0.05;
        t += stepSize;
    }
    
    //float ndDotPow = pow(ndDot, 3.0);
    //float W2 = worleyFBMNoise(cloudPoint, 3.0, 1.0);
    //float W3 = worleyFBMNoise(cloudPoint, 3.0, 2.0);
    //TR = ndDotPow - W;
    //TR -= (1.0 - pow(ndDot, 0.5)) * W2;
    //TR -= W + (0.5 - ndDotPow) * W2;
    return vec4(color, clamp(alpha, 0.0, 1.0));
}

void main() {
    // To avoid calculations with high values, we raycast from an artificially
    // smaller space.
    vec2 offset = v_scale * v_textureCoordinates;
    vec3 position = v_positionHigh + v_positionLow;
    vec3 eye = vec3(0, 0, -10);//czm_view[3].xyz;
    vec3 rayDir = normalize(vec3(offset, 1.0) - eye);
    vec3 rayOrigin = eye;

    vec3 ellipsoidScale = 0.5 * vec3(v_scale, min(v_scale.x, v_scale.y));
    vec3 ellipsoidCenter = vec3(0);//center;

    vec4 cloud = drawCloud(rayOrigin, rayDir, ellipsoidCenter, ellipsoidScale);
    if(cloud.w < 0.01) {
        discard;
    }

    gl_FragColor = cloud;
}