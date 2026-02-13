#ifdef HAS_CONSTANT_LOD
// Extract model scale to compensate for minimumPixelSize scaling
float modelScaleX = length(czm_model[0].xyz);
float modelScaleY = length(czm_model[1].xyz);
float modelScaleZ = length(czm_model[2].xyz);
float modelScale = (modelScaleX + modelScaleY + modelScaleZ) / 3.0;

// Transform model position through ENU but as direction only (w=0) to avoid position-dependent rotation
vec3 enuDir = (u_constantLodWorldToEnu * czm_model * vec4(v_positionMC, 0.0)).xyz;
v_constantLodUvCustom.xy = (enuDir.yx + u_constantLodOffset) / modelScale;
v_constantLodUvCustom.z = u_constantLodDistance / modelScale;
#endif
