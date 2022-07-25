void silhouetteStage(in ProcessedAttributes attributes, inout vec4 positionClip) {
     #ifdef HAS_NORMALS
     if(model_silhouettePass) {
          vec3 normal = normalize(czm_normal3D * attributes.normalMC);
          normal.x *= czm_projection[0][0];
          normal.y *= czm_projection[1][1];
          positionClip.xy += normal.xy * positionClip.w * model_silhouetteSize * czm_pixelRatio / czm_viewport.z;
    }
    #endif
}
