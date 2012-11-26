/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/loadImage',
        '../ThirdParty/when'
    ], function(
        defaultValue,
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
     * @param {Boolean} [crossOrigin=true] Whether to request images using Cross-Origin
     *        Resource Sharing (CORS).  Data URIs are never requested using CORS.
     *
     * @returns {Promise} a promise that will resolve to the requested {@link CubeMap} when loaded.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
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
     */
    var loadCubeMap = function(context, urls, crossOrigin) {
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
            throw new DeveloperError('urls is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties');
        }

        var cubeMap;

        function getCubeMap(image) {
            if (typeof cubeMap === 'undefined') {
                cubeMap = context.createCubeMap({
                    width: image.width,
                    height: image.height
                });
            } else if ((cubeMap.getWidth() !== image.width) || (cubeMap.getHeight() !== image.height)) {
                cubeMap.destroy();
                deferred.reject('Cube map faces do not have the same dimensions.');
            }

            return cubeMap;
        }

        var deferred = when.defer();
        var count = 0;

        function resolveIfFinished() {
            if (++count === 6) {
                deferred.resolve(cubeMap);
            }
        }

        function reject(e) {
            cubeMap.destroy();
            deferred.reject(e);
        }

        // PERFORMANCE_IDEA: Given the size of some cube maps, we should consider tiling them, which
        // would prevent hiccups when uploading, for example, six 4096x4096 textures to the GPU.
        //
        // Also, it is perhaps acceptable to use the context here in the callbacks, but
        // ideally, we would do it in the primitive's update function.

        loadImage(urls.positiveX, crossOrigin).then(function(image) {
            getCubeMap(image).getPositiveX().copyFrom(image);
            resolveIfFinished();
        }, reject);

        loadImage(urls.negativeX, crossOrigin).then(function(image) {
            getCubeMap(image).getNegativeX().copyFrom(image);
            resolveIfFinished();
        }, reject);

        loadImage(urls.positiveY, crossOrigin).then(function(image) {
            getCubeMap(image).getPositiveY().copyFrom(image);
            resolveIfFinished();
        }, reject);

        loadImage(urls.negativeY, crossOrigin).then(function(image) {
            getCubeMap(image).getNegativeY().copyFrom(image);
            resolveIfFinished();
        }, reject);

        loadImage(urls.positiveZ, crossOrigin).then(function(image) {
            getCubeMap(image).getPositiveZ().copyFrom(image);
            resolveIfFinished();
        }, reject);

        loadImage(urls.negativeZ, crossOrigin).then(function(image) {
            getCubeMap(image).getNegativeZ().copyFrom(image);
            resolveIfFinished();
        }, reject);

        return deferred.promise;
    };

    return loadCubeMap;
});
