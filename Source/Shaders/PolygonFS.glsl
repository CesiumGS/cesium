uniform float u_erosion;

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

#ifndef RENDER_FOR_PICK

void erode(vec3 str)
{
    if (u_erosion != 1.0)
    {
        float t = 0.5 + (0.5 * agi_snoise(str / (1.0 / 10.0)));   // Scale [-1, 1] to [0, 1]
    
        if (t > u_erosion)
        {
            discard;
        }
    }
}

#endif

vec4 getColor()
{
    // TODO: Real 1D distance, and better 3D coordinate
    float zDistance = 0.0;          // 1D distance
    vec2 st = v_textureCoordinates; // 2D texture coordinates
    vec3 str = vec3(st, 0.0);       // 3D texture coordinates

    erode(str);

    return agi_getMaterialColor(zDistance, st, str);
}

void main()
{
    // TODO: use specular map
    
    // Light using ellipsoid surface normal
    vec3 normalEC = normalize(agi_normal * agi_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));  // normalized surface normal in eye coordiantes
    vec3 positionToEyeEC = normalize(-v_positionEC);                                                        // normalized position-to-eye vector in eye coordinates

#ifdef AFFECTED_BY_LIGHTING
    float intensity = agi_lightIntensity(normalEC, agi_sunDirectionEC, positionToEyeEC);
#else
    float intensity = 1.0;
#endif

    vec4 color = getColor();
    gl_FragColor = vec4(intensity * color.rgb, color.a);
}
