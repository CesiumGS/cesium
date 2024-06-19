precision highp float;


//in  vec2 v_position;
out vec2 fsPosition;

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

    float limx = 1.3 * tan_fovx;
    float limy = 1.3 * tan_fovy;
    float txtz = t.x / t.z;
    float tytz = t.y / t.z;
    t.x = min(limx, max(-limx, txtz)) * t.z;
    t.y = min(limy, max(-limy, tytz)) * t.z;

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
   // mat3 W = transpose(mat3(viewmatrix));

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


vec4 addScreenSpaceOffset(vec4 positionEC, vec2 imageSize, float scale, vec2 direction, vec2 origin, vec2 translate, vec2 pixelOffset, vec3 alignedAxis, bool validAlignedAxis, float rotation, bool sizeInMeters, out mat2 rotationMatrix, out float mpp)
{
    // Note the halfSize cannot be computed in JavaScript because it is sent via
    // compressed vertex attributes that coerce it to an integer.
    vec2 halfSize = imageSize * scale * 0.5;
    halfSize *= ((direction * 2.0) - 1.0);

    vec2 originTranslate = origin * abs(halfSize);

#if defined(ROTATION) || defined(ALIGNED_AXIS)
    if (validAlignedAxis || rotation != 0.0)
    {
        float angle = rotation;
        if (validAlignedAxis)
        {
            vec4 projectedAlignedAxis = czm_modelView3D * vec4(alignedAxis, 0.0);
            angle += sign(-projectedAlignedAxis.x) * acos(sign(projectedAlignedAxis.y) * (projectedAlignedAxis.y * projectedAlignedAxis.y) /
                    (projectedAlignedAxis.x * projectedAlignedAxis.x + projectedAlignedAxis.y * projectedAlignedAxis.y));
        }

        float cosTheta = cos(angle);
        float sinTheta = sin(angle);
        rotationMatrix = mat2(cosTheta, sinTheta, -sinTheta, cosTheta);
        halfSize = rotationMatrix * halfSize;
    }
    else
    {
        rotationMatrix = mat2(1.0, 0.0, 0.0, 1.0);
    }
#endif

    mpp = czm_metersPerPixel(positionEC);
    positionEC.xy += (originTranslate + halfSize) * czm_branchFreeTernary(sizeInMeters, 1.0, mpp);
    positionEC.xy += (translate + pixelOffset) * mpp;

    return positionEC;
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

    float aspect = czm_viewport.z / czm_viewport.w;
    float fovx = 2.0 * atan(aspect / czm_projection[0][0]);//1./czm_projection[0][0];
    float fovy = 2.0 * atan(1.0 / czm_projection[1][1]);//1./czm_projection[1][1] * aspect;
    float tan_fovx = tan(fovx / 2.0);
    float tan_fovy = tan(fovy / 2.0);
    float focal_y = czm_viewport.w / (2.0 * tan_fovy);
    float focal_x = czm_viewport.z / (2.0 * tan_fovx);

     mat4 viewMatrix = czm_modelView;
     vec3 cov2d = calcCov2D(attributes.positionMC, focal_x, focal_y, tan_fovx, tan_fovy, cov3D, viewMatrix);

    vec4 pos2d = czm_modelViewProjection * vec4(v_positionMC,1.0);

    float clip = 1.2 * pos2d.w;
    if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    float mid = (cov2d.x + cov2d.z) / 2.0;
    float radius = length(vec2((cov2d.x - cov2d.z) / 2.0, cov2d.y));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if(lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov2d.y, lambda1 - cov2d.x));
    vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    vec3 vCenter = pos2d.xyz / pos2d.w;

    gl_Position = vec4(
        vCenter.xy
        + v_position.x * majorAxis / czm_viewport.z
        + v_position.y * minorAxis / czm_viewport.w, 0.0, 1.0);;


    fsPosition = v_position;

    #endif
   // gl_Position = show * positionClip;
}
