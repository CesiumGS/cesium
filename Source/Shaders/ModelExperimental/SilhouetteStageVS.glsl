 //uniform float gltf_silhouetteSize;

void silhouetteStage(in ProcessedAttributes attributes) {
     vec3 normal = normalize(czm_normal3D * attributes.normalMC);
     normal.x *= czm_projection[0][0];
     normal.y *= czm_projection[1][1];
     vec4 clip = gl_Position;
     clip.xy += normal.xy * clip.w * 0.5 * czm_pixelRatio / czm_viewport.z;
     gl_Position = clip;
}