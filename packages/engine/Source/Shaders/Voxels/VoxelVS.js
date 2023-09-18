//This file is automatically rebuilt by the Cesium build process.
export default "in vec2 position;\n\
\n\
uniform vec4 u_ndcSpaceAxisAlignedBoundingBox;\n\
\n\
void main() {\n\
    vec2 aabbMin = u_ndcSpaceAxisAlignedBoundingBox.xy;\n\
    vec2 aabbMax = u_ndcSpaceAxisAlignedBoundingBox.zw;\n\
    vec2 translation = 0.5 * (aabbMax + aabbMin);\n\
    vec2 scale = 0.5 * (aabbMax - aabbMin);\n\
    gl_Position = vec4(position * scale + translation, 0.0, 1.0);\n\
}\n\
";
