define([
        './ForEach',
        '../../Core/defined'
    ], function(
        ForEach,
        defined) {
    'use strict';

    function getJointCountForMaterials(gltf) {
        var meshes = gltf.meshes;
        var jointCountForMaterialId = {};

        var nodesForSkinId = {};
        ForEach.node(gltf, function(node) {
            if (defined(node.skin)) {
                if (!defined(nodesForSkinId[node.skin])) {
                    nodesForSkinId[node.skin] = [];
                }
                nodesForSkinId[node.skin].push(node);
            }
        });

        ForEach.skin(gltf, function(skin, skinId) {
            var jointCount = skin.joints.length;
            var meshPrimitiveFunction = function(primitive) {
                jointCountForMaterialId[primitive.material] = jointCount;
            };
            var skinnedNodes = nodesForSkinId[skinId];
            var skinnedNodesLength = skinnedNodes.length;
            for (var i = 0; i < skinnedNodesLength; i++) {
                var skinnedNode = skinnedNodes[i];
                var meshId = skinnedNode.mesh;
                if (defined(meshId)) {
                    var mesh = meshes[meshId];
                    ForEach.meshPrimitive(mesh, meshPrimitiveFunction);
                }
            }
        });

        return jointCountForMaterialId;
    }

    return getJointCountForMaterials;
});
