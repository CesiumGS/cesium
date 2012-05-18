/*global define*/
define(function() {
    "use strict";

    // TODO:  Need tests for this when interface is solid.

    /**
     * Jobs for use with {@link <a href="https://github.com/chriso/chain.js">chain.js</a>}.
     * Jobs can be used to asynchronously download resources, such as images, and create
     * function dependencies, e.g., download these images asynchronously, and create a texture for
     * each when the download completes.
     * @exports Jobs
     * @see <a href="https://github.com/chriso/chain.js">chain.js</a>
     */
    var Jobs = {
        /**
         * Creates a function to asynchronously download an image for use with {@link <a href="https://github.com/chriso/chain.js">chain.js</a>}.
         * This allows multiple images to be downloaded in parallel, and other functions to depend on the download as shown in the example below.
         * <br /><br />
         * When a download completes, the image object is available to functions later in the chain via <code>this.images[url]</code>.
         *
         * @param {String} url The url of the image relative the document, i.e., the host html file.
         *
         * @returns {Object} A function to asynchronously download the image for use with chain.js.
         *
         * @see <a href="https://github.com/chriso/chain.js">chain.js</a>
         *
         * @example
         * // Asynchronously download two images, then create textures.
         * run(
         *     Jobs.downloadImage("diffuse.jpg"),
         *     Jobs.downloadImage("specular.jpg")).thenRun(
         * function() {
         *     var diffuseTexture = context.createTexture2D({
         *          source      : this.images["diffuse.jpg"],
         *          pixelFormat : PixelFormat.RGB
         *      });
         *     var specularTexture = context.createTexture2D({
         *          source      : this.images["specular.jpg"],
         *          pixelFormat : PixelFormat.RGB
         *      });
         *     // ...
         * });
         */
        downloadImage : function(url) {
            return function(next) {
                var image = new Image();

                this.images = this.images || {};
                this.images[url] = image;

                image.onload = function() {
                    next();
                };
                image.src = url;
            };
        }
    };

    return Jobs;
});