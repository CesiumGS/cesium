#ifdef HAS_CONSTANT_LOD
vec3 worldPos = (czm_model * vec4(v_positionMC, 1.0)).xyz;

// Extract model scale to compensate for Cesium's minimumPixelSize scaling
float modelScaleX = length(czm_model[0].xyz);
float modelScaleY = length(czm_model[1].xyz);
float modelScaleZ = length(czm_model[2].xyz);
float modelScale = (modelScaleX + modelScaleY + modelScaleZ) / 3.0;

vec3 enuPos = (u_constantLodWorldToEnu * vec4(worldPos, 1.0)).xyz;
v_constantLodUvCustom.xy = (enuPos.xy + u_constantLodOffset) * vec2(1.0, -1.0) / modelScale;
v_constantLodUvCustom.z = u_constantLodDistance / modelScale;
#endif
