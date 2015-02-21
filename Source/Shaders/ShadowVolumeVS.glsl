attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 normal;

uniform float centralBodyMinimumAltitude;
uniform float LODNegativeToleranceOverDistance;

void main() {
    vec4 position = czm_translateRelativeToEye(positionHigh, positionLow);
    
    //
    // Make sure the vertex is moved down far enough to cover the central body
    //
    float delta = min(centralBodyMinimumAltitude, LODNegativeToleranceOverDistance * length(position.xyz));
    
    //
    // Move vertex down. This is not required if it belongs to a top
    // cap or top of the wall, in which case it was already moved up just
    // once on the CPU so the normal will be (0, 0, 0).
    //
    // Moving the vertex down is a function of the view parameters so
    // it is done here to avoid buring CPU time.
    //
    gl_Position = czm_modelViewProjectionRelativeToEye * (position + vec4(normal * delta, 0));
}