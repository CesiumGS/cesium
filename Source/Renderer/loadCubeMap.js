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
     * DOC_TBA
     *
     * @exports loadCubeMap
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

        var cubeMap = undefined;

        function getCubeMap(image) {
            if (typeof cubeMap === 'undefined') {
                cubeMap = context.createCubeMap({
                    width: image.width,
                    height: image.height
                });
            } else if ((cubeMap.getWidth() !== image.width) || (cubeMap.getHeight() !== image.height)) {
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
