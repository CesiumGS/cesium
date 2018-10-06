//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "varying vec3 v_forwardDirectionEC;\n\
varying vec3 v_texcoordNormalizationAndHalfWidth;\n\
varying float v_batchId;\n\
#ifdef PER_INSTANCE_COLOR\n\
varying vec4 v_color;\n\
#else\n\
varying vec2 v_alignedPlaneDistances;\n\
varying float v_texcoordT;\n\
#endif\n\
float rayPlaneDistanceUnsafe(vec3 origin, vec3 direction, vec3 planeNormal, float planeDistance) {\n\
return (-planeDistance - dot(planeNormal, origin)) / dot(planeNormal, direction);\n\
}\n\
void main(void)\n\
{\n\
vec4 eyeCoordinate = gl_FragCoord;\n\
eyeCoordinate /= eyeCoordinate.w;\n\
#ifdef PER_INSTANCE_COLOR\n\
gl_FragColor = v_color;\n\
#else // PER_INSTANCE_COLOR\n\
float distanceFromStart = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, -v_forwardDirectionEC, v_forwardDirectionEC.xyz, v_alignedPlaneDistances.x);\n\
float distanceFromEnd = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, v_forwardDirectionEC, -v_forwardDirectionEC.xyz, v_alignedPlaneDistances.y);\n\
distanceFromStart = max(0.0, distanceFromStart);\n\
distanceFromEnd = max(0.0, distanceFromEnd);\n\
float s = distanceFromStart / (distanceFromStart + distanceFromEnd);\n\
s = (s * v_texcoordNormalizationAndHalfWidth.x) + v_texcoordNormalizationAndHalfWidth.y;\n\
czm_materialInput materialInput;\n\
materialInput.s = s;\n\
materialInput.st = vec2(s, v_texcoordT);\n\
materialInput.str = vec3(s, v_texcoordT, 0.0);\n\
czm_material material = czm_getMaterial(materialInput);\n\
gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
#endif // PER_INSTANCE_COLOR\n\
}\n\
";
});