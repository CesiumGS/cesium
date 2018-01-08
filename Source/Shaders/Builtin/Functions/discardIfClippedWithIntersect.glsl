/**
 * Clip a fragment by an array of clipping planes. Clipping plane regions are joined by the intersect operation, so
 * a fragment must be clipped by all of the planes to be discarded.
 *
 * @name czm_discardIfClippedWithIntersect
 * @glslFunction
 *
 * @param {vec4[]} clippingPlanes The array of planes used to clip, defined in eyespace.
 * @param {int} clippingPlanesLength The number of planes in the array of clipping planes.
 * @returns {float} The distance away from a clipped fragment, in eyespace
 */
float czm_discardIfClippedWithIntersect(vec4 clippingPlanes[czm_maxClippingPlanes], int clippingPlanesLength)
{
    if (clippingPlanesLength > 0)
    {
        bool clipped = true;
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

            clipped = clipped && (amount <= 0.0);
        }

        if (clipped)
        {
            discard;
        }

        return clipAmount;
    }

    return 0.0;
}
