/*global define*/
define([
        './getUniqueId',
        './findAccessorMinMax',
        '../../Core/Cartesian3',
        '../../Core/Math',
        '../../Core/Matrix4',
        '../../Core/Quaternion',
        '../../Core/WebGLConstants',
        '../../Core/defaultValue',
        '../../Core/defined'
    ], function(
        getUniqueId,
        findAccessorMinMax,
        Cartesian3,
        CesiumMath,
        Matrix4,
        Quaternion,
        WebGLConstants,
        defaultValue,
        defined) {
    'use strict';

    var updateFunctions = {
        '0.8' : glTF08to10,
        '1.0' : glTF10to20,
        '2.0' : null
    };

    /**
     * Update the glTF version to the latest version (2.0), or targetVersion if specified.
     * Applies changes made to the glTF spec between revisions so that the core library
     * only has to handle the latest version.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {Object} [options] Options for updating the glTF.
     * @param {String} [options.targetVersion] The glTF will be upgraded until it hits the specified version.
     * @returns {Object} The updated glTF asset.
     */
    function updateVersion(gltf, options) {
        options = defaultValue(options, {});
        var targetVersion = options.targetVersion;
        var version = gltf.version;

        gltf.asset = defaultValue(gltf.asset, {
            version: '1.0'
        });

        version = defaultValue(version, gltf.asset.version);
        // invalid version, default to 1.0
        if (!updateFunctions.hasOwnProperty(version)) {
            version = '1.0';
        }

        var updateFunction = updateFunctions[version];
        while (defined(updateFunction)) {
            version = gltf.asset.version;
            if (version === targetVersion) {
                break;
            }
            updateFunction(gltf);
            version = gltf.asset.version;
            updateFunction = updateFunctions[version];
        }
        return gltf;
    }

    function updateInstanceTechniques(gltf) {
        var materials = gltf.materials;
        for (var materialId in materials) {
            if (materials.hasOwnProperty(materialId)) {
                var material = materials[materialId];
                var instanceTechnique = material.instanceTechnique;
                if (defined(instanceTechnique)) {
                    material.technique = instanceTechnique.technique;
                    material.values = instanceTechnique.values;
                    delete material.instanceTechnique;
                }
            }
        }
    }

    function setPrimitiveModes(gltf) {
        var meshes = gltf.meshes;
        for (var meshId in meshes) {
            if (meshes.hasOwnProperty(meshId)) {
                var mesh = meshes[meshId];
                var primitives = mesh.primitives;
                if (defined(primitives)) {
                    var primitivesLength = primitives.length;
                    for (var i = 0; i < primitivesLength; i++) {
                        var primitive = primitives[i];
                        var defaultMode = defaultValue(primitive.primitive, WebGLConstants.TRIANGLES);
                        primitive.mode = defaultValue(primitive.mode, defaultMode);
                        delete primitive.primitive;
                    }
                }
            }
        }
    }

    function updateNodes(gltf) {
        var nodes = gltf.nodes;
        var axis = new Cartesian3();
        var quat = new Quaternion();
        for (var nodeId in nodes) {
            if (nodes.hasOwnProperty(nodeId)) {
                var node = nodes[nodeId];
                if (defined(node.rotation)) {
                    var rotation = node.rotation;
                    Cartesian3.fromArray(rotation, 0, axis);
                    Quaternion.fromAxisAngle(axis, rotation[3], quat);
                    node.rotation = [quat.x, quat.y, quat.z, quat.w];
                }
                var instanceSkin = node.instanceSkin;
                if (defined(instanceSkin)) {
                    node.skeletons = instanceSkin.skeletons;
                    node.skin = instanceSkin.skin;
                    node.meshes = instanceSkin.meshes;
                    delete node.instanceSkin;
                }
            }
        }
    }

    function removeTechniquePasses(gltf) {
        var techniques = gltf.techniques;
        for (var techniqueId in techniques) {
            if (techniques.hasOwnProperty(techniqueId)) {
                var technique = techniques[techniqueId];
                var passes = technique.passes;
                if (defined(passes)) {
                    var passName = defaultValue(technique.pass, 'defaultPass');
                    if (passes.hasOwnProperty(passName)) {
                        var pass = passes[passName];
                        var instanceProgram = pass.instanceProgram;
                        technique.attributes = defaultValue(technique.attributes, instanceProgram.attributes);
                        technique.program = defaultValue(technique.program, instanceProgram.program);
                        technique.uniforms = defaultValue(technique.uniforms, instanceProgram.uniforms);
                        technique.states = defaultValue(technique.states, pass.states);
                    }
                    delete technique.passes;
                    delete technique.pass;
                }
            }
        }
    }

    function glTF08to10(gltf) {
        if (!defined(gltf.asset)) {
            gltf.asset = {};
        }
        var asset = gltf.asset;
        asset.version = '1.0';
        // profile should be an object, not a string
        if (!defined(asset.profile) || (typeof asset.profile === 'string')) {
            asset.profile = {};
        }
        // version property should be in asset, not on the root element
        if (defined(gltf.version)) {
            delete gltf.version;
        }
        // material.instanceTechnique properties should be directly on the material
        updateInstanceTechniques(gltf);
        // primitive.primitive should be primitive.mode
        setPrimitiveModes(gltf);
        // node rotation should be quaternion, not axis-angle
        // node.instanceSkin is deprecated
        updateNodes(gltf);
        // technique.pass and techniques.passes are deprecated
        removeTechniquePasses(gltf);
        // gltf.lights -> khrMaterialsCommon.lights
        if (defined(gltf.lights)) {
            var extensions = defaultValue(gltf.extensions, {});
            gltf.extensions = extensions;
            var materialsCommon = defaultValue(extensions.KHR_materials_common, {});
            extensions.KHR_materials_common = materialsCommon;
            materialsCommon.lights = gltf.lights;
            delete gltf.lights;
        }
        // gltf.allExtensions -> extensionsUsed
        if (defined(gltf.allExtensions)) {
            gltf.extensionsUsed = gltf.allExtensions;
            gltf.allExtensions = undefined;
        }
    }

    function stripWebGLRevisionNumber(gltf) {
        var asset = gltf.asset;
        var profile = asset.profile;
        if (defined(profile)) {
            var version = profile.version;
            if (defined(version)) {
                profile.version = version[0] + '.' + version[2];
            }
        }
    }

    var knownExtensions = {
        CESIUM_RTC : true,
        KHR_binary_glTF : true,
        KHR_materials_common : true,
        WEB3D_quantized_attributes : true
    };
    function requireKnownExtensions(gltf) {
        var extensionsUsed = gltf.extensionsUsed;
        gltf.extensionsRequired = defaultValue(gltf.extensionsRequired, []);
        if (defined(extensionsUsed)) {
            var extensionsUsedLength = extensionsUsed.length;
            for (var i = 0; i < extensionsUsedLength; i++) {
                var extension = extensionsUsed[i];
                if (defined(knownExtensions[extension])) {
                    gltf.extensionsRequired.push(extension);
                }
            }
        }
    }

    function addGlExtensionsUsed(gltf) {
        var accessors = gltf.accessors;
        var meshes = gltf.meshes;
        for (var meshId in meshes) {
            if (meshes.hasOwnProperty(meshId)) {
                var mesh = meshes[meshId];
                var primitives = mesh.primitives;
                if (defined(primitives)) {
                    var primitivesLength = primitives.length;
                    for (var i = 0; i < primitivesLength; i++) {
                        var primitive = primitives[i];
                        var indicesAccessorId = primitive.indices;
                        if (defined(indicesAccessorId)) {
                            var indicesAccessor = accessors[indicesAccessorId];
                            if (indicesAccessor.componentType === WebGLConstants.UNSIGNED_INT) {
                                gltf.glExtensionsUsed = ['OES_element_index_uint'];
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    function removeAnimationSamplersIndirection(gltf) {
        var animations = gltf.animations;
        for (var animationId in animations) {
            if (animations.hasOwnProperty(animationId)) {
                var animation = animations[animationId];
                var parameters = animation.parameters;
                if (defined(parameters)) {
                    var samplers = animation.samplers;
                    for (var samplerId in samplers) {
                        if (samplers.hasOwnProperty(samplerId)) {
                            var sampler = samplers[samplerId];
                            sampler.input = parameters[sampler.input];
                            sampler.output = parameters[sampler.output];
                        }
                    }
                    delete animation.parameters;
                }
            }
        }
    }

    function removeBufferType(gltf) {
        var buffers = gltf.buffers;
        for (var bufferId in buffers) {
            if (buffers.hasOwnProperty(bufferId)) {
                var buffer = buffers[bufferId];
                delete buffer.type;
            }
        }
    }

    function makeMaterialValuesArray(gltf) {
        var materials = gltf.materials;
        for (var materialId in materials) {
            if (materials.hasOwnProperty(materialId)) {
                var material = materials[materialId];
                var materialValues = material.values;
                for (var materialValueId in materialValues) {
                    if (materialValues.hasOwnProperty(materialValueId)) {
                        var materialValue = materialValues[materialValueId];
                        if (!Array.isArray(materialValue)) {
                            materialValues[materialValueId] = [materialValue];
                        }
                    }
                }
            }
        }
    }

    function requireAttributeSetIndex(gltf) {
        var meshes = gltf.meshes;
        for (var meshId in meshes) {
            if (meshes.hasOwnProperty(meshId)) {
                var mesh = meshes[meshId];
                var primitives = mesh.primitives;
                if (defined(primitives)) {
                    var primitivesLength = primitives.length;
                    for (var i = 0; i < primitivesLength; i++) {
                        var primitive = primitives[i];
                        var attributes = primitive.attributes;
                        if (defined(attributes)) {
                            var semantics = Object.keys(attributes);
                            var semanticsLength = semantics.length;
                            for (var j = 0; j < semanticsLength; j++) {
                                var semantic = semantics[j];
                                if (semantic === 'TEXCOORD') {
                                    attributes.TEXCOORD_0 = attributes[semantic];
                                    delete attributes[semantic];
                                } else if (semantic === 'COLOR') {
                                    attributes.COLOR_0 = attributes[semantic];
                                    delete attributes[semantic];
                                }
                            }
                        }
                    }
                }
            }
        }
        var techniques = gltf.techniques;
        for (var techniqueId in techniques) {
            if (techniques.hasOwnProperty(techniqueId)) {
                var technique = techniques[techniqueId];
                var techniqueParameters = technique.parameters;
                for (var techniqueParameterId in techniqueParameters) {
                    if (techniqueParameters.hasOwnProperty(techniqueParameterId)) {
                        var techniqueParameter = techniqueParameters[techniqueParameterId];
                        var techniqueParameterSemantic = techniqueParameter.semantic;
                        if (defined(techniqueParameterSemantic)) {
                            if (techniqueParameterSemantic === 'TEXCOORD') {
                                techniqueParameter.semantic = 'TEXCOORD_0';
                            } else if (techniqueParameterSemantic === 'COLOR') {
                                techniqueParameter.semantic = 'COLOR_0';
                            }
                        }
                    }
                }
            }
        }
    }

    var knownSemantics = {
        POSITION: true,
        NORMAL: true,
        TEXCOORD: true,
        COLOR: true,
        JOINT: true,
        WEIGHT: true,
    };
    function underscoreApplicationSpecificSemantics(gltf) {
        var mappedSemantics = {};
        var meshes = gltf.meshes;
        var techniques = gltf.techniques;
        for (var meshId in meshes) {
            if (meshes.hasOwnProperty(meshId)) {
                var mesh = meshes[meshId];
                var primitives = mesh.primitives;
                if (defined(primitives)) {
                    var primitivesLength = primitives.length;
                    for (var i = 0; i < primitivesLength; i++) {
                        var primitive = primitives[i];
                        var attributes = primitive.attributes;
                        if (defined(attributes)) {
                            var semantics = Object.keys(attributes);
                            var semanticsLength = semantics.length;
                            for (var j = 0; j < semanticsLength; j++) {
                                var semantic = semantics[j];
                                if (semantic.charAt(0) !== '_') {
                                    var setIndex = semantic.search(/_[0-9]+/g);
                                    var strippedSemantic = semantic;
                                    if (setIndex >= 0) {
                                        strippedSemantic = semantic.substring(0, setIndex);
                                    }
                                    if (!defined(knownSemantics[strippedSemantic])) {
                                        var attributeValue = attributes[semantic];
                                        delete attributes[semantic];
                                        var newSemantic = '_' + semantic;
                                        attributes[newSemantic] = attributeValue;
                                        mappedSemantics[semantic] = newSemantic;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        for (var techniqueId in techniques) {
            if (techniques.hasOwnProperty(techniqueId)) {
                var technique = techniques[techniqueId];
                var techniqueParameters = technique.parameters;
                for (var techniqueParameterId in techniqueParameters) {
                    if (techniqueParameters.hasOwnProperty(techniqueParameterId)) {
                        var techniqueParameter = techniqueParameters[techniqueParameterId];
                        var mappedSemantic = mappedSemantics[techniqueParameter.semantic];
                        if (defined(mappedSemantic)) {
                            techniqueParameter.semantic = mappedSemantic;
                        }
                    }
                }
            }
        }
    }

    function makeTechniqueValuesArrays(gltf) {
        var techniques = gltf.techniques;
        for (var techniqueId in techniques) {
            if (techniques.hasOwnProperty(techniqueId)) {
                var technique = techniques[techniqueId];
                var techniqueParameters = technique.parameters;
                for (var techniqueParameterId in techniqueParameters) {
                    if (techniqueParameters.hasOwnProperty(techniqueParameterId)) {
                        var techniqueParameter = techniqueParameters[techniqueParameterId];
                        var techniqueParameterValue = techniqueParameter.value;
                        if (defined(techniqueParameterValue) && !Array.isArray(techniqueParameterValue)) {
                            techniqueParameter.value = [techniqueParameterValue];
                        }
                    }
                }
            }
        }
    }

    function removeScissorFromTechniques(gltf) {
        var techniques = gltf.techniques;
        for (var techniqueId in techniques) {
            if (techniques.hasOwnProperty(techniqueId)) {
                var technique = techniques[techniqueId];
                var techniqueStates = technique.states;
                if (defined(techniqueStates)) {
                    var techniqueFunctions = techniqueStates.functions;
                    if (defined(techniqueFunctions)) {
                        delete techniqueFunctions.scissor;
                    }
                    var enableStates = techniqueStates.enable;
                    if (defined(enableStates)) {
                        var scissorIndex = enableStates.indexOf(WebGLConstants.SCISSOR_TEST);
                        if (scissorIndex >= 0) {
                            enableStates.splice(scissorIndex, 1);
                        }
                    }
                }
            }
        }
    }

    function clampTechniqueFunctionStates(gltf) {
        var i;
        var techniques = gltf.techniques;
        for (var techniqueId in techniques) {
            if (techniques.hasOwnProperty(techniqueId)) {
                var technique = techniques[techniqueId];
                var techniqueStates = technique.states;
                if (defined(techniqueStates)) {
                    var functions = techniqueStates.functions;
                    if (defined(functions)) {
                        var blendColor = functions.blendColor;
                        if (defined(blendColor)) {
                            for (i = 0; i < 4; i++) {
                                blendColor[i] = CesiumMath.clamp(blendColor[i], 0.0, 1.0);
                            }
                        }
                        var depthRange = functions.depthRange;
                        if (defined(depthRange)) {
                            depthRange[1] = CesiumMath.clamp(depthRange[1], 0.0, 1.0);
                            depthRange[0] = CesiumMath.clamp(depthRange[0], 0.0, depthRange[1]);
                        }
                    }
                }
            }
        }
    }

    function clampCameraParameters(gltf) {
        var cameras = gltf.cameras;
        for (var cameraId in cameras) {
            if (cameras.hasOwnProperty(cameraId)) {
                var camera = cameras[cameraId];
                var perspective = camera.perspective;
                if (defined(perspective)) {
                    var aspectRatio = perspective.aspectRatio;
                    if (defined(aspectRatio) && aspectRatio === 0.0) {
                        delete perspective.aspectRatio;
                    }
                    var yfov = perspective.yfov;
                    if (defined(yfov) && yfov === 0.0) {
                        perspective.yfov = 1.0;
                    }
                }
            }
        }
    }

    function requireByteLength(gltf) {
        var buffers = gltf.buffers;
        for (var bufferId in buffers) {
            if (buffers.hasOwnProperty(bufferId)) {
                var buffer = buffers[bufferId];
                if (!defined(buffer.byteLength)) {
                    buffer.byteLength = buffer.extras._pipeline.source.length;
                }
            }
        }
        var bufferViews = gltf.bufferViews;
        for (var bufferViewId in bufferViews) {
            if (bufferViews.hasOwnProperty(bufferViewId)) {
                var bufferView = bufferViews[bufferViewId];
                if (!defined(bufferView.byteLength)) {
                    var bufferViewBufferId = bufferView.buffer;
                    var bufferViewBuffer = buffers[bufferViewBufferId];
                    bufferView.byteLength = bufferViewBuffer.byteLength;
                }
            }
        }
    }

    function requireAccessorMinMax(gltf) {
        var accessors = gltf.accessors;
        for (var accessorId in accessors) {
            if (accessors.hasOwnProperty(accessorId)) {
                var accessor = accessors[accessorId];
                if (!defined(accessor.min) || !defined(accessor.max)) {
                    var minMax = findAccessorMinMax(gltf, accessor);
                    accessor.min = minMax.min;
                    accessor.max = minMax.max;
                }
            }
        }
    }

    var scratchTranslation = new Cartesian3();
    var scratchRotation = new Quaternion();
    var scratchScale = new Cartesian3();
    var defaultScale = new Cartesian3(1.0, 1.0, 1.0);
    var scratchMatrix4 = new Matrix4();
    var scratchPreApplyTransform = new Matrix4();
    function getNodeTransform(node) {
        if (defined(node.matrix)) {
            return Matrix4.fromArray(node.matrix);
        } else if (defined(node.translation) || defined(node.rotation) || defined(node.scale)) {
            Cartesian3.ZERO.clone(scratchTranslation);
            if (defined(node.translation)) {
                Cartesian3.unpack(node.translation, scratchTranslation);
            }
            Quaternion.IDENTITY.clone(scratchRotation);
            if (defined(node.rotation)) {
                Quaternion.unpack(node.rotation, scratchRotation);
            }
            defaultScale.clone(scratchScale);
            if (defined(node.scale)) {
                Cartesian3.unpack(node.scale, scratchScale);
            }
            Matrix4.fromTranslationQuaternionRotationScale(scratchTranslation, scratchRotation, scratchScale, scratchMatrix4);
            return scratchMatrix4;
        } else {
            return Matrix4.IDENTITY;
        }
    }

    function separateSkeletonHierarchy(gltf) {
        var nodes = gltf.nodes;
        var scenes = gltf.scenes;

        var skinnedNodes = [];
        var parentNodes = {};

        var i;
        var skeletonIds;

        for (var nodeId in nodes) {
            if (nodes.hasOwnProperty(nodeId)) {
                var node = nodes[nodeId];
                var children = node.children;
                if (defined(children)) {
                    var childrenLength = children.length;
                    for (i = 0; i < childrenLength; i++) {
                        var childNodeId = children[i];
                        parentNodes[childNodeId] = nodeId;
                    }
                }
                var skinId = node.skin;
                skeletonIds = node.skeletons;
                if (defined(skinId) && defined(skeletonIds)) {
                    skinnedNodes.push(nodeId);
                }
            }
        }

        var sceneId = gltf.scene;
        if (defined(sceneId)) {
            var scene = scenes[sceneId];

            var skinnedNodesLength = skinnedNodes.length;
            for (i = 0; i < skinnedNodesLength; i++) {
                var skinnedNodeId = skinnedNodes[i];
                var skinnedNode = nodes[skinnedNodeId];
                skeletonIds = skinnedNode.skeletons;
                var skeletonIdsLength = skeletonIds.length;
                for (var j = 0; j < skeletonIdsLength; j++) {
                    var skeletonId = skeletonIds[j];
                    var parentNodeId = parentNodes[skeletonId];
                    if (defined(parentNodeId)) {
                        var parentNode = nodes[parentNodeId];
                        var parentChildren = parentNode.children;
                        var index = parentChildren.indexOf(skeletonId);
                        parentChildren.splice(index, 1);
                        parentNode.children = parentChildren;
                        Matrix4.IDENTITY.clone(scratchPreApplyTransform);
                        while (defined(parentNode)) {
                            var parentTransform = getNodeTransform(parentNode);
                            Matrix4.multiply(parentTransform, scratchPreApplyTransform, scratchPreApplyTransform);
                            parentNodeId = parentNodes[parentNodeId];
                            parentNode = nodes[parentNodeId];
                        }
                        if (!Matrix4.equals(scratchPreApplyTransform, Matrix4.IDENTITY)) {
                            var newRootNodeId = getUniqueId(gltf, 'root-' + skeletonId);
                            var newRootNode = {
                                children: [],
                                matrix: Matrix4.pack(scratchPreApplyTransform, [], 0),
                                extras: {
                                    _pipeline: {}
                                }
                            };
                            newRootNode.children.push(skeletonId);
                            nodes[newRootNodeId] = newRootNode;
                            skeletonId = newRootNodeId;
                            skeletonIds[j] = newRootNodeId;
                        }
                        scene.nodes.push(skeletonId);
                    }
                }
            }
        }
    }

    function glTF10to20(gltf) {
        if (!defined(gltf.asset)) {
            gltf.asset = {};
        }
        var asset = gltf.asset;
        asset.version = '2.0';
        // profile.version does not include revision number ("1.0.3" -> "1.0")
        stripWebGLRevisionNumber(gltf);
        // move known extensions from extensionsUsed to extensionsRequired
        requireKnownExtensions(gltf);
        // if any index accessors have UNSIGNED_INT componentType, add the WebGL extension OES_element_index_uint
        addGlExtensionsUsed(gltf);
        // animation.samplers now refers directly to accessors and animation.parameters should be removed
        removeAnimationSamplersIndirection(gltf);
        // bufferView.byteLength and buffer.byteLength are required
        requireByteLength(gltf);
        // accessor.min and accessor.max must be defined
        requireAccessorMinMax(gltf);
        // buffer.type is unnecessary and should be removed
        removeBufferType(gltf);
        // material.values should be arrays
        makeMaterialValuesArray(gltf);
        // TEXCOORD and COLOR attributes must be written with a set index (TEXCOORD_#)
        requireAttributeSetIndex(gltf);
        // Add underscores to application-specific parameters
        underscoreApplicationSpecificSemantics(gltf);
        // technique.parameters.value should be arrays
        makeTechniqueValuesArrays(gltf);
        // remove scissor from techniques
        removeScissorFromTechniques(gltf);
        // clamp technique function states to min/max
        clampTechniqueFunctionStates(gltf);
        // clamp camera parameters
        clampCameraParameters(gltf);
        // skeleton hierarchy must be separate from the node hierarchy (a node with jointName cannot contain camera, skeletons, skins, or meshes)
        separateSkeletonHierarchy(gltf);
    }

    return updateVersion;
});
