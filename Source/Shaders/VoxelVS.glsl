attribute vec2 position;

uniform vec4 u_ndcSpaceAxisAlignedBoundingBox;

void main() {
    vec2 aabbMin = u_ndcSpaceAxisAlignedBoundingBox.xy;
    vec2 aabbMax = u_ndcSpaceAxisAlignedBoundingBox.zw;
    vec2 translation = 0.5 * (aabbMax + aabbMin);
    vec2 scale = 0.5 * (aabbMax - aabbMin);
    gl_Position = vec4(position * scale + translation, 0.0, 1.0);
    gl_Position = vec4(position, 0.0, 1.0);
}
