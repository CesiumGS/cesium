#ifdef FRAGMENT_SHADING
    // TODO: position may be needed for styling
    varying vec3 v_positionEC;
    #ifdef USE_NORMAL
        varying vec3 v_normalEC;
    #endif
    #ifdef USE_TANGENT
        varying vec3 v_tangentEC;
        varying vec3 v_bitangentEC;
    #endif
    #ifdef USE_TEXCOORD_0
        varying vec2 v_texCoord0;
    #endif
    #ifdef USE_TEXCOORD_1
        varying vec2 v_texCoord1;
    #endif
    #ifdef USE_VERTEX_COLOR
        varying vec4 v_vertexColor;
    #endif
#else
    varying vec4 v_finalColor;
#endif

attribute vec3 a_position;

#ifdef POSITION_QUANTIZED
    uniform vec3 u_positionDequantizationOffset;
    uniform vec3 u_positionDequantizationScale;

    vec3 readPosition(in vec3 position)
    {
      return position * u_positionDequantizationScale + u_positionDequantizationOffset;
    }
#else
    vec3 readPosition(in vec3 position)
    {
      return position;
    }
#endif

#ifdef USE_NORMAL
    uniform mat3 u_normalMatrix;

    #ifdef NORMAL_OCT_ENCODED
        uniform float u_normalOctEncodedRange;
        attribute vec2 a_normal;

        vec3 readNormal(in vec2 normal)
        {
            #ifdef NORMAL_OCT_ENCODED_ZXY
                return czm_octDecode(normal, u_normalOctEncodedRange).zxy;
            #else
                return czm_octDecode(normal, u_normalOctEncodedRange).xyz;
            #endif
        }
    #elif NORMAL_QUANTIZED
        uniform vec3 u_normalDequantizationScale;
        attribute vec3 a_normal;

        vec3 readNormal(in vec3 normal)
        {
            return normal * u_normalDequantizationScale;
        }
    #else
        attribute vec3 a_normal;

        vec3 readNormal(in vec3 normal)
        {
            return normal;
        }
    #endif
#endif

#ifdef USE_TANGENT
    uniform mat3 u_tangentMatrix;

    #ifdef TANGENT_OCT_ENCODED
        uniform float u_tangentOctEncodedRange;
        attribute vec3 a_tangent;

        vec3 readTangent(in vec3 tangent)
        {
            // TODO: how does draco oct-decode tangents? Is it a vec2, vec3, or vec4? Where does handedness go?
            #ifdef TANGENT_OCT_ENCODED_ZXY
                return czm_octDecode(tangent.xy, u_tangentOctEncodedRange).zxy;
            #else
                return czm_octDecode(tangent.xy, u_tangentOctEncodedRange).xyz;
            #endif
        }
        float readTangentHandedness(in vec3 tangent)
        {
          return tangent.z;
        }
    #elif TANGENT_QUANTIZED
        uniform vec3 u_tangentDequantizationScale;
        attribute vec4 a_tangent;

        vec3 readTangent(in vec4 tangent)
        {
          return tangent.xyz * u_tangentDequantizationScale;
        }
        float readTangentHandedness(in vec4 tangent)
        {
          return tangent.w;
        }
    #else
        attribute vec4 a_tangent;

        vec3 readTangent(in vec4 tangent)
        {
            return tangent.xyz;
        }
        float readTangentHandedness(in vec4 tangent)
        {
          return tangent.w;
        }
    #endif
#endif

#ifdef USE_TEXCOORD_0
    attribute vec2 a_texCoord0;

    #ifdef TEXCOORD_0_QUANTIZED
        uniform vec2 u_texCoord0DequantizationOffset;
        uniform vec2 u_texCoord0DequantizationScale;

        vec2 readTexCoord0(in vec2 texCoord0)
        {
            return texCoord0 * u_texCoord0DequantizationScale + u_texCoord0DequantizationOffset;
        }
    #else
        vec2 readTexCoord0(in vec2 texCoord0)
        {
            return texCoord0;
        }
    #endif
#endif

