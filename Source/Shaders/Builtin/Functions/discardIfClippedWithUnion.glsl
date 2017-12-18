/**
 * Clip a fragment by an array of clipping planes. Clipping plane regions are joined with the union operation,
 * therefore if a fragment is clipped by any of the planes, it is discarded.
 *
 * @name czm_discardIfClippedWithUnion
 * @glslFunction
 *
 * @param {vec4[]} clippingPlanes The array of planes used to clip, defined in eyespace.
 * @param {int} clippingPlanesLength The number of planes in the array of clipping planes.
 * @returns {float} The distance away from a clipped fragment, in eyespace
 */
float czm_discardIfClippedWithUnion(vec4 clippingPlanes[czm_maxClippingPlanes], int clippingPlanesLength)
{
    if (clippingPlanesLength > 0)
    {
        vec4 position = czm_windowToEyeCoordinates(gl_FragCoord);
        vec3 clipNormal = vec3(0.0);
        vec3 clipPosition = vec3(0.0);
        float clipAmount = 0.0;
        float pixelWidth = czm_metersPerPixel(position);

        for (int i = 0; i < czm_maxClippingPlanes; ++i)
        {
            if (i == clippingPlanesLength)
            {
                break;
            }

            clipNormal = clippingPlanes[i].xyz;
            clipPosition = -clippingPlanes[i].w * clipNormal;

            float amount = dot(clipNormal, (position.xyz - clipPosition)) / pixelWidth;
            clipAmount = max(amount, clipAmount);

            if (amount <= 0.0)
            {
                discard;
            }
        }

        return clipAmount;
    }

    return 0.0;
}
