in vec3 position;
out vec3 v_textureCoordinates;

uniform vec3 u_faceDirection;

vec3 getCubeMapDirection(vec2 uv, vec3 faceDir) {
    vec2 scaledUV = uv;

    if (faceDir.x != 0.0) {
        return vec3(faceDir.x, scaledUV.y, scaledUV.x * faceDir.x);
    } else if (faceDir.y != 0.0) {
        return vec3(scaledUV.x, -faceDir.y, -scaledUV.y * faceDir.y);
    } else {
        return vec3(scaledUV.x * faceDir.z, scaledUV.y, -faceDir.z); 
    }
}

void main() 
{
    v_textureCoordinates = getCubeMapDirection(position.xy, u_faceDirection);
    v_textureCoordinates.y = -v_textureCoordinates.y;
    v_textureCoordinates.z = -v_textureCoordinates.z;
    gl_Position = vec4(position, 1.0);
}