#ifdef USE_TEXCOORD_1
    attribute vec2 a_texCoord1;

    #ifdef TEXCOORD_1_QUANTIZED
        uniform vec2 u_texCoord1DequantizationOffset;
        uniform vec2 u_texCoord1DequantizationScale;

        vec2 readTexCoord1(in vec2 texCoord1)
        {
            return texCoord1 * u_texCoord1DequantizationScale + u_texCoord1DequantizationOffset;
        }
    #else
        vec2 readTexCoord1(in vec2 texCoord1)
        {
            return texCoord1;
        }
    #endif
#endif

#ifdef USE_VERTEX_COLOR
    #ifdef VERTEX_COLOR_RGB
        attribute vec3 a_vertexColor;

        #ifdef VERTEX_COLOR_QUANTIZED
            uniform vec3 u_vertexColorDequantizationOffset;
            uniform vec3 u_vertexColorDequantizationScale;

            vec4 readVertexColor(in vec3 vertexColor)
            {
                return vec4(vertexColor * u_vertexColorDequantizationScale + u_vertexColorDequantizationOffset, 1.0);
            }
        #else
            vec4 readVertexColor(in vec3 vertexColor)
            {
                return vec4(vertexColor, 1.0);
            }
        #endif
    #else
        attribute vec4 a_vertexColor;

        #ifdef VERTEX_COLOR_QUANTIZED
            uniform vec4 u_vertexColorDequantizationOffset;
            uniform vec4 u_vertexColorDequantizationScale;

            vec4 readVertexColor(in vec4 vertexColor)
            {
                return vertexColor * u_vertexColorDequantizationScale + u_vertexColorDequantizationOffset;
            }
        #else
            vec4 readVertexColor(in vec4 vertexColor)
            {
                return vertexColor;
            }
        #endif
    #endif
#endif

#ifdef USE_FEATURE_ID_0
    attribute float a_featureId0;
    #if defined(USE_STYLE) && !defined(USE_STYLE_IN_VERTEX_SHADER)
        varying float v_featureId0;
    #endif
#endif

#ifdef USE_FEATURE_ID_1
    attribute float a_featureId1;
    #if defined(USE_STYLE) && !defined(USE_STYLE_IN_VERTEX_SHADER)
        varying float v_feature_id_1;
    #endif
#endif

#ifdef USE_INSTANCING
    attribute vec4 a_instancedModelMatrixRow0;
    attribute vec4 a_instancedModelMatrixRow1;
    attribute vec4 a_instancedModelMatrixRow2;
    #ifdef USE_INSTANCED_FEATURE_ID_0
        attribute float a_instancedFeatureId_0;
    #endif
    #if USE_INSTANCED_FEATURE_ID_1
        attribute float a_instancedFeatureId_1;
    #endif
#endif

#ifdef USE_SKINNING
    attribute vec4 a_joints;
    attribute vec4 a_weights;

    #ifdef WEIGHTS_QUANTIZED
        uniform vec4 u_weightsDequantizationOffset;
        uniform vec4 u_weightsDequantizationScale;

        vec4 readWeights(in vec4 weights)
        {
            return weights * u_weightsDequantizationOffset + u_weightsDequantizationScale;
        }
    #else
        vec4 readWeights(in vec4 weights)
        {
            return weights;
        }
    #endif

    uniform mat4 u_jointMatrix[JOINT_COUNT];
    // TODO: inverse bind matrices
    // joint matrix is the world transform * inverse bing matrix see skin.js
    // joints have separate normal matrices
#endif

