import ForEach from './ForEach.js'
import defined from '../../Core/defined.js'

    /**
     * Adds extras._pipeline to each object that can have extras in the glTF asset.
     * This stage runs before updateVersion and handles both glTF 1.0 and glTF 2.0 assets.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with the added pipeline extras.
     *
     * @private
     */
    function addPipelineExtras(gltf) {
        ForEach.shader(gltf, function(shader) {
            addExtras(shader);
        });
        ForEach.buffer(gltf, function(buffer) {
            addExtras(buffer);
        });
        ForEach.image(gltf, function (image) {
            addExtras(image);
            ForEach.compressedImage(image, function(compressedImage) {
                addExtras(compressedImage);
            });
        });

        addExtras(gltf);

        return gltf;
    }

    function addExtras(object) {
        object.extras = defined(object.extras) ? object.extras : {};
        object.extras._pipeline = defined(object.extras._pipeline) ? object.extras._pipeline : {};
    }

    export default addPipelineExtras;
