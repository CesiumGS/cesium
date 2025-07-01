/**
 * Implements a 3D Gaussian splatting algorithm with hybrid transparency.
 * Based on the article "Efficient Perspective-Correct 3D Gaussian Splatting Using Hybrid Transparency"
 * by Hahlbohm et al., Computer Graphics Forum, 2025 (DOI: 10.1111/cgf.70014)..
 */
 //https://github.com/fhahlbohm/depthtested-gaussian-raytracing-webgl

// corresponds to 2 sigma
#define MIN_ALPHA_THRESHOLD_RCP 7.38905609893f // 1 / exp(-4/2)
#define MAX_CUTOFF2 4.0f // log(MIN_ALPHA_THRESHOLD_RCP * MIN_ALPHA_THRESHOLD_RCP)
#define MIN_ALPHA_THRESHOLD (1.0f / MIN_ALPHA_THRESHOLD_RCP)

vec4 getViewZColumn() {
    return vec4(
        czm_modelView[0][2],
        czm_modelView[1][2],
        czm_modelView[2][2],
        czm_modelView[3][2]
    );
}

out vec4 VPMT1, VPMT2, VPMT4, MT3, rgba;

void main () {
    int instanceID = gl_InstanceID;
    int row = instanceID / 2048;
    int col = (instanceID % 2048) * 4;
    vec4 T1 = texelFetch(u_splatAttributeTexture, ivec2(col, row), 0);
    vec4 T2 = texelFetch(u_splatAttributeTexture, ivec2(col + 1, row), 0);
    vec4 T3 = texelFetch(u_splatAttributeTexture, ivec2(col + 2, row), 0);
    rgba = texelFetch(u_splatAttributeTexture, ivec2(col + 3, row), 0);
    mat4 T = mat4(T1, T2, T3, vec4(0.0f, 0.0f, 0.0f, 1.0f));

    vec4 mean = vec4(T1.w, T2.w, T3.w, 1.0f);
      vec4 splatViewPos = czm_modelView * vec4(mean.xyz, 1.0);
    vec4 clipPosition = czm_projection * splatViewPos;

    vec4 M3 = getViewZColumn();
    float z_view = dot(M3, clipPosition);
   // if (z_view < czm_currentFrustum.x || z_view > czm_currentFrustum.y) return;

    mat4 PMT =  T * czm_viewProjection;
    vec4 PMT1 = PMT[0];
    vec4 PMT2 = PMT[1];
    vec4 PMT3 = PMT[2];
    vec4 PMT4 = PMT[3];

    float rho_cutoff = 2.0f * log(rgba.a * MIN_ALPHA_THRESHOLD_RCP);
    vec4 t = vec4(rho_cutoff, rho_cutoff, rho_cutoff, -1.0f);
    float d = dot(t, PMT4 * PMT4);
  //  if (d == 0.0f) return;
    vec4 f = (1.0f / d) * t;

    float center_z = dot(f, PMT3 * PMT4);
    float extent_z = sqrt(max(center_z * center_z - dot(f, PMT3 * PMT3), 0.0f));
  //  if ((center_z - extent_z) <= -1.0f || (center_z + extent_z) >= 1.0f) return;

    vec2 center = vec2(dot(f, PMT1 * PMT4), dot(f, PMT2 * PMT4));
    vec2 extent = sqrt(max(center * center - vec2(dot(f, PMT1 * PMT1), dot(f, PMT2 * PMT2)), 0.0f));

    gl_Position = vec4((center + extent * a_screenQuadPosition), 0.0f, 1.0f);

    vec2 halfWH = czm_viewport.zw / 2.0;
    VPMT1 = halfWH.x * (PMT[0] + PMT[3]);
    VPMT2 = halfWH.y * (PMT[1] + PMT[3]);
    VPMT4 = PMT[3];
    MT3 = vec4(mat3(T) * M3.xyz, z_view);
}