#ifdef USE_MORPH_TARGETS
    uniform float u_morphWeights[MORPH_TARGET_COUNT];

    #ifdef USE_TARGET_POSITION_0
        in vec3 a_target_position_0;
    #endif

    #ifdef USE_TARGET_POSITION_1
        in vec3 a_target_position_1;
    #endif

    #ifdef USE_TARGET_POSITION_2
        in vec3 a_target_position_2;
    #endif

    #ifdef USE_TARGET_POSITION_3
        in vec3 a_target_position_3;
    #endif

    #ifdef USE_TARGET_POSITION_4
        in vec3 a_target_position_4;
    #endif

    #ifdef USE_TARGET_POSITION_5
        in vec3 a_target_position_5;
    #endif

    #ifdef USE_TARGET_POSITION_6
        in vec3 a_target_position_6;
    #endif

    #ifdef USE_TARGET_POSITION_7
        in vec3 a_target_position_7;
    #endif

    #ifdef USE_TARGET_NORMAL_0
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_0;
        #else
            in vec3 a_target_normal_0;
        #endif
    #endif

    #ifdef USE_TARGET_NORMAL1
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_1;
        #else
            in vec3 a_target_normal_1;
        #endif
    #endif

    #ifdef USE_TARGET_NORMAL2
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_2;
        #else
            in vec3 a_target_normal_2;
        #endif
    #endif

    #ifdef USE_TARGET_NORMAL3
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_3;
        #else
            in vec3 a_target_normal_3;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT0
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_0;
        #else
            in vec4 a_target_tangent_0;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT1
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_1;
        #else
            in vec4 a_target_tangent_1;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT2
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_2;
        #else
            in vec4 a_target_tangent_2;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT3
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_3;
        #else
            in vec4 a_target_tangent_3;
        #endif
    #endif

    vec3 getTargetPosition()
    {
        vec3 position = vec3(0.0);

        #ifdef USE_TARGET_POSITION_0
            position += u_morphWeights[0] * readPosition(a_target_position_0);
        #endif

        #ifdef USE_TARGET_POSITION_1
            position += u_morphWeights[1] * readPosition(a_target_position_1);
        #endif

        #ifdef USE_TARGET_POSITION_2
            position += u_morphWeights[2] * readPosition(a_target_position_2);
        #endif

        #ifdef USE_TARGET_POSITION_3
            position += u_morphWeights[3] * readPosition(a_target_position_3);
        #endif

        #ifdef USE_TARGET_POSITION_4
            position += u_morphWeights[4] * readPosition(a_target_position_4);
        #endif

        #ifdef USE_TARGET_POSITION_5
            position += u_morphWeights[5] * readPosition(a_target_position_5);
        #endif

        #ifdef USE_TARGET_POSITION_6
            position += u_morphWeights[6] * readPosition(a_target_position_6);
        #endif

        #ifdef USE_TARGET_POSITION_7
            position += u_morphWeights[7] * readPosition(a_target_position_7);
        #endif

        return position;
    }

    #ifdef USE_NORMAL
        vec3 getTargetNormal()
        {
            vec3 normal = vec3(0.0);

            #ifdef USE_TARGET_NORMAL_0
                normal += u_morphWeights[0] * readNormal(a_target_normal_0);
            #endif

            #ifdef USE_TARGET_NORMAL_1
                normal += u_morphWeights[1] * readNormal(a_target_normal_1);
            #endif

            #ifdef USE_TARGET_NORMAL_2
                normal += u_morphWeights[2] * readNormal(a_target_normal_2);
            #endif

            #ifdef USE_TARGET_NORMAL_3
                normal += u_morphWeights[3] * readNormal(a_target_normal_3);
            #endif

            return normal;
        }
    #endif

    #ifdef USE_TANGENT
        vec3 getTargetTangent()
        {
            vec3 tangent = vec3(0.0);

            #ifdef USE_TARGET_TANGENT0
                tangent += u_morphWeights[0] * readTangent(a_target_tangent_0);
            #endif

            #ifdef USE_TARGET_TANGENT1
                tangent += u_morphWeights[1] * readTangent(a_target_tangent_1);
            #endif

            #ifdef USE_TARGET_TANGENT2
                tangent += u_morphWeights[2] * readTangent(a_target_tangent_2);
            #endif

            #ifdef USE_TARGET_TANGENT3
                tangent += u_morphWeights[3] * readTangent(a_target_tangent_3);
            #endif

            return tangent;
        }
    #endif
#endif

