//This file is automatically rebuilt by the Cesium build process.
export default "void silhouetteStage(in ProcessedAttributes attributes, inout vec4 positionClip) {\n\
     #ifdef HAS_NORMALS\n\
     if(model_silhouettePass) {\n\
          vec3 normal = normalize(czm_normal3D * attributes.normalMC);\n\
          normal.x *= czm_projection[0][0];\n\
          normal.y *= czm_projection[1][1];\n\
          positionClip.xy += normal.xy * positionClip.w * model_silhouetteSize * czm_pixelRatio / czm_viewport.z;\n\
    }\n\
    #endif\n\
}\n\
";
