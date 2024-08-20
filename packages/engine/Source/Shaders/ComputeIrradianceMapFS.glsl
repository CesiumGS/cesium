uniform samplerCube u_radianceMap;

in vec2 v_textureCoordinates;

int SHindex(int m, int l) {
    return l * (l + 1) + m;
}

float factorial(int n) {
    float res = 1.0;
    for (int i = 2; i <= n; ++i)
        res *= float(i);
    return res;
}

float normalization(int l, int m) {
    return sqrt((2.0 * float(l) + 1.0) / (4.0 * czm_pi) * factorial(l - abs(m)) / factorial(l + abs(m)));
}

void computeShBasis(inout float SHb[9], vec3 s) {
    int numBands = 3;
    float Pml_2 = 0.0;
    float Pml_1 = 1.0;
    SHb[SHindex(0, 0)] = Pml_1 * normalization(0, 0);
    for (int l = 1; l < numBands; l++) {
        float Pml = ((2.0 * float(l) - 1.0) * Pml_1 * s.z - float(l - 1) * Pml_2) / float(l);
        Pml_2 = Pml_1;
        Pml_1 = Pml;
        SHb[SHindex(0, l)] = normalization(l, 0) * Pml;
    }
    
    float Pmm = 1.0;
    for (int m = 1; m < numBands; m++) {
        Pmm *= (1.0 - 2.0 * float(m)) * Pmm;
        float Pml_2 = Pmm;
        float Pml_1 = (2.0 * float(m) + 1.0) * Pmm * s.z;
        SHb[SHindex(-m, m)] = normalization(m, -m) * Pml_2;
        SHb[SHindex(m, m)] = normalization(m, m) * Pml_2;
        if (m + 1 < numBands) {
            SHb[SHindex(-m, m + 1)] = normalization(m + 1, -m) * Pml_1;
            SHb[SHindex(m, m + 1)] = normalization(m + 1, m) * Pml_1;
            for (int l = m + 2; l < numBands; l++) {
                float Pml = ((2.0 * float(l) - 1.0) * Pml_1 * s.z - float(l + m - 1) * Pml_2) / float(l - m);
                Pml_2 = Pml_1;
                Pml_1 = Pml;
                SHb[SHindex(-m, l)] = normalization(l, -m) * Pml;
                SHb[SHindex(m, l)] = normalization(l, m) * Pml;
            }
        }
    }
    
    float Cm = s.x;
    float Sm = s.y;
    for (int m = 1; m < numBands; m++) {
        for (int l = m; l < numBands; l++) {
            SHb[SHindex(-m, l)] *= Sm;
            SHb[SHindex(m, l)] *= Cm;
        }
        float Cm1 = Cm * s.x - Sm * s.y;
        float Sm1 = Sm * s.x + Cm * s.y;
        Cm = Cm1;
        Sm = Sm1;
    }
}

vec2 uvToSpherical(vec2 uv) {
    float phi = uv.x * 2.0 * czm_pi;
    float theta = uv.y * czm_pi;
    return vec2(theta, phi);
}

vec2 directionToSpherical(vec3 direction) {
    float theta = acos(direction.z);
    float phi = czm_fastApproximateAtan(direction.y, direction.x);
    return vec2(theta, phi);
}

vec3 generateDirection(int index, int total) {
    float x, y, z, phi, cosTheta, sinTheta;
    float goldenAngle = czm_pi * (3.0 - sqrt(5.0));
    phi = float(index) * goldenAngle;
    z = 1.0 - 2.0 * float(index) / float(total);
    sinTheta = sqrt(1.0 - z * z);
    x = cos(phi) * sinTheta;
    y = sin(phi) * sinTheta;
    return normalize(vec3(x, y, z));
}

void main() {
    // Get the current coefficient based on the uv
    int coefficientIndex = int(floor(v_textureCoordinates.x * 3.0) + floor(v_textureCoordinates.y * 3.0) * 3.0); 
   int samples = 512;
    float solidAngle = 1.0 / float(samples);

    for (int i = 0; i < samples; ++i) {
        vec3 direction = generateDirection(i, samples);

        // Generate the spherical harmonics basis function from the direction
        float SHb[9]; 
        computeShBasis(SHb, direction);

        // Sample the color from the specular environment map
        vec3 lookupDirection = vec3(-direction.x, -direction.y, direction.z);
        vec4 color = czm_textureCube(u_radianceMap, lookupDirection, 0.0);

        // Use the relevant function for this coefficient
        float Ylm = SHb[coefficientIndex];
        out_FragColor += Ylm * color * solidAngle;
    }
}
