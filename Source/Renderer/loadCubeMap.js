/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/loadImage',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        loadImage,
        when) {
    "use strict";

    /**
     * Asynchronously loads six images and creates a cube map.  Returns a promise that
     * will resolve to a {@link CubeMap} once loaded, or reject if any image fails to load.
     *
     * @exports loadCubeMap
     *
     * @param {Context} context The context to use to create the cube map.
     * @param {Object} urls The source of each image, or a promise for each URL.  See the example below.
     * @param {Boolean} [allowCrossOrigin=true] Whether to request the image using Cross-Origin
     *        Resource Sharing (CORS).  CORS is only actually used if the image URL is actually cross-origin.
     *        Data URIs are never requested using CORS.
     *
     * @returns {Promise} a promise that will resolve to the requested {@link CubeMap} when loaded.
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} urls is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.
     *
     * @example
     * loadCubeMap(context, {
     *     positiveX : 'skybox_px.png',
     *     negativeX : 'skybox_nx.png',
     *     positiveY : 'skybox_py.png',
     *     negativeY : 'skybox_ny.png',
     *     positiveZ : 'skybox_pz.png',
     *     negativeZ : 'skybox_nz.png'
     * }).then(function(cubeMap) {
     *     // use the cubemap
     * }, function() {
     *     // an error occurred
     * });
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     */
    var loadCubeMap = function(context, urls, allowCrossOrigin) {
        if (typeof context === 'undefined') {
            throw new DeveloperError('context is required.');
        }

        if ((typeof urls === 'undefined') ||
            (typeof urls.positiveX === 'undefined') ||
            (typeof urls.negativeX === 'undefined') ||
            (typeof urls.positiveY === 'undefined') ||
            (typeof urls.negativeY === 'undefined') ||
            (typeof urls.positiveZ === 'undefined') ||
            (typeof urls.negativeZ === 'undefined')) {
            throw new DeveloperError('urls is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.');
        }

        // PERFORMANCE_IDEA: Given the size of some cube maps, we should consider tiling them, which
        // would prevent hiccups when uploading, for example, six 4096x4096 textures to the GPU.
        //
        // Also, it is perhaps acceptable to use the context here in the callbacks, but
        // ideally, we would do it in the primitive's update function.

        var facePromises = [
            loadImage(urls.positiveX, allowCrossOrigin),
            loadImage(urls.negativeX, allowCrossOrigin),
            loadImage(urls.positiveY, allowCrossOrigin),
            loadImage(urls.negativeY, allowCrossOrigin),
            loadImage(urls.positiveZ, allowCrossOrigin),
            loadImage(urls.negativeZ, allowCrossOrigin)
        ];

        return when.all(facePromises, function(images) {
            return context.createCubeMap({
                source : {
                    positiveX : images[0],
                    negativeX : images[1],
                    positiveY : images[2],
                    negativeY : images[3],
                    positiveZ : images[4],
                    negativeZ : images[5]
                }
            });
        });
    };

    return loadCubeMap;
});
