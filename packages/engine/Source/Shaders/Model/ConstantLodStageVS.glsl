#ifdef HAS_CONSTANT_LOD
// Extract model scale to compensate for minimumPixelSize scaling
float modelScaleX = length(czm_model[0].xyz);
float modelScaleY = length(czm_model[1].xyz);
float modelScaleZ = length(czm_model[2].xyz);
float modelScale = (modelScaleX + modelScaleY + modelScaleZ) / 3.0;

vec3 n = normalize(attributes.normalMC);
// Choose a reference vector that is not parallel to the normal
vec3 ref = abs(n.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);

vec3 tangent = normalize(cross(ref, n));
vec3 bitangent = cross(n, tangent);

// Project model-space position onto the tangent frame to get 2D surface coords
vec2 surfaceUV = vec2(dot(v_positionMC, bitangent), dot(v_positionMC, tangent));

v_constantLodUvCustom.xy = (surfaceUV + u_constantLodOffset) / modelScale;
v_constantLodUvCustom.z = u_constantLodDistance / modelScale;
#endif
