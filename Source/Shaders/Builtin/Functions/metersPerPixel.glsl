/**
 * Computes the size of a pixel in meters at a distance from the eye.
 
 * @name czm_metersPerPixel
 * @glslFunction
 *
 * @param {vec3} positionEC The position to get the meters per pixel in eye coordinates.
 *
 * @returns {float} The meters per pixel at positionEC.
 */
float czm_metersPerPixel(vec4 positionEC)
{
    float width = czm_viewport.z;
    float height = czm_viewport.w;
    float pixelWidth, pixelHeight;
    
    if (czm_sceneMode == czm_sceneMode2D)
    {
	    float frustumWidth = czm_frustumRight - czm_frustumLeft;
	    float frustumHeight = czm_frustumTop - czm_frustumBottom;
	    pixelWidth = frustumWidth / width;
	    pixelHeight = frustumHeight / height;
    }
    else
    {
        float distanceToPixel = -positionEC.z;
	    float inverseNear = 1.0 / czm_currentFrustum.x;
	    float tanTheta = czm_frustumTop * inverseNear;
	    pixelHeight = 2.0 * distanceToPixel * tanTheta / height;
	    tanTheta = czm_frustumRight * inverseNear;
	    pixelWidth = 2.0 * distanceToPixel * tanTheta / width;
    }

    return max(pixelWidth, pixelHeight);
}
