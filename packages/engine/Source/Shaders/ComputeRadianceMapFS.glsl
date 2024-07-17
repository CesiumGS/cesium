precision highp float;

in vec2 v_textureCoordinates;

uniform vec3 u_faceDirection; // Current cubemap face
uniform vec3 u_positionWC;
uniform mat4 u_enuToFixedFrame;

vec4 getCubeMapDirection(vec2 uv, vec3 faceDir) {
    vec2 scaledUV = uv * 2.0 - 1.0;

    if (faceDir.x != 0.0) {
        return vec4(-faceDir.x, scaledUV.y, scaledUV.x * -faceDir.x, 0.0);
    } else if (faceDir.y != 0.0) {
        return vec4(-scaledUV.x, -faceDir.y, -scaledUV.y * -faceDir.y, 0.0);
    } else {
        return vec4(-scaledUV.x * faceDir.z, scaledUV.y, faceDir.z, 0.0); 
    }
}

vec3 getPositionOnSkydome(vec3 normalizedDirection, float domeRadius) {
    return normalizedDirection * domeRadius;
}

float computeHorizonAngle(vec3 positionWC, float ellipsoidRadius) {
// Approximate as a sphere for now
    vec3 ellipsoidNormal = normalize(positionWC);
    float height = length(positionWC);
   return asin(ellipsoidRadius/height);
}

float computeOcclusionDistance(vec3 positionWC, vec3 normalWC, float ellipsoidRadius, float maxRadius) {
    // Approximate as a sphere for now
    vec3 ellipsoidNormal = normalize(positionWC);
    float height = length(positionWC);

    // Eventually sample multiple directions, but for as sphere we can do a integration of all angles
    float a = -dot(normalWC, ellipsoidNormal);
    float theta = acos(a);
    float alpha = computeHorizonAngle(positionWC, ellipsoidRadius);

    float d = a * height;
    float coefficient = 1.0;//1.0 / (2.0 * czm_pi) * sin(alpha);

    return coefficient * clamp(d/maxRadius, 0.0, 1.0);
}

float computeOcclusion(vec3 positionWC, float ellipsoidRadius, float occlusionDistance) {
    float alpha = computeHorizonAngle(positionWC, ellipsoidRadius);

    // From https://ceur-ws.org/Vol-3027/paper5.pdf
    return 1.0 - 1.0 / (2.0 * czm_pi) * sin(alpha) * max(0.0, 1.0 - occlusionDistance);
}

void main() {
    float radius = (u_radiiAndDynamicAtmosphereColor.x - length(u_positionWC)) / 25.0;

    vec3 direction = (u_enuToFixedFrame * getCubeMapDirection(v_textureCoordinates, u_faceDirection)).xyz * vec3(1.0, 1.0, -1.0);
    vec3 normalizedDirection = normalize(direction);

    float occlusionDistance = computeOcclusionDistance(u_positionWC, normalizedDirection, u_radiiAndDynamicAtmosphereColor.y, radius);
    vec3 scaledDirection = occlusionDistance * normalizedDirection;

    // Compute sky color for each position on a sphere at radius centered around the model's origin
    vec3 skyPositionWC = u_positionWC + getPositionOnSkydome(normalizedDirection, radius);

    vec3 lightDirectionWC = czm_lightDirectionWC.xyz; // TODO: Match this with type of lighting selected


    // Use the computed position for the sky color calculation
    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;
    float translucent;
    computeAtmosphereScattering(
            skyPositionWC,
            lightDirectionWC, 
            rayleighColor,
            mieColor,
            opacity,
            translucent
        );
    vec4 skyColor = computeAtmosphereColor(skyPositionWC, lightDirectionWC, rayleighColor, mieColor, opacity);

    vec3 sceneSkyBox = czm_textureCube(czm_environmentMap, vec3(v_textureCoordinates, 1.0)).rgb;

    // TODO: Ellipsoid
    // TODO: Color contribution from ellipsoid should be based on altitude
    // ie. if the model is high up, the earth will contribute more light from the atmopshere...
    // ... or is this already taken into account from the atmoshoereColor calculation?

    //out_FragColor = vec4(u_faceDirection, 1.0);
    float occlusion = computeOcclusion(u_positionWC, u_radiiAndDynamicAtmosphereColor.y, occlusionDistance);
    
    vec4 color = vec4(mix(sceneSkyBox, skyColor.rgb, skyColor.a), 1.0) * occlusion;
    out_FragColor = color;
}
