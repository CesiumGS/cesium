/**
 * Procedural anti-aliasing by blurring two colors that meet at a sharp edge.
 *
 * @name czm_clipPlanes
 * @glslFunction
 *
 * @param {int} clipPlanesLength The array length of clipping planes.
 * @param {vec3[]} clipNormals
 * @param {vec3[]} clipPositions
 */
 const int czm_maxClippingPlanes = 6;

void czm_clipPlanes (int clipPlanesLength, vec3[czm_maxClippingPlanes] clipNormals, vec3[czm_maxClippingPlanes] clipPositions)
{
    if (clipPlanesLength > 0)
    {
        bool clipped = false;
        vec4 positionWC = czm_inverseView3D * czm_windowToEyeCoordinates(gl_FragCoord);
        vec3 clipNormal = vec3(0.0, 0.0, 0.0);
        vec3 clipPosition = vec3(0.0, 0.0, 0.0);

        for (int i = 0; i < czm_maxClippingPlanes; ++i)
        {
            if (i >= clipPlanesLength)
            {
                break;
            }

            clipNormal = clipNormals[i];
            clipPosition = clipPositions[i];
            clipped = clipped || (dot(clipNormal, (positionWC.xyz - clipPosition)) > czm_epsilon7);
        }

        if (clipped)
        {
            discard;
        }
    }
}
