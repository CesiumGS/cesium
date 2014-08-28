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
            Matrix4.clone(instances[0].modelMatrix, primitiveModelMatrix);
        }
    }

    function addPickColorAttribute(instances, pickIds) {
        var length = instances.length;

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var geometry = instance.geometry;
            var attributes = geometry.attributes;
            var positionAttr = attributes.position;
            var numberOfComponents = 4 * (positionAttr.values.length / positionAttr.componentsPerAttribute);

            attributes.pickColor = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                values : new Uint8Array(numberOfComponents)
            });

            var pickColor = pickIds[i];
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

    function addPerInstanceAttributes(instances, names) {
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var instanceAttributes = instance.attributes;
            var geometry = instance.geometry;
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
    }

    function geometryPipeline(parameters) {
        var instances = parameters.instances;
        var pickIds = parameters.pickIds;
        var projection = parameters.projection;
        var uintIndexSupport = parameters.elementIndexUintSupported;
        var scene3DOnly = parameters.scene3DOnly;
        var allowPicking = parameters.allowPicking;
        var vertexCacheOptimize = parameters.vertexCacheOptimize;
        var modelMatrix = parameters.modelMatrix;

        var i;
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
                GeometryPipeline.wrapLongitude(instances[i].geometry);
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
                GeometryPipeline.reorderForPostVertexCache(instances[i].geometry);
                GeometryPipeline.reorderForPreVertexCache(instances[i].geometry);
            }
        }

        // Combine into single geometry for better rendering performance.
        var geometry = GeometryPipeline.combine(instances);

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

        if (!uintIndexSupport) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }

        // Unsigned int indices are supported.  No need to break into multiple geometries.
        return [geometry];
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

    function computePerInstanceAttributeLocations(instances, vertexArrays, attributeLocations) {
        var indices = [];

        var names = getCommonPerInstanceAttributeNames(instances);
        var length = instances.length;
        var offsets = {};
        var vaIndices = {};

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var numberOfVertices = Geometry.computeNumberOfVertices(instance.geometry);

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

                    if (!defined(indices[i])) {
                        indices[i] = {};
                    }

                    if (!defined(indices[i][name])) {
                        indices[i][name] = {
                            dirty : false,
                            value : instance.attributes[name].value,
                            indices : []
                        };
                    }

                    var size = attribute.values.length / attribute.componentsPerAttribute;
                    var offset = defaultValue(offsets[name], 0);

                    var count;
                    if (offset + tempVertexCount < size) {
                        count = tempVertexCount;
                        indices[i][name].indices.push({
                            attribute : attribute,
                            offset : offset,
                            count : count
                        });
                        offsets[name] = offset + tempVertexCount;
                    } else {
                        count = size - offset;
                        indices[i][name].indices.push({
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

        return indices;
    }

    /**
     * @private
     */
    var PrimitivePipeline = {};

    /**
     * @private
     */
    PrimitivePipeline.combineGeometry = function(parameters) {
        var geometries = geometryPipeline(parameters);
        var attributeLocations = GeometryPipeline.createAttributeLocations(geometries[0]);

        var instances = parameters.instances;
        var perInstanceAttributeNames = getCommonPerInstanceAttributeNames(instances);

        var perInstanceAttributes = [];
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            var geometry = geometries[i];
            perInstanceAttributes.push(createPerInstanceVAAttributes(geometry, attributeLocations, perInstanceAttributeNames));
        }

        var indices = computePerInstanceAttributeLocations(instances, perInstanceAttributes, attributeLocations);

        return {
            geometries : geometries,
            modelMatrix : parameters.modelMatrix,
            attributeLocations : attributeLocations,
            vaAttributes : perInstanceAttributes,
            vaAttributeLocations : indices
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
            var attributes = geometry.attributes;

            count += 3 + BoundingSphere.packedLength + (defined(geometry.indices) ? geometry.indices.length : 0);

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

            packedData[count++] = geometry.primitiveType;

            BoundingSphere.pack(geometry.boundingSphere, packedData, count);
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
            var primitiveType = packedGeometry[packedGeometryIndex++];

            var boundingSphere = BoundingSphere.unpack(packedGeometry, packedGeometryIndex);
            packedGeometryIndex += BoundingSphere.packedLength;

            var length;
            var values;
            var componentsPerAttribute;
            var attributes = {};
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
            for ( var propertyName in instance) {
                if (instance.hasOwnProperty(propertyName) && defined(instance[propertyName])) {
                    var property = instance[propertyName];
                    count += 3 + (property.indices.length * 3) + property.value.length;
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

            var propertiesToWrite = [];
            for ( var propertyName in instance) {
                if (instance.hasOwnProperty(propertyName) && defined(instance[propertyName])) {
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
            var numAttributes = packedData[i++];
            for (var x = 0; x < numAttributes; x++) {
                var name = stringTable[packedData[i++]];

                var indices = new Array(packedData[i++]);
                for (var indicesIndex = 0; indicesIndex < indices.length; indicesIndex++) {
                    var index = {};
                    index.count = packedData[i++];
                    index.offset = packedData[i++];
                    index.attribute = attributeTable[packedData[i++]];
                    indices[indicesIndex] = index;
                }

                var valueLength = packedData[i++];
                var value = ComponentDatatype.createTypedArray(indices[0].attribute.componentDatatype, valueLength);
                for (var valueIndex = 0; valueIndex < valueLength; valueIndex++) {
                    value[valueIndex] = packedData[i++];
                }

                instance[name] = {
                    dirty : false,
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
            modelMatrix : parameters.modelMatrix
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.unpackCombineGeometryParameters = function(packedParameters) {
        var instances = unpackInstancesForCombine(packedParameters.packedInstances);
        var pickIds = packedParameters.allowPicking ? unpackPickIds(packedParameters.packedPickIds) : undefined;
        var createGeometryResults = packedParameters.createGeometryResults;
        var length = createGeometryResults.length;
        var instanceIndex = 0;

        for (var resultIndex = 0; resultIndex < length; resultIndex++) {
            var geometries = PrimitivePipeline.unpackCreateGeometryResults(createGeometryResults[resultIndex]);
            var geometriesLength = geometries.length;
            for (var geometryIndex = 0; geometryIndex < geometriesLength; geometryIndex++) {
                instances[instanceIndex++].geometry = geometries[geometryIndex];
            }
        }

        var ellipsoid = Ellipsoid.clone(packedParameters.ellipsoid);
        var projection = packedParameters.isGeographic ? new GeographicProjection(ellipsoid) : new WebMercatorProjection(ellipsoid);

        return {
            instances : instances,
            pickIds : pickIds,
            ellipsoid : ellipsoid,
            projection : projection,
            elementIndexUintSupported : packedParameters.elementIndexUintSupported,
            scene3DOnly : packedParameters.scene3DOnly,
            allowPicking : packedParameters.allowPicking,
            vertexCacheOptimize : packedParameters.vertexCacheOptimize,
            modelMatrix : Matrix4.clone(packedParameters.modelMatrix)
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.packCombineGeometryResults = function(results, transferableObjects) {
        transferGeometries(results.geometries, transferableObjects);
        transferPerInstanceAttributes(results.vaAttributes, transferableObjects);

        return {
            geometries : results.geometries,
            attributeLocations : results.attributeLocations,
            vaAttributes : results.vaAttributes,
            packedVaAttributeLocations : packAttributeLocations(results.vaAttributeLocations, transferableObjects),
            modelMatrix : results.modelMatrix
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
            modelMatrix : packedResult.modelMatrix
        };
    };

    return PrimitivePipeline;
});