#define EPS 1e-6
#define kernelSize 9.0
attribute vec4 position;
varying float centerPos;

uniform sampler2D pointCloud_depthTexture;

void main() {
    vec2 textureCoordinates = 0.5 * position.xy + vec2(0.5);
    ivec2 screenSpaceCoordinates = ivec2(textureCoordinates * czm_viewport.zw);
    if (length(texture2D(pointCloud_depthTexture, textureCoordinates)) > EPS) {
        gl_Position = position;
        gl_PointSize = kernelSize;
        centerPos = float(screenSpaceCoordinates.x + screenSpaceCoordinates.y * int(
                              czm_viewport.z));
    } else {
        gl_Position = vec4(-10);
        centerPos = 0.0;
    }
}
