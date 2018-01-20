define([
        './Check',
        './defined',
        './defineProperties',
        './deprecationWarning',
        './Resource'
    ], function(
        Check,
        defined,
        defineProperties,
        deprecationWarning,
        Resource) {
    'use strict';

    /**
     * Asynchronously loads the given image URL.  Returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.
     *
     * @exports loadImage
     *
     * @param {Resource|String} urlOrResource The source URL of the image.
     * @returns {Promise.<Image>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     *
     * @example
     * // load a single image asynchronously
     * Cesium.loadImage('some/image/url.png').then(function(image) {
     *     // use the loaded image
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImage('image1.png'), loadImage('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadImage(urlOrResource, allowCrossOrigin, request) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('urlOrResource', urlOrResource);
        //>>includeEnd('debug');

        if (defined(request)) {
            deprecationWarning('loadImage.request', 'The request parameter has been deprecated. Set the request property on the Resource parameter.');
        }

        var resource = Resource.createIfNeeded(urlOrResource, {
            request: request
        });

        return resource.fetchImage(false, allowCrossOrigin);
    }

    defineProperties(loadImage, {
        createImage : {
            get : function() {
                return Resource._Implementations.createImage;
            },
            set : function(value) {
                Resource._Implementations.createImage = value;
            }
        },

        defaultCreateImage : {
            get : function() {
                return Resource._DefaultImplementations.createImage;
            }
        }
    });

    return loadImage;
});
