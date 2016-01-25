/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/FeatureDetection',
        '../Core/GeographicProjection',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryPipeline',
        '../Core/IndexDatatype',
        '../Core/Matrix4',
        '../Core/WebMercatorProjection'
    ], function(
        BoundingSphere,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        FeatureDetection,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryPipeline,
        IndexDatatype,
        Matrix4,
        WebMercatorProjection) {
    "use strict";

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    function transformToWorldCoordinates(instances, primitiveModelMatrix, scene3DOnly) {
        var toWorld = !scene3DOnly;
        var length = instances.length;
        var i;

        if (!toWorld && (length > 1)) {
            var modelMatrix = instances[0].modelMatrix;

            for (i = 1; i < length; ++i) {
                if (!Matrix4.equals(modelMatrix, instances[i].modelMatrix)) {
                    toWorld = true;
                    break;
                }
            }
        }

        if (toWorld) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.transformToWorldCoordinates(instances[i]);
            }
        } else {
            // Leave geometry in local coordinate system; auto update model-matrix.
            Matrix4.multiplyTransformation(primitiveModelMatrix, instances[0].modelMatrix, primitiveModelMatrix);
        }
    }

    function addGeometryPickColor(geometry, pickColor) {
        var attributes = geometry.attributes;
        var positionAttr = attributes.position;
        var numberOfComponents = 4 * (positionAttr.values.length / positionAttr.componentsPerAttribute);

        attributes.pickColor = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true,
            values : new Uint8Array(numberOfComponents)
        });

        var red = Color.floatToByte(pickColor.red);
        var green = Color.floatToByte(pickColor.green);
        var blue = Color.floatToByte(pickColor.blue);
        var alpha = Color.floatToByte(pickColor.alpha);
        var values = attributes.pickColor.values;

        for (var j = 0; j < numberOfComponents; j += 4) {
            values[j] = red;
            values[j + 1] = green;
            values[j + 2] = blue;
            values[j + 3] = alpha;
        }
    }

    function addPickColorAttribute(instances, pickIds) {
        var length = instances.length;

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var pickColor = pickIds[i];

            if (defined(instance.geometry)) {
                addGeometryPickColor(instance.geometry, pickColor);
            } else {
                addGeometryPickColor(instance.westHemisphereGeometry, pickColor);
                addGeometryPickColor(instance.eastHemisphereGeometry, pickColor);
            }
        }
    }

    function getCommonPerInstanceAttributeNames(instances) {
        var length = instances.length;

        var attributesInAllInstances = [];
        var attributes0 = instances[0].attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name)) {
                var attribute = attributes0[name];
                var inAllInstances = true;

                // Does this same attribute exist in all instances?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = instances[i].attributes[name];

                    if (!defined(otherAttribute) ||
                        (attribute.componentDatatype !== otherAttribute.componentDatatype) ||
                        (attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute) ||
                        (attribute.normalize !== otherAttribute.normalize)) {

                        inAllInstances = false;
                        break;
                    }
                }

                if (inAllInstances) {
                    attributesInAllInstances.push(name);
                }
            }
        }

        return attributesInAllInstances;
    }

    function addPerInstanceAttributesToGeometry(instanceAttributes, geometry, names) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        var namesLength = names.length;
        for (var j = 0; j < namesLength; ++j) {
            var name = names[j];
            var attribute = instanceAttributes[name];
            var componentDatatype = attribute.componentDatatype;
            var value = attribute.value;
            var componentsPerAttribute = value.length;

            var buffer = ComponentDatatype.createTypedArray(componentDatatype, numberOfVertices * componentsPerAttribute);
            for (var k = 0; k < numberOfVertices; ++k) {
                buffer.set(value, k * componentsPerAttribute);
            }

            geometry.attributes[name] = new GeometryAttribute({
                componentDatatype : componentDatatype,
                componentsPerAttribute : componentsPerAttribute,
                normalize : attribute.normalize,
                values : buffer
            });
        }
    }

    function addPerInstanceAttributes(instances, names) {
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var instanceAttributes = instance.attributes;

            if (defined(instance.geometry)) {
                addPerInstanceAttributesToGeometry(instanceAttributes, instance.geometry, names);
            } else {
                addPerInstanceAttributesToGeometry(instanceAttributes, instance.westHemisphereGeometry, names);
                addPerInstanceAttributesToGeometry(instanceAttributes, instance.eastHemisphereGeometry, names);
            }
        }
    }

    function geometryPipeline(parameters) {
        var instances = parameters.instances;
        var pickIds = parameters.pickIds;
        var projection = parameters.projection;
        var uintIndexSupport = parameters.elementIndexUintSupported;
        var scene3DOnly = parameters.scene3DOnly;
        var allowPicking = parameters.allowPicking;
        var vertexCacheOptimize = parameters.vertexCacheOptimize;
        var compressVertices = parameters.compressVertices;
        var modelMatrix = parameters.modelMatrix;

        var i;
        var geometry;
        var length = instances.length;
        var primitiveType = instances[0].geometry.primitiveType;

        //>>includeStart('debug', pragmas.debug);
        for (i = 1; i < length; ++i) {
            if (instances[i].geometry.primitiveType !== primitiveType) {
                throw new DeveloperError('All instance geometries must have the same primitiveType.');
            }
        }
        //>>includeEnd('debug');

        // Unify to world coordinates before combining.
        transformToWorldCoordinates(instances, modelMatrix, scene3DOnly);

        // Clip to IDL
        if (!scene3DOnly) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.splitLongitude(instances[i]);
            }
        }

        // Add pickColor attribute for picking individual instances
        if (allowPicking) {
            addPickColorAttribute(instances, pickIds);
        }

        // add attributes to the geometry for each per-instance attribute
        var perInstanceAttributeNames = getCommonPerInstanceAttributeNames(instances);
        addPerInstanceAttributes(instances, perInstanceAttributeNames);

        // Optimize for vertex shader caches
        if (vertexCacheOptimize) {
            for (i = 0; i < length; ++i) {
                var instance = instances[i];
                if (defined(instance.geometry)) {
                    GeometryPipeline.reorderForPostVertexCache(instance.geometry);
                    GeometryPipeline.reorderForPreVertexCache(instance.geometry);
                } else {
                    GeometryPipeline.reorderForPostVertexCache(instance.westHemisphereGeometry);
                    GeometryPipeline.reorderForPreVertexCache(instance.westHemisphereGeometry);

                    GeometryPipeline.reorderForPostVertexCache(instance.eastHemisphereGeometry);
                    GeometryPipeline.reorderForPreVertexCache(instance.eastHemisphereGeometry);
                }
            }
        }

        // Combine into single geometry for better rendering performance.
        var geometries = GeometryPipeline.combineInstances(instances);

        length = geometries.length;
        for (i = 0; i < length; ++i) {
            geometry = geometries[i];

            // Split positions for GPU RTE
            var attributes = geometry.attributes;
            var name;
            if (!scene3DOnly) {
                for (name in attributes) {
                    if (attributes.hasOwnProperty(name) && attributes[name].componentDatatype === ComponentDatatype.DOUBLE) {
                        var name3D = name + '3D';
                        var name2D = name + '2D';

                        // Compute 2D positions
                        GeometryPipeline.projectTo2D(geometry, name, name3D, name2D, projection);
                        if (defined(geometry.boundingSphere) && name === 'position') {
                            geometry.boundingSphereCV = BoundingSphere.fromVertices(geometry.attributes.position2D.values);
                        }

                        GeometryPipeline.encodeAttribute(geometry, name3D, name3D + 'High', name3D + 'Low');
                        GeometryPipeline.encodeAttribute(geometry, name2D, name2D + 'High', name2D + 'Low');
                    }
                }
            } else {
                for (name in attributes) {
                    if (attributes.hasOwnProperty(name) && attributes[name].componentDatatype === ComponentDatatype.DOUBLE) {
                        GeometryPipeline.encodeAttribute(geometry, name, name + '3DHigh', name + '3DLow');
                    }
                }
            }

            // oct encode and pack normals, compress texture coordinates
            if (compressVertices) {
                GeometryPipeline.compressVertices(geometry);
            }
        }

        if (!uintIndexSupport) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            var splitGeometries = [];
            length = geometries.length;
            for (i = 0; i < length; ++i) {
                geometry = geometries[i];
                splitGeometries = splitGeometries.concat(GeometryPipeline.fitToUnsignedShortIndices(geometry));
            }

            geometries = splitGeometries;
        }

        return geometries;
    }

    function createPerInstanceVAAttributes(geometry, attributeLocations, names) {
        var vaAttributes = [];
        var attributes = geometry.attributes;

        var length = names.length;
        for (var i = 0; i < length; ++i) {
            var name = names[i];
            var attribute = attributes[name];

            var componentDatatype = attribute.componentDatatype;
            if (componentDatatype === ComponentDatatype.DOUBLE) {
                componentDatatype = ComponentDatatype.FLOAT;
            }

            var typedArray = ComponentDatatype.createTypedArray(componentDatatype, attribute.values);
            vaAttributes.push({
                index : attributeLocations[name],
                componentDatatype : componentDatatype,
                componentsPerAttribute : attribute.componentsPerAttribute,
                normalize : attribute.normalize,
                values : typedArray
            });

            delete attributes[name];
        }

        return vaAttributes;
    }

    function computePerInstanceAttributeLocationsForGeometry(instanceIndex, geometry, instanceAttributes, names, attributeLocations, vertexArrays, indices, offsets, vaIndices) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        if (!defined(indices[instanceIndex])) {
            indices[instanceIndex] = {
                boundingSphere : geometry.boundingSphere,
                boundingSphereCV : geometry.boundingSphereCV
            };
        }

        var namesLength = names.length;
        for (var j = 0; j < namesLength; ++j) {
            var name = names[j];
            var index = attributeLocations[name];

            var tempVertexCount = numberOfVertices;
            while (tempVertexCount > 0) {
                var vaIndex = defaultValue(vaIndices[name], 0);
                var va = vertexArrays[vaIndex];
                var vaLength = va.length;

                var attribute;
                for (var k = 0; k < vaLength; ++k) {
                    attribute = va[k];
                    if (attribute.index === index) {
                        break;
                    }
                }

                if (!defined(indices[instanceIndex][name])) {
                    indices[instanceIndex][name] = {
                        dirty : false,
                        valid : true,
                        value : instanceAttributes[name].value,
                        indices : []
                    };
                }

                var size = attribute.values.length / attribute.componentsPerAttribute;
                var offset = defaultValue(offsets[name], 0);

                var count;
                if (offset + tempVertexCount < size) {
                    count = tempVertexCount;
                    indices[instanceIndex][name].indices.push({
                        attribute : attribute,
                        offset : offset,
                        count : count
                    });
                    offsets[name] = offset + tempVertexCount;
                } else {
                    count = size - offset;
                    indices[instanceIndex][name].indices.push({
                        attribute : attribute,
                        offset : offset,
                        count : count
                    });
                    offsets[name] = 0;
                    vaIndices[name] = vaIndex + 1;
                }

                tempVertexCount -= count;
            }
        }
    }

    function computePerInstanceAttributeLocations(instances, invalidInstances, vertexArrays, attributeLocations, names) {
        var indices = [];

        var length = instances.length;
        var offsets = {};
        var vaIndices = {};

        var i;
        var instance;
        var attributes;

        for (i = 0; i < length; ++i) {
            instance = instances[i];
            attributes = instance.attributes;
            if (defined(instance.geometry)) {
                computePerInstanceAttributeLocationsForGeometry(i, instance.geometry, attributes, names, attributeLocations, vertexArrays, indices, offsets, vaIndices);
            }
        }

        for (i = 0; i < length; ++i) {
            instance = instances[i];
            attributes = instance.attributes;
            if (defined(instance.westHemisphereGeometry)) {
                computePerInstanceAttributeLocationsForGeometry(i, instance.westHemisphereGeometry, attributes, names, attributeLocations, vertexArrays, indices, offsets, vaIndices);
            }
        }

        for (i = 0; i < length; ++i) {
            instance = instances[i];
            attributes = instance.attributes;
            if (defined(instance.eastHemisphereGeometry)) {
                computePerInstanceAttributeLocationsForGeometry(i, instance.eastHemisphereGeometry, attributes, names, attributeLocations, vertexArrays, indices, offsets, vaIndices);
            }
        }

        length = invalidInstances.length;
        for (i = 0; i < length; ++i) {
            instance = invalidInstances[i];
            attributes = instance.attributes;

            var instanceAttributes = {};
            indices.push(instanceAttributes);

            var namesLength = names.length;
            for (var j = 0; j < namesLength; ++j) {
                var name = names[j];
                instanceAttributes[name] = {
                    dirty : false,
                    valid : false,
                    value : attributes[name].value,
                    indices : []
                };
            }
        }

        return indices;
    }

    function createPickOffsets(instances, geometryName, geometries, pickOffsets) {
        var offset;
        var indexCount;
        var geometryIndex;

        var offsetIndex = pickOffsets.length - 1;
        if (offsetIndex >= 0) {
            var pickOffset = pickOffsets[offsetIndex];
            offset = pickOffset.offset + pickOffset.count;
            geometryIndex = pickOffset.index;
            indexCount = geometries[geometryIndex].indices.length;
        } else {
            offset = 0;
            geometryIndex = 0;
            indexCount = geometries[geometryIndex].indices.length;
        }

        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var geometry = instance[geometryName];
            if (!defined(geometry)) {
                continue;
            }

            var count = geometry.indices.length;

            if (offset + count > indexCount) {
                offset = 0;
                indexCount = geometries[++geometryIndex].indices.length;
            }

            pickOffsets.push({
                index : geometryIndex,
                offset : offset,
                count : count
            });
            offset += count;
        }
    }

    function createInstancePickOffsets(instances, geometries) {
        var pickOffsets = [];
        createPickOffsets(instances, 'geometry', geometries, pickOffsets);
        createPickOffsets(instances, 'westHemisphereGeometry', geometries, pickOffsets);
        createPickOffsets(instances, 'eastHemisphereGeometry', geometries, pickOffsets);
        return pickOffsets;
    }

    /**
     * @private
     */
    var PrimitivePipeline = {};

    /**
     * @private
     */
    PrimitivePipeline.combineGeometry = function(parameters) {
        var geometries;
        var attributeLocations;
        var perInstanceAttributes;
        var perInstanceAttributeNames;
        var length;

        var instances = parameters.instances;
        var invalidInstances = parameters.invalidInstances;

        if (instances.length > 0) {
            geometries = geometryPipeline(parameters);
            attributeLocations = GeometryPipeline.createAttributeLocations(geometries[0]);

            perInstanceAttributeNames = getCommonPerInstanceAttributeNames(instances);

            perInstanceAttributes = [];
            length = geometries.length;
            for (var i = 0; i < length; ++i) {
                var geometry = geometries[i];
                perInstanceAttributes.push(createPerInstanceVAAttributes(geometry, attributeLocations, perInstanceAttributeNames));
            }
        }

        perInstanceAttributeNames = defined(perInstanceAttributeNames) ? perInstanceAttributeNames : getCommonPerInstanceAttributeNames(invalidInstances);
        var indices = computePerInstanceAttributeLocations(instances, invalidInstances, perInstanceAttributes, attributeLocations, perInstanceAttributeNames);

        var pickOffsets;
        if (parameters.createPickOffsets && defined(geometries)) {
            pickOffsets = createInstancePickOffsets(instances, geometries);
        }

        return {
            geometries : geometries,
            modelMatrix : parameters.modelMatrix,
            attributeLocations : attributeLocations,
            vaAttributes : perInstanceAttributes,
            vaAttributeLocations : indices,
            validInstancesIndices : parameters.validInstancesIndices,
            invalidInstancesIndices : parameters.invalidInstancesIndices,
            pickOffsets : pickOffsets
        };
    };

    function transferGeometry(geometry, transferableObjects) {
        var attributes = geometry.attributes;
        for ( var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                var attribute = attributes[name];

                if (defined(attribute) && defined(attribute.values)) {
                    transferableObjects.push(attribute.values.buffer);
                }
            }
        }

        if (defined(geometry.indices)) {
            transferableObjects.push(geometry.indices.buffer);
        }
    }

    function transferGeometries(geometries, transferableObjects) {
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            transferGeometry(geometries[i], transferableObjects);
        }
    }

    /**
     * @private
     */
    function transferPerInstanceAttributes(perInstanceAttributes, transferableObjects) {
        var length = perInstanceAttributes.length;
        for (var i = 0; i < length; ++i) {
            var vaAttributes = perInstanceAttributes[i];
            var vaLength = vaAttributes.length;
            for (var j = 0; j < vaLength; ++j) {
                transferableObjects.push(vaAttributes[j].values.buffer);
            }
        }
    }

    // This function was created by simplifying packCreateGeometryResults into a count-only operation.
    function countCreateGeometryResults(items) {
        var count = 1;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            var geometry = items[i];
            ++count;

            if (!defined(geometry)) {
                continue;
            }

            var attributes = geometry.attributes;

            count += 6 + 2 * BoundingSphere.packedLength + (defined(geometry.indices) ? geometry.indices.length : 0);

            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    var attribute = attributes[property];
                    count += 5 + attribute.values.length;
                }
            }
        }

        return count;
    }

    /**
     * @private
     */
    PrimitivePipeline.packCreateGeometryResults = function(items, transferableObjects) {
        var packedData = new Float64Array(countCreateGeometryResults(items));
        var stringTable = [];
        var stringHash = {};

        var length = items.length;
        var count = 0;
        packedData[count++] = length;
        for (var i = 0; i < length; i++) {
            var geometry = items[i];

            var validGeometry = defined(geometry);
            packedData[count++] = validGeometry ? 1.0 : 0.0;

            if (!validGeometry) {
                continue;
            }

            packedData[count++] = geometry.primitiveType;
            packedData[count++] = geometry.geometryType;

            var validBoundingSphere = defined(geometry.boundingSphere) ? 1.0 : 0.0;
            packedData[count++] = validBoundingSphere;
            if (validBoundingSphere) {
                BoundingSphere.pack(geometry.boundingSphere, packedData, count);
            }

            count += BoundingSphere.packedLength;

            var validBoundingSphereCV = defined(geometry.boundingSphereCV) ? 1.0 : 0.0;
            packedData[count++] = validBoundingSphereCV;
            if (validBoundingSphereCV) {
                BoundingSphere.pack(geometry.boundingSphereCV, packedData, count);
            }

            count += BoundingSphere.packedLength;

            var attributes = geometry.attributes;
            var attributesToWrite = [];
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    attributesToWrite.push(property);
                    if (!defined(stringHash[property])) {
                        stringHash[property] = stringTable.length;
                        stringTable.push(property);
                    }
                }
            }

            packedData[count++] = attributesToWrite.length;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                var attribute = attributes[name];
                packedData[count++] = stringHash[name];
                packedData[count++] = attribute.componentDatatype;
                packedData[count++] = attribute.componentsPerAttribute;
                packedData[count++] = attribute.normalize ? 1 : 0;
                packedData[count++] = attribute.values.length;
                packedData.set(attribute.values, count);
                count += attribute.values.length;
            }

            var indicesLength = defined(geometry.indices) ? geometry.indices.length : 0;
            packedData[count++] = indicesLength;

            if (indicesLength > 0) {
                packedData.set(geometry.indices, count);
                count += indicesLength;
            }
        }

        transferableObjects.push(packedData.buffer);

        return {
            stringTable : stringTable,
            packedData : packedData
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.unpackCreateGeometryResults = function(createGeometryResult) {
        var stringTable = createGeometryResult.stringTable;
        var packedGeometry = createGeometryResult.packedData;

        var i;
        var result = new Array(packedGeometry[0]);
        var resultIndex = 0;

        var packedGeometryIndex = 1;
        while (packedGeometryIndex < packedGeometry.length) {
            var valid = packedGeometry[packedGeometryIndex++] === 1.0;
            if (!valid) {
                result[resultIndex++] = undefined;
                continue;
            }

            var primitiveType = packedGeometry[packedGeometryIndex++];
            var geometryType = packedGeometry[packedGeometryIndex++];

            var boundingSphere;
            var boundingSphereCV;

            var validBoundingSphere = packedGeometry[packedGeometryIndex++] === 1.0;
            if (validBoundingSphere) {
                boundingSphere = BoundingSphere.unpack(packedGeometry, packedGeometryIndex);
            }

            packedGeometryIndex += BoundingSphere.packedLength;

            var validBoundingSphereCV = packedGeometry[packedGeometryIndex++] === 1.0;
            if (validBoundingSphereCV) {
                boundingSphereCV = BoundingSphere.unpack(packedGeometry, packedGeometryIndex);
            }

            packedGeometryIndex += BoundingSphere.packedLength;

            var length;
            var values;
            var componentsPerAttribute;
            var attributes = new GeometryAttributes();
            var numAttributes = packedGeometry[packedGeometryIndex++];
            for (i = 0; i < numAttributes; i++) {
                var name = stringTable[packedGeometry[packedGeometryIndex++]];
                var componentDatatype = packedGeometry[packedGeometryIndex++];
                componentsPerAttribute = packedGeometry[packedGeometryIndex++];
                var normalize = packedGeometry[packedGeometryIndex++] !== 0;

                length = packedGeometry[packedGeometryIndex++];
                values = ComponentDatatype.createTypedArray(componentDatatype, length);
                for (var valuesIndex = 0; valuesIndex < length; valuesIndex++) {
                    values[valuesIndex] = packedGeometry[packedGeometryIndex++];
                }

                attributes[name] = new GeometryAttribute({
                    componentDatatype : componentDatatype,
                    componentsPerAttribute : componentsPerAttribute,
                    normalize : normalize,
                    values : values
                });
            }

            var indices;
            length = packedGeometry[packedGeometryIndex++];

            if (length > 0) {
                var numberOfVertices = values.length / componentsPerAttribute;
                indices = IndexDatatype.createTypedArray(numberOfVertices, length);
                for (i = 0; i < length; i++) {
                    indices[i] = packedGeometry[packedGeometryIndex++];
                }
            }

            result[resultIndex++] = new Geometry({
                primitiveType : primitiveType,
                geometryType : geometryType,
                boundingSphere : boundingSphere,
                indices : indices,
                attributes : attributes
            });
        }

        return result;
    };

    function packPickIds(pickIds, transferableObjects) {
        var length = pickIds.length;
        var packedPickIds = new Uint32Array(pickIds.length);
        for (var i = 0; i < length; ++i) {
            packedPickIds[i] = pickIds[i].toRgba();
        }
        transferableObjects.push(packedPickIds.buffer);
        return packedPickIds;
    }

    function unpackPickIds(packedPickIds) {
        var length = packedPickIds.length;
        var pickIds = new Array(length);
        for (var i = 0; i < length; i++) {
            pickIds[i] = Color.fromRgba(packedPickIds[i]);
        }
        return pickIds;
    }

    // This function was created by simplifying packInstancesForCombine into a count-only operation.
    function countInstancesForCombine(instances) {
        var length = instances.length;
        var count = 1 + (length * 17);
        for (var i = 0; i < length; i++) {
            var attributes = instances[i].attributes;
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    var attribute = attributes[property];
                    count += 5 + attribute.value.length;
                }
            }
        }
        return count;
    }

    function packInstancesForCombine(instances, transferableObjects) {
        var packedData = new Float64Array(countInstancesForCombine(instances));
        var stringHash = {};
        var stringTable = [];

        var length = instances.length;
        var count = 0;
        packedData[count++] = length;
        for (var i = 0; i < length; i++) {
            var instance = instances[i];

            Matrix4.pack(instance.modelMatrix, packedData, count);
            count += Matrix4.packedLength;

            var attributes = instance.attributes;
            var attributesToWrite = [];
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    attributesToWrite.push(property);
                    if (!defined(stringHash[property])) {
                        stringHash[property] = stringTable.length;
                        stringTable.push(property);
                    }
                }
            }

            packedData[count++] = attributesToWrite.length;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                var attribute = attributes[name];
                packedData[count++] = stringHash[name];
                packedData[count++] = attribute.componentDatatype;
                packedData[count++] = attribute.componentsPerAttribute;
                packedData[count++] = attribute.normalize;
                packedData[count++] = attribute.value.length;
                packedData.set(attribute.value, count);
                count += attribute.value.length;
            }
        }
        transferableObjects.push(packedData.buffer);

        return {
            stringTable : stringTable,
            packedData : packedData
        };
    }

    function unpackInstancesForCombine(data) {
        var packedInstances = data.packedData;
        var stringTable = data.stringTable;
        var result = new Array(packedInstances[0]);
        var count = 0;

        var i = 1;
        while (i < packedInstances.length) {
            var modelMatrix = Matrix4.unpack(packedInstances, i);
            i += Matrix4.packedLength;

            var attributes = {};
            var numAttributes = packedInstances[i++];
            for (var x = 0; x < numAttributes; x++) {
                var name = stringTable[packedInstances[i++]];
                var componentDatatype = packedInstances[i++];
                var componentsPerAttribute = packedInstances[i++];
                var normalize = packedInstances[i++] !== 0;
                var length = packedInstances[i++];
                var value = ComponentDatatype.createTypedArray(componentDatatype, length);
                for (var valueIndex = 0; valueIndex < length; valueIndex++) {
                    value[valueIndex] = packedInstances[i++];
                }

                attributes[name] = {
                    componentDatatype : componentDatatype,
                    componentsPerAttribute : componentsPerAttribute,
                    normalize : normalize,
                    value : value
                };
            }

            result[count++] = {
                attributes : attributes,
                modelMatrix : modelMatrix
            };
        }

        return result;
    }

    // This function was created by simplifying packAttributeLocations into a count-only operation.
    function countAttributeLocations(attributeLocations) {
        var length = attributeLocations.length;
        var count = 1 + length;
        for (var i = 0; i < length; i++) {
            var instance = attributeLocations[i];

            count += 2;
            count += defined(instance.boundingSphere) ? BoundingSphere.packedLength : 0.0;
            count += defined(instance.boundingSphereCV) ? BoundingSphere.packedLength : 0.0;

            for ( var propertyName in instance) {
                if (instance.hasOwnProperty(propertyName) && defined(instance[propertyName]) &&
                        propertyName !== 'boundingSphere' && propertyName !== 'boundingSphereCV') {
                    var property = instance[propertyName];
                    count += 4 + (property.indices.length * 3) + property.value.length;
                }
            }
        }
        return count;
    }

    function packAttributeLocations(attributeLocations, transferableObjects) {
        var packedData = new Float64Array(countAttributeLocations(attributeLocations));
        var stringTable = [];
        var attributeTable = [];

        var stringHash = {};
        var length = attributeLocations.length;
        var count = 0;
        packedData[count++] = length;
        for (var i = 0; i < length; i++) {
            var instance = attributeLocations[i];

            var boundingSphere = instance.boundingSphere;
            var hasBoundingSphere = defined(boundingSphere);
            packedData[count++] = hasBoundingSphere ? 1.0 : 0.0;
            if (hasBoundingSphere) {
                BoundingSphere.pack(boundingSphere, packedData, count);
                count += BoundingSphere.packedLength;
            }

            boundingSphere = instance.boundingSphereCV;
            hasBoundingSphere = defined(boundingSphere);
            packedData[count++] = hasBoundingSphere ? 1.0 : 0.0;
            if (hasBoundingSphere) {
                BoundingSphere.pack(boundingSphere, packedData, count);
                count += BoundingSphere.packedLength;
            }

            var propertiesToWrite = [];
            for ( var propertyName in instance) {
                if (instance.hasOwnProperty(propertyName) && defined(instance[propertyName]) &&
                        propertyName !== 'boundingSphere' && propertyName !== 'boundingSphereCV') {
                    propertiesToWrite.push(propertyName);
                    if (!defined(stringHash[propertyName])) {
                        stringHash[propertyName] = stringTable.length;
                        stringTable.push(propertyName);
                    }
                }
            }

            packedData[count++] = propertiesToWrite.length;
            for (var q = 0; q < propertiesToWrite.length; q++) {
                var name = propertiesToWrite[q];
                var property = instance[name];
                packedData[count++] = stringHash[name];
                packedData[count++] = property.valid ? 1.0 : 0.0;

                var indices = property.indices;
                var indicesLength = indices.length;
                packedData[count++] = indicesLength;
                for (var x = 0; x < indicesLength; x++) {
                    var index = indices[x];
                    packedData[count++] = index.count;
                    packedData[count++] = index.offset;
                    var tableIndex = attributeTable.indexOf(index.attribute);
                    if (tableIndex === -1) {
                        tableIndex = attributeTable.length;
                        attributeTable.push(index.attribute);
                    }
                    packedData[count++] = tableIndex;
                }

                packedData[count++] = property.value.length;
                packedData.set(property.value, count);
                count += property.value.length;
            }
        }

        transferableObjects.push(packedData.buffer);

        return {
            stringTable : stringTable,
            packedData : packedData,
            attributeTable : attributeTable
        };
    }

    function unpackAttributeLocations(packedAttributeLocations, vaAttributes) {
        var stringTable = packedAttributeLocations.stringTable;
        var attributeTable = packedAttributeLocations.attributeTable;
        var packedData = packedAttributeLocations.packedData;

        var attributeLocations = new Array(packedData[0]);
        var attributeLocationsIndex = 0;
        var i = 1;
        var packedDataLength = packedData.length;
        while (i < packedDataLength) {
            var instance = {};

            var hasBoundingSphere = packedData[i++] === 1.0;
            if (hasBoundingSphere) {
                instance.boundingSphere = BoundingSphere.unpack(packedData, i);
                i += BoundingSphere.packedLength;
            }

            hasBoundingSphere = packedData[i++] === 1.0;
            if (hasBoundingSphere) {
                instance.boundingSphereCV = BoundingSphere.unpack(packedData, i);
                i += BoundingSphere.packedLength;
            }

            var numAttributes = packedData[i++];
            for (var x = 0; x < numAttributes; x++) {
                var name = stringTable[packedData[i++]];
                var valid = packedData[i++] === 1.0;

                var indicesLength = packedData[i++];
                var indices = indicesLength > 0 ? new Array(indicesLength) : undefined;
                for (var indicesIndex = 0; indicesIndex < indicesLength; indicesIndex++) {
                    var index = {};
                    index.count = packedData[i++];
                    index.offset = packedData[i++];
                    index.attribute = attributeTable[packedData[i++]];
                    indices[indicesIndex] = index;
                }

                var valueLength = packedData[i++];
                var value = valid ? ComponentDatatype.createTypedArray(indices[0].attribute.componentDatatype, valueLength) : new Array(valueLength);
                for (var valueIndex = 0; valueIndex < valueLength; valueIndex++) {
                    value[valueIndex] = packedData[i++];
                }

                instance[name] = {
                    dirty : false,
                    valid : valid,
                    indices : indices,
                    value : value
                };
            }
            attributeLocations[attributeLocationsIndex++] = instance;
        }

        return attributeLocations;
    }

    /**
     * @private
     */
    PrimitivePipeline.packCombineGeometryParameters = function(parameters, transferableObjects) {
        var createGeometryResults = parameters.createGeometryResults;
        var length = createGeometryResults.length;

        for (var i = 0; i < length; i++) {
            transferableObjects.push(createGeometryResults[i].packedData.buffer);
        }

        var packedPickIds;
        if (parameters.allowPicking) {
            packedPickIds = packPickIds(parameters.pickIds, transferableObjects);
        }

        return {
            createGeometryResults : parameters.createGeometryResults,
            packedInstances : packInstancesForCombine(parameters.instances, transferableObjects),
            packedPickIds : packedPickIds,
            ellipsoid : parameters.ellipsoid,
            isGeographic : parameters.projection instanceof GeographicProjection,
            elementIndexUintSupported : parameters.elementIndexUintSupported,
            scene3DOnly : parameters.scene3DOnly,
            allowPicking : parameters.allowPicking,
            vertexCacheOptimize : parameters.vertexCacheOptimize,
            compressVertices : parameters.compressVertices,
            modelMatrix : parameters.modelMatrix,
            createPickOffsets : parameters.createPickOffsets
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.unpackCombineGeometryParameters = function(packedParameters) {
        var instances = unpackInstancesForCombine(packedParameters.packedInstances);
        var allowPicking = packedParameters.allowPicking;
        var pickIds = allowPicking ? unpackPickIds(packedParameters.packedPickIds) : undefined;
        var createGeometryResults = packedParameters.createGeometryResults;
        var length = createGeometryResults.length;
        var instanceIndex = 0;

        var validInstances = [];
        var invalidInstances = [];
        var validInstancesIndices = [];
        var invalidInstancesIndices = [];
        var validPickIds = [];

        for (var resultIndex = 0; resultIndex < length; resultIndex++) {
            var geometries = PrimitivePipeline.unpackCreateGeometryResults(createGeometryResults[resultIndex]);
            var geometriesLength = geometries.length;
            for (var geometryIndex = 0; geometryIndex < geometriesLength; geometryIndex++) {
                var geometry = geometries[geometryIndex];
                var instance = instances[instanceIndex];

                if (defined(geometry)) {
                    instance.geometry = geometry;
                    validInstances.push(instance);
                    validInstancesIndices.push(instanceIndex);
                    if (allowPicking) {
                        validPickIds.push(pickIds[instanceIndex]);
                    }
                } else {
                    invalidInstances.push(instance);
                    invalidInstancesIndices.push(instanceIndex);
                }

                ++instanceIndex;
            }
        }

        var ellipsoid = Ellipsoid.clone(packedParameters.ellipsoid);
        var projection = packedParameters.isGeographic ? new GeographicProjection(ellipsoid) : new WebMercatorProjection(ellipsoid);

        return {
            instances : validInstances,
            invalidInstances : invalidInstances,
            validInstancesIndices : validInstancesIndices,
            invalidInstancesIndices : invalidInstancesIndices,
            pickIds : validPickIds,
            ellipsoid : ellipsoid,
            projection : projection,
            elementIndexUintSupported : packedParameters.elementIndexUintSupported,
            scene3DOnly : packedParameters.scene3DOnly,
            allowPicking : packedParameters.allowPicking,
            vertexCacheOptimize : packedParameters.vertexCacheOptimize,
            compressVertices : packedParameters.compressVertices,
            modelMatrix : Matrix4.clone(packedParameters.modelMatrix),
            createPickOffsets : packedParameters.createPickOffsets
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.packCombineGeometryResults = function(results, transferableObjects) {
        if (defined(results.geometries)) {
            transferGeometries(results.geometries, transferableObjects);
            transferPerInstanceAttributes(results.vaAttributes, transferableObjects);
        }

        return {
            geometries : results.geometries,
            attributeLocations : results.attributeLocations,
            vaAttributes : results.vaAttributes,
            packedVaAttributeLocations : packAttributeLocations(results.vaAttributeLocations, transferableObjects),
            modelMatrix : results.modelMatrix,
            validInstancesIndices : results.validInstancesIndices,
            invalidInstancesIndices : results.invalidInstancesIndices,
            pickOffsets : results.pickOffsets
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.unpackCombineGeometryResults = function(packedResult) {
        return {
            geometries : packedResult.geometries,
            attributeLocations : packedResult.attributeLocations,
            vaAttributes : packedResult.vaAttributes,
            perInstanceAttributeLocations : unpackAttributeLocations(packedResult.packedVaAttributeLocations, packedResult.vaAttributes),
            modelMatrix : packedResult.modelMatrix,
            pickOffsets : packedResult.pickOffsets
        };
    };

    return PrimitivePipeline;
});