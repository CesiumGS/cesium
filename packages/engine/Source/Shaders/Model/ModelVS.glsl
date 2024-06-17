precision highp float;

out float depth;
out vec3 con;
out vec2 xy;
out vec2 pixf;
out vec4 v_position;
out vec3 v_cov2d;

out vec2 v_eigen1;
out vec2 v_eigen2;
out float v_lambda1;
out float v_lambda2;

czm_modelVertexOutput defaultVertexOutput(vec3 positionMC) {
    czm_modelVertexOutput vsOutput;
    vsOutput.positionMC = positionMC;
    vsOutput.pointSize = 1.0;
    return vsOutput;
}

void calcCov3D(vec3 scale, vec4 rot, float mod, out float[6] cov3D)
{
    mat3 S = mat3(
        mod * scale[0], 0, 0,
        0, mod * scale[1], 0,
        0, 0, mod * scale[2]
    );

    float x = rot.x;
    float y = rot.y;
    float z = rot.z;
    float w = rot.w;
    mat3 R = mat3(
        1.-2.*(y*y + z*z),   2.*(x*y - w*z),   2.*(x*z + w*y),
        2.*(x*y + w*z), 1.-2.*(x*x + z*z),   2.*(y*z - w*x),
        2.*(x*z - w*y),   2.*(y*z + w*x), 1.-2.*(x*x + y*y)
    );

    mat3 M = S * R;
    mat3 Sigma = transpose(M) * M;

    //we only need part of it, symmetric
    cov3D = float[6](
        Sigma[0][0], Sigma[0][1], Sigma[0][2],
        Sigma[1][1], Sigma[1][2], Sigma[2][2]
    );

}

vec3 calcCov2D(vec3 posEC, float focal_x, float focal_y, float tan_fovx, float tan_fovy, float[6] cov3D, mat4 viewmatrix) {
    vec4 t = viewmatrix * vec4(posEC, 1.0);
    mat3 J = mat3(
        focal_x / t.z, 0, -(focal_x * t.x) / (t.z * t.z),
        0, focal_y / t.z, -(focal_y * t.y) / (t.z * t.z),
        0, 0, 0
    );

    mat3 W =  mat3(
        viewmatrix[0][0], viewmatrix[1][0], viewmatrix[2][0],
        viewmatrix[0][1], viewmatrix[1][1], viewmatrix[2][1],
        viewmatrix[0][2], viewmatrix[1][2], viewmatrix[2][2]
    );

    mat3 T = W * J;

    mat3 Vrk = mat3(
        cov3D[0], cov3D[1], cov3D[2],
        cov3D[1], cov3D[3], cov3D[4],
        cov3D[2], cov3D[4], cov3D[5]
    );

    mat3 cov = transpose(T) * transpose(Vrk) * T;

    cov[0][0] += .3;
    cov[1][1] += .3;
    return vec3(cov[0][0], cov[0][1], cov[1][1]);
}

float ndc2Pix(float v, float S) {
    return ((v + 1.) * S - 1.) * .5;
}




void main()
{
    // Initialize the attributes struct with all
    // attributes except quantized ones.
    ProcessedAttributes attributes;
    initializeAttributes(attributes);

    // Dequantize the quantized ones and add them to the
    // attributes struct.
    #ifdef USE_DEQUANTIZATION
    dequantizationStage(attributes);
    #endif

    #ifdef HAS_MORPH_TARGETS
    morphTargetsStage(attributes);
    #endif

    #ifdef HAS_SKINNING
    skinningStage(attributes);
    #endif

    #ifdef HAS_PRIMITIVE_OUTLINE
    primitiveOutlineStage();
    #endif

    // Compute the bitangent according to the formula in the glTF spec.
    // Normal and tangents can be affected by morphing and skinning, so
    // the bitangent should not be computed until their values are finalized.
    #ifdef HAS_BITANGENTS
    attributes.bitangentMC = normalize(cross(attributes.normalMC, attributes.tangentMC) * attributes.tangentSignMC);
    #endif

    FeatureIds featureIds;
    featureIdStage(featureIds, attributes);

    #ifdef HAS_SELECTED_FEATURE_ID
    SelectedFeature feature;
    selectedFeatureIdStage(feature, featureIds);
    // Handle any show properties that come from the style.
    cpuStylingStage(attributes.positionMC, feature);
    #endif

    #if defined(USE_2D_POSITIONS) || defined(USE_2D_INSTANCING)
    // The scene mode 2D pipeline stage and instancing stage add a different
    // model view matrix to accurately project the model to 2D. However, the
    // output positions and normals should be transformed by the 3D matrices
    // to keep the data the same for the fragment shader.
    mat4 modelView = czm_modelView3D;
    mat3 normal = czm_normal3D;
    #else
    // These are used for individual model projection because they will
    // automatically change based on the scene mode.
    mat4 modelView = czm_modelView;
    mat3 normal = czm_normal;
    #endif

    // Update the position for this instance in place
    #ifdef HAS_INSTANCING

        // The legacy instance stage is used when rendering i3dm models that
        // encode instances transforms in world space, as opposed to glTF models
        // that use EXT_mesh_gpu_instancing, where instance transforms are encoded
        // in object space.
        #ifdef USE_LEGACY_INSTANCING
        mat4 instanceModelView;
        mat3 instanceModelViewInverseTranspose;

        legacyInstancingStage(attributes, instanceModelView, instanceModelViewInverseTranspose);

        modelView = instanceModelView;
        normal = instanceModelViewInverseTranspose;
        #else
        instancingStage(attributes);
        #endif

        #ifdef USE_PICKING
        v_pickColor = a_pickColor;
        #endif

    #endif

    Metadata metadata;
    MetadataClass metadataClass;
    MetadataStatistics metadataStatistics;
    metadataStage(metadata, metadataClass, metadataStatistics, attributes);

    #ifdef HAS_VERTICAL_EXAGGERATION
    verticalExaggerationStage(attributes);
    #endif

    #ifdef HAS_CUSTOM_VERTEX_SHADER
    czm_modelVertexOutput vsOutput = defaultVertexOutput(attributes.positionMC);
    customShaderStage(vsOutput, attributes, featureIds, metadata, metadataClass, metadataStatistics);
    #endif

    // Compute the final position in each coordinate system needed.
    // This returns the value that will be assigned to gl_Position.
    vec4 positionClip = geometryStage(attributes, modelView, normal);

    // This must go after the geometry stage as it needs v_positionWC
    #ifdef HAS_ATMOSPHERE
    atmosphereStage(attributes);
    #endif

    #ifdef ENABLE_CLIPPING_POLYGONS
    modelClippingPolygonsStage(attributes);
    #endif

    #ifdef HAS_SILHOUETTE
    silhouetteStage(attributes, positionClip);
    #endif

    #ifdef HAS_POINT_CLOUD_SHOW_STYLE
    float show = pointCloudShowStylingStage(attributes, metadata);
    #else
    float show = 1.0;
    #endif

    #ifdef HAS_POINT_CLOUD_BACK_FACE_CULLING
    show *= pointCloudBackFaceCullingStage();
    #endif

    #ifdef HAS_POINT_CLOUD_COLOR_STYLE
    v_pointCloudColor = pointCloudColorStylingStage(attributes, metadata);
    #endif

    #ifdef PRIMITIVE_TYPE_POINTS

    #ifdef HAS_CUSTOM_VERTEX_SHADER
    gl_PointSize = vsOutput.pointSize;
    #elif defined(HAS_POINT_CLOUD_POINT_SIZE_STYLE) || defined(HAS_POINT_CLOUD_ATTENUATION)
    gl_PointSize = pointCloudPointSizeStylingStage(attributes, metadata);
    #else
    gl_PointSize = 1.0;
    #endif
    gl_PointSize *= show;
    #endif

    #ifdef HAS_POINT_CLOUD_SPLAT

    //convert gaussian scale and rot to covariance matrix
    float[6] cov3D;
    calcCov3D(attributes.scale, attributes.rotation, 1.0, cov3D);

    float aspect = czm_projection[0][0] / czm_projection[1][1];
    float tan_fovx = 1./czm_projection[0][0];
    float tan_fovy = 1./czm_projection[1][1] * aspect;
    float lim_x = 1.3 * tan_fovx;
    float lim_y = 1.3 * tan_fovy;
    float focal_x = czm_viewport.x * czm_projection[0][0] / 2.0;
    float focal_y = czm_viewport.y * czm_projection[1][1] / 2.0;

    mat4 viewMatrix = czm_inverseModelView;

    //vec3 calcCov2D(vec3 posEC, float focal_x, float focal_y, float tan_fovx, float tan_fovy, float[6] cov3D, mat4 viewmatrix)
    vec3 cov2d = calcCov2D(attributes.positionMC, focal_x, focal_y, tan_fovx, tan_fovy, cov3D, viewMatrix);

    vec4 eyeCoord = viewMatrix * vec4(attributes.positionMC, 1.0);

    v_cov2d = cov2d;

    mat4 adjVP = czm_inverseViewProjection;
    vec4 p_hom = adjVP * vec4(attributes.positionMC, 1.0);
    float p_w = 1. / (p_hom.w + 1e-7);
    vec3 p_proj = p_hom.xyz * p_w;

    // Invert covariance (EWA algorithm)
    float det = (cov2d.x * cov2d.z - cov2d.y * cov2d.y);
    if (det == 0.) {
        gl_Position = vec4(0, 0, 0, 1);
        return;
    }
    //may not need these
    float det_inv = 1. / det;
    vec3 conic = vec3(cov2d.z, -cov2d.y, cov2d.x) * det_inv;


    // Compute extent in screen space (by finding eigenvalues of
    // 2D covariance matrix). Use extent to compute the bounding
    // rectangle of the splat in screen space.

    float mid = 0.5 * (cov2d.x + cov2d.z);
    float lambda1 = mid + sqrt(max(0.1, mid * mid - det));
    float lambda2 = mid - sqrt(max(0.1, mid * mid - det));
    float my_radius = ceil(3. * sqrt(max(lambda1, lambda2)));
    vec2 point_image = vec2(ndc2Pix(p_proj.x,  czm_projection[0][0]), ndc2Pix(p_proj.y,  czm_projection[1][1]));

    // (Webgl-specific) As the covariance matrix is calculated as a one-time operation on CPU in this implementation,
    // we need to apply the scale modifier differently to still allow for real-time scaling of the splats.

    // (Webgl-specific) Convert gl_VertexID from [0,1,2,3] to [-1,-1],[1,-1],[-1,1],[1,1]
    vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) - 1.;
    // Vertex position in screen space
    vec2 screen_pos = point_image + my_radius * corner;

    // Store some useful helper data for the fragment stage
    con = conic;
    xy = point_image;
    pixf = screen_pos;
    depth = eyeCoord.z;

    // (Webgl-specific) Convert from screen-space to clip-space
    vec2 clip_pos = screen_pos / vec2(czm_projection[0][0], czm_projection[1][1]) * 2. - 1.;

  //  gl_Position = vec4(clip_pos, 0.0, 1.0);
gl_Position = show * positionClip;
    gl_PointSize = 20. * (sqrt(det) * 2048.) * (1.0 / -eyeCoord.z);

        // //decompose covariance
        // float diag1 = cov2d[0][0];
        // float diag2 = cov2d[1][1];
        // float offDiag = cov2d[0][1];

        // float mid = (diag1 + diag2) / 2.0;
        // float radius = length(vec2((diag1 - diag2) / 2.0, offDiag));
        // v_lambda1 = mid + radius;
        // v_lambda2 = max(mid - radius, 0.1);

        // //if(lambda2 < 0.0) return;
        // vec2 diagonalVector = normalize(vec2(offDiag, v_lambda1 - diag1));
        // vec2 majorAxis = min(sqrt(2.0 * v_lambda1), 4096.0) * diagonalVector;
        // vec2 minorAxis = min(sqrt(2.0 * v_lambda2), 4096.0) * vec2(diagonalVector.y, -diagonalVector.x);

        // v_eigen1 = diagonalVector;
        // v_eigen2 = vec2(-v_eigen1.y, v_eigen1.x);

        // // // (Webgl-specific) Convert gl_VertexID from [0,1,2,3] to [-1,-1],[1,-1],[-1,1],[1,1]
        // // vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) - 1.;
        // // // Vertex position in screen space
        // // vec2 screen_pos = point_image + my_radius * corner;

        // // // Store some useful helper data for the fragment stage
        //     con = conic;
        // // xy = a_position;
        // // pixf = screen_pos;
        // // depth = p_view.z;

        // vec2 quadPos = vec2(gl_VertexID&1, (gl_VertexID>>1)&1) * 2.0 - 1.0;
        // quadPos *= 2.;

        // xy = quadPos;

        // vec2 deltaScreenPos = (quadPos.x * majorAxis + quadPos.y * minorAxis) * 2. / czm_viewport.xy;
        // pixf = deltaScreenPos;
        // v_position = gl_Position;

        // gl_Position = czm_projection * viewPos;

        // gl_PointSize = 15.;//(sqrt(det) * 2048.) * (1.0/ -viewPos.z);

    #endif
   // gl_Position = show * positionClip;
}
