#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

//
// The west longitude plane relative to the center of the mesh
//
uniform vec4 westPlane;
//
// The west longitude plane relative to the center of the mesh
//
uniform vec4 eastPlane;
//
// Center azimuth and deltas:
//     x = center azimuth x
//     y = center azimuth y
//     z = 1.0 / longitude delta
//     w = 1.0 / latitude delta
//
uniform vec4 centerAzimuthAndInverseDeltas;
//
// Sin and cos deltas:
//     x = sin(longitude delta)
//     y = cos(longitude delta)
//     z = sin(latitude delta)
//     w = cos(latitude delta)
//
uniform vec4 sinCosDeltas;
//
// North plane:
//     x = normal C magnitude
//     y = normal AB magnitude
//     z = minimum D
//     w = maximum D - minimum D
//
uniform vec4 northPlane;
//
// South plane:
//     x = normal C magnitude
//     y = normal AB magnitude
//     z = minimum D
//     w = maximum D - minimum D
//
uniform vec4 southPlane;

varying float v_z;

void czm_writeDepthClampedToFarPlane()
{
    // That is really 1/w
    gl_FragDepthEXT = min(v_z * gl_FragCoord.w, 1.0);   
    //gl_FragDepthEXT = clamp(v_z * gl_FragCoord.w, 0.0, 1.0);
}

void main(void)
{
    /*
     //
     // Get the depth value of the terrain for the current fragment.
     // Note that this is almost certainly  different then the depth
     // value of the shadow volume, which is why the depth texture
     // is used in the first place.
     //
    vec2 depthTextureCoord;
    depthTextureCoord.x = (gl_FragCoord.x - czm_viewport.x) / czm_viewport.z;
    depthTextureCoord.y = (gl_FragCoord.y - czm_viewport.y) / czm_viewport.w;
    vec4 terrainDepth = texture2D(czm_globeDepthTexture, depthTextureCoord);
     // 
     // Convert to normalized device coordinates.  That is 
     // a cube from [-1, -1, -1] to [1, 1, 1].
     //
    vec4 ndcCoord;
    ndcCoord.xy = (2.0 * depthTextureCoord.xy) - 1.0;
    ndcCoord.z = (2.0 * terrainDepth.r) - 1.0;
    ndcCoord.w = 1.0;
     //
     // Use the Inverse ModelView Projection Matrix to convert from NDC to CBF
     //
    vec4 cbfPosition = ndcCoord * czm_modelViewProjectionRelativeToPrimitiveCenterInverseTranspose;
     //
     // Reverse perspective divide
     //
    float w = 1.0 / cbfPosition.w;
    cbfPosition.xyz *= w;
    cbfPosition.w = 1.0;
     //
     // West is 0.0 and east is 1.0
     //
    float tangent = 0.0;
    float bitangent = 1.0;
    float atan1 = 0.0;
    float u = 0.0;
    float d1 = dot(westPlane, cbfPosition);
    if (d1 != 0.0)
    {
        float tempFloat = (dot(eastPlane, cbfPosition) / d1) + sinCosDeltas.y;
        if (tempFloat != 0.0)
        {
            tangent = sinCosDeltas.x / tempFloat;
            bitangent = 1.0;
        }
        else
        {
            tangent = 1.0;
            bitangent = 0.0;
        }
        atan1 = atan(sinCosDeltas.x / tempFloat);
        atan1 += (step(atan1, 0.0) + step(d1, 0.0)) * czm_pi;
        u = atan1 * centerAzimuthAndInverseDeltas.z;
    }
     //
     // Calculate the az vector for this pixel
     //
    vec2 azVec = normalize(vec2(westPlane.xy * tangent) + (vec2(westPlane.y, -westPlane.x) * bitangent));
    if ((atan1 >= czm_piOverTwo) && (atan1 <= czm_threePiOver2))
    {
        azVec = -azVec;
    }
     //
     // The following commented out code might perform better than the above if statement.  It
     // is slower on a GeForce6.
     //
     // float theSign = sign(atan1 - czm_piOverTwo) * sign(atan1 - czm_threePiOver2);
     // azVec *= theSign;
     //
     // Calculate the north and south planes
     //
    float mrDead = (dot(centerAzimuthAndInverseDeltas.xy, azVec) + 1.0) * 0.5;
    vec4 southPlane = vec4(azVec.xy * southPlane.y, southPlane.x, southPlane.z + (mrDead * southPlane.w));
    vec4 northPlane = vec4(azVec.xy * northPlane.y, northPlane.x, northPlane.z + (mrDead * northPlane.w));
     //
     // South is 0.0 and north is 1.0
     // 
    float v = 0.0;
    d1 = dot(southPlane, cbfPosition);
    if (d1 != 0.0)
    {
        atan1 = atan(sinCosDeltas.z, (dot(northPlane, cbfPosition) / d1) + sinCosDeltas.w);
        atan1 += (step(atan1, 0.0) + step(d1, 0.0)) * czm_pi;
        v = atan1 * centerAzimuthAndInverseDeltas.w;
    }
    
    vec2 textureCoordinates = vec2(u, v);
    */
    
    gl_FragColor = vec4(1.0, 1.0, 0.0, 0.5);
    
    //float depth = terrainDepth.r;
    //gl_FragColor = vec4(vec3(depth), 1.0);
    
    //gl_FragColor = vec4(textureCoordinates, 0.0, 0.5);
    
    czm_writeDepthClampedToFarPlane();
}