// This is a struct used as input for all
// agi_getMaterial* functions. Only set the
// values the material is expected to use.

struct MaterialHelperInput
{
    float zDistance; // 1D texture coordinates.
    vec2 st; // 2D texture coordinates.
    vec3 str; // 3D texture coordinates.
    mat3 tangentToEyeMatrix; // Matrix for converting a tangent space normal to eye space.
    vec3 positionToEyeWC; // Direction between the fragment and eye.
    vec3 normalEC; // The unperturbed surface normal in eye coordinates.
};