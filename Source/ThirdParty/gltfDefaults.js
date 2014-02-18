/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

    function nodeDefaults(nodes) {
        if (!defined(nodes)) {
            return;
        }

        for (var name in nodes) {
            if (nodes.hasOwnProperty(name)) {
                var node = nodes[name];

                if (!defined(node.matrix)) {
                    // Add default identity matrix if there is no matrix property and no TRS properties
                    if (!(defined(node.translation) && defined(node.rotation) && defined(node.scale))) {
                        node.matrix = [
                            1, 0, 0, 0,
                            0, 1, 0, 0,
                            0, 0, 1, 0,
                            0, 0, 0, 1
                        ];
                    } else {
                        if (!defined(node.translation)) {
                            node.translation = [0.0, 0.0, 0.0];
                        }

                        if (!defined(node.rotation)) {
                            // GLTF_SPEC: What is the default?  https://github.com/KhronosGroup/glTF/issues/197
                            node.rotation = [1.0, 0.0, 0.0, 0.0];
                        }

                        if (!defined(node.scale)) {
                            node.scale = [1.0, 1.0, 1.0];
                        }
                    }
                }
            }
        }
    }

    function textureDefaults(textures) {
        if (!defined(textures)) {
            return;
        }

        for (var name in textures) {
            if (textures.hasOwnProperty(name)) {
                var texture = textures[name];
                // GLTF_SPEC: All optional properties
                texture.type = defaultValue(texture.type, WebGLRenderingContext.UNSIGNED_BYTE);
            }
        }
    }

    /**
     * Modifies gltf in place.
     *
     * @private
     */
    var gltfDefaults = function(gltf) {
        if (!defined(gltf)) {
            return undefined;
        }

        nodeDefaults(gltf.nodes);
        textureDefaults(gltf.textures);

        return gltf;
    };

    return gltfDefaults;
});