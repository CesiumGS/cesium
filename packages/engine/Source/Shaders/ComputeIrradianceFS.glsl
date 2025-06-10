uniform samplerCube u_radianceMap;

in vec2 v_textureCoordinates;


const float twoSqrtPi = 2.0 * sqrt(czm_pi);

// Coutesy of https://www.ppsloan.org/publications/StupidSH36.pdf
float computeShBasis(int index, vec3 s) {
    if (index == 0) { // l = 0, m = 0
        return 1.0 / twoSqrtPi;
    }
    
    if (index == 1) { // l = 1, m = -1
        return -sqrt(3.0) * s.y / twoSqrtPi;
    }

    if (index == 2) { // l = 1, m = 0
        return sqrt(3.0) * s.z / twoSqrtPi;
    }

    if (index == 3) { // l = 1, m = 1
        return -sqrt(3.0) * s.x / twoSqrtPi;
    }

    if (index == 4) { // l = 2, m = -2
        return sqrt(15.0) * s.y * s.x / twoSqrtPi;
    }

    if (index == 5) { // l = 2, m = -1
        return -sqrt(15.0) * s.y * s.z / twoSqrtPi;
    }

    if (index == 6) { // l = 2, m = 0
        return sqrt(5.0) * (3.0 * s.z * s.z - 1.0) / 2.0 / twoSqrtPi;
    }

    if (index == 7) { // l = 2, m = 1
        return -sqrt(15.0) * s.x * s.z / twoSqrtPi;
    }

    if (index == 8) { // l = 2, m = 2
        return sqrt(15.0) * (s.x * s.x - s.y * s.y) / 2.0 / twoSqrtPi;
    }

    return 0.0;
}

float vdcRadicalInverse(int i)
{
    float r;
    float base = 2.0;
    float value = 0.0;
    float invBase = 1.0 / base;
    float invBi = invBase;
    for (int x = 0; x < 100; x++)
    {
        if (i <= 0)
        {
            break;
        }
        r = mod(float(i), base);
        value += r * invBi;
        invBi *= invBase;
        i = int(float(i) * invBase);
    }
    return value;
}

vec2 hammersley2D(int i, int N)
{
    return vec2(float(i) / float(N), vdcRadicalInverse(i));
}

// Sample count is relatively low for the sake of performance, but should still be enough to capture directionality needed for third-order harmonics
const int samples = 256; 
const float solidAngle = 1.0 / float(samples);

void main() {
    // Get the current coefficient based on the uv
   vec2 uv = v_textureCoordinates.xy * 3.0;
   int coefficientIndex = int(floor(uv.y) * 3.0 + floor(uv.x));

    for (int i = 0; i < samples; ++i) {
        vec2 xi = hammersley2D(i, samples);
        float phi = czm_twoPi * xi.x;
        float cosTheta = 1.0 - 2.0 * sqrt(1.0 - xi.y * xi.y);
        float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
        vec3 direction = normalize(vec3(sinTheta * cos(phi), cosTheta, sinTheta * sin(phi)));

        // Generate the spherical harmonics basis from the direction
        float Ylm = computeShBasis(coefficientIndex, direction);

        vec3 lookupDirection = -direction.xyz;
        lookupDirection.z = -lookupDirection.z;

        vec4 color = czm_textureCube(u_radianceMap, lookupDirection, 0.0);

        // Use the relevant function for this coefficient
        out_FragColor += Ylm * color * solidAngle * sinTheta;
    }
    
}
