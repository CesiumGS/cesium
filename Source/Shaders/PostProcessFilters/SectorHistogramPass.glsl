#extension GL_EXT_frag_depth : enable
#extension GL_EXT_draw_buffers : enable

#define TAU 6.28318530718
#define PI 3.14159265359
#define PI_4 0.785398163
#define C0 1.57073
#define C1 -0.212053
#define C2 0.0740935
#define C3 -0.0186166
#define EPS 1e-6
#define maxAngle 1.57079632679  // The maximum sector angle is PI / 2
#define numSectors 8

varying float centerPos;

// This texture actually contains eye-space coordinates,
// it just has to be called `pointCloud_depthTexture`
uniform sampler2D pointCloud_depthTexture;

float acosFast(in float inX) {
    float x = abs(inX);
    float res = ((C3 * x + C2) * x + C1) * x + C0; // p(x)
    res *= sqrt(1.0 - x);

    return (inX >= 0.0) ? res : PI - res;
}

float atanFast(in float x) {
    return PI_4 * x - x * (abs(x) - 1.0) * (0.2447 + 0.0663 * abs(x));
}

float atan2(in float y, in float x) {
    return x == 0.0 ? sign(y) * PI / 2.0 : atan(y, x);
}

int getSector(in vec2 d) {
    float angle = (atan2(float(d.y), float(d.x)) + PI) / TAU;
    return int(angle * float(numSectors));
}

// Subsamples the neighbor pixel and stores the sector number
// in each component of the output
ivec4 getSectors(in vec2 vi) {
    return ivec4(getSector(vi + vec2(-0.5, 0.5)),
                 getSector(vi + vec2(0.5, -0.5)),
                 getSector(vi + vec2(0.5, 0.5)),
                 getSector(vi + vec2(-0.5, -0.5)));
}

ivec2 collapseSectors(in ivec4 sectors) {
    int first = sectors[0];
    ivec2 collapsed = ivec2(first, first);
    for (int i = 1; i < 4; i++)
        if (sectors[i] != first)
            collapsed.y = sectors[i];
    return collapsed;
}

void updateOutput(in int index,
                  in float value,
                  inout vec4 sh0,
                  inout vec4 sh1) {
    // We could conditionally write out to gl_FragData here,
    // however on hardware that doesn't support dynamic branching
    // that would perform 8 writes instead of 1! So we write out
    // to a dummy variable and then copy that over
    if (index < 4) {
        if (index < 2) {
            if (index == 0) {
                sh0.x = value;
            } else {
                sh0.y = value;
            }
        } else {
            if (index == 2) {
                sh0.z = value;
            } else {
                sh0.w = value;
            }
        }
    } else {
        if (index < 6) {
            if (index == 4) {
                sh1.x = value;
            } else {
                sh1.y = value;
            }
        } else {
            if (index == 6) {
                sh1.z = value;
            } else {
                sh1.w = value;
            }
        }
    }
}

void main() {
    vec2 v_textureCoordinates = gl_FragCoord.xy / czm_viewport.zw;

    ivec2 centerScreenSpace = ivec2(gl_FragCoord.xy);

    // The position of the neighbor in 3D (eye space)
    vec3 centerPosition = texture2D(pointCloud_depthTexture,
                                    v_textureCoordinates).xyz;

    ivec2 neighborScreenSpace = ivec2(int(mod(centerPos, czm_viewport.z)),
                                      int(centerPos) / int(czm_viewport.z));
    vec2 neighborTextureSpace = vec2(neighborScreenSpace) / czm_viewport.zw;

    // The position of this neighborhood center in 3D (eye space)
    vec3 neighborPosition = texture2D(pointCloud_depthTexture,
                                      neighborTextureSpace).xyz;

    // If our horizon pixel doesn't exist, ignore it and move on
    if (length(neighborPosition) < EPS ||
            neighborScreenSpace == centerScreenSpace) {
        gl_FragData[0] = vec4(1.0);
        gl_FragData[1] = vec4(1.0);
        return;
    }

    // Right now this is obvious because everything happens in eye space,
    // but this kind of statement is nice for a reference implementation
    vec3 viewer = vec3(0.0);

    // d is the relative offset from the horizon pixel to the center pixel
    // in 2D
    ivec2 d = neighborScreenSpace - centerScreenSpace;

    // sectors contains both possible sectors that the
    // neighbor pixel could be in
    ivec2 sectors = collapseSectors(getSectors(vec2(d)));

    // This is the offset of the horizon point from the center in 3D
    // (a 3D analog of d)
    vec3 c = neighborPosition - centerPosition;

    // Now we calculate the dot product between the vector
    // from the viewer to the center and the vector to the horizon pixel.
    // We normalize both vectors first because we only care about their relative
    // directions
    // TODO: Redo the math and figure out whether the result should be negated or not
    float dotProduct = dot(normalize(viewer - centerPosition),
                           normalize(c));

    // We calculate the angle that this horizon pixel would make
    // in the cone. The dot product is be equal to
    // |vec_1| * |vec_2| * cos(angle_between), and in this case,
    // the magnitude of both vectors is 1 because they are both
    // normalized.
    float angle = acos(dotProduct);

    // This horizon point is behind the current point. That means that it can't
    // occlude the current point. So we ignore it and move on.
    if (angle > maxAngle || angle < 0.0) {
        gl_FragData[0] = vec4(1.0);
        gl_FragData[1] = vec4(1.0);
        return;
    }

    // Normalize to [0, 1]
    angle /= maxAngle;

    vec4 sh0 = vec4(1.0);
    vec4 sh1 = vec4(1.0);

    updateOutput(sectors.x, angle, sh0, sh1);
    updateOutput(sectors.y, angle, sh0, sh1);

    gl_FragData[0] = vec4(sh0);
    gl_FragData[1] = vec4(sh1);
}
