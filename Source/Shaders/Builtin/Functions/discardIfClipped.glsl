/**
 * Clip a fragment by an array of clipping planes.
 *
 * @name czm_discardIfClipped
 * @glslFunction
 *
 * @param {vec4[]} clippingPlanes The array of planes used to clip, defined in eyespace.
 * @param {int} clippingPlanesLength The number of planes in the array of clipping planes.
 */
void czm_discardIfClipped (vec4[czm_maxClippingPlanes] clippingPlanes, int clippingPlanesLength)
{
    if (clippingPlanesLength > 0)
    {
        bool clipped = false;
        vec4 position = czm_windowToEyeCoordinates(gl_FragCoord);
        vec3 clipNormal = vec3(0.0);
        vec3 clipPosition = vec3(0.0);

        for (int i = 0; i < czm_maxClippingPlanes; ++i)
        {
            if (i == clippingPlanesLength || clipped)
            {
                break;
            }

            clipNormal = clippingPlanes[i].xyz;
            clipPosition = -clippingPlanes[i].w * clipNormal;
            clipped = dot(clipNormal, (position.xyz - clipPosition)) <= 0.0;
        }

        if (clipped)
        {
            discard;
        }
    }
}