void main()
{
    #ifdef USE_SKINNING
        vec4 weights = readWeights(a_weights);
        mat4 skinningMatrix =
            weights.x * u_jointMatrix[int(a_joints.x)] +
            weights.y * u_jointMatrix[int(a_joints.y)] +
            weights.z * u_jointMatrix[int(a_joints.z)] +
            weights.w * u_jointMatrix[int(a_joints.w)];
    #endif

    #ifdef USE_INSTANCING
        mat4 instanceMatrix = mat4(
            a_instancedModelMatrixRow0.x,
            a_instancedModelMatrixRow1.x,
            a_instancedModelMatrixRow2.x,
            0.0,
            a_instancedModelMatrixRow0.y,
            a_instancedModelMatrixRow1.y,
            a_instancedModelMatrixRow2.y,
            0.0,
            a_instancedModelMatrixRow0.z,
            a_instancedModelMatrixRow1.z,
            a_instancedModelMatrixRow2.z,
            0.0,
            a_instancedModelMatrixRow0.w,
            a_instancedModelMatrixRow1.w,
            a_instancedModelMatrixRow2.w,
            1.0
        );
    #endif

    vec4 position = vec4(readPosition(a_position), 1.0);

    #ifdef USE_MORPH_TARGETS
        position.xyz += getTargetPosition();
    #endif

    #ifdef USE_SKINNING
        position = skinningMatrix * position;
    #endif

    #ifdef USE_INSTANCING
        // Instance matrix is in object space and is applied before the model matrix
        position = instanceMatrix * position;
    #endif

    vec3 positionEC = czm_modelView * position;

    #ifdef USE_NORMAL
        vec3 normal = readNormal(a_normal);

        #ifdef USE_MORPH_TARGETS
            normal += getTargetNormal();
        #endif

        #ifdef USE_SKINNING
            normal = mat3(skinningMatrix) * normal;
        #endif

        #ifdef USE_INSTANCING
            normal = transpose(inverse(mat3(instanceMatrix))) * normal;
        #endif

        vec3 normalEC = normalize(u_normalMatrix * normal);
    #endif

    #ifdef USE_TANGENT
        vec3 tangent = readTangent(a_tangent);
        float tangentHandedness = readTangentHandedness(a_tangent);

        #ifdef USE_MORPH_TARGETS
            tangent += getTargetTangent();
        #endif

        #ifdef USE_SKINNING
            tangent = mat3(skinningMatrix) * tangent;
        #endif

        #ifdef USE_INSTANCING
            tangent = mat3(instanceMatrix) * tangent;
        #endif

        vec3 tangentEC = normalize(u_tangentMatrix * tangent);
        vec3 bitangentEC = cross(normalEC, tangentEC) * tangentHandedness;
    #endif

    #ifdef USE_TEXCOORD_0
        vec2 texCoord0 = readTexCoord0(a_texCoord_0);
    #endif

    #ifdef USE_TEXCOORD_1
        vec2 texCoord1 = readTexCoord1(a_texCoord_1);
    #endif

    #ifdef USE_VERTEX_COLOR
        vec4 vertexColor = readVertexColor(a_vertexColor);
    #endif

    #ifdef FRAGMENT_SHADING
        v_positionEC = positionEC;
        #ifdef USE_NORMAL
            v_normalEC = normalEC;
        #endif
        #ifdef USE_TANGENT
            v_tangentEC = tangentEC;
            v_bitangentEC = bitangentEC;
        #endif
        #ifdef USE_TEXCOORD_0
            v_texCoord0 = texCoord0;
        #endif
        #ifdef USE_TEXCOORD_1
            v_texCoord1 = texCoord1;
        #endif
        #ifdef USE_VERTEX_COLOR
            v_vertexColor = vertexColor;
        #endif
    #else
        v_finalColor = getColor(
            positionEC,
            #ifdef USE_NORMAL
                normalEC,
            #endif
            #ifdef USE_TANGENT
                tangentEC,
                bitangentEC,
            #endif
            #ifdef USE_TEXCOORD_0
                texCoord0,
            #endif
            #ifdef USE_TEXCOORD_1
                texCoord1,
            #endif
            #ifdef USE_VERTEX_COLOR
                vertexColor
            #endif
        );
    #endif

    gl_Position = czm_modelViewProjection * position;
}
