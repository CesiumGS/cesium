/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/GeographicProjection',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryPipeline',
        '../Core/Matrix4',
        '../Core/WebMercatorProjection',
        './createTaskProcessorWorker'
    ], function(
        defaultValue,
        Color,
        ComponentDatatype,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryPipeline,
        Matrix4,
        WebMercatorProjection,
        createTaskProcessorWorker) {
    "use strict";

    function transformToWorldCoordinates(instances, primitiveModelMatrix, allow3DOnly) {
        var toWorld = !allow3DOnly;
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

                    if ((typeof otherAttribute === 'undefined') ||
                        (attribute.componentDatatype.value !== otherAttribute.componentDatatype.value) ||
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
        var allow3DOnly = parameters.allow3DOnly;
        var vertexCacheOptimize = parameters.vertexCacheOptimize;
        var modelMatrix = parameters.modelMatrix;

        var i;
        var length = instances.length;
        var primitiveType = instances[0].geometry.primitiveType;
        for (i = 1; i < length; ++i) {
            if (instances[i].geometry.primitiveType.value !== primitiveType.value) {
                throw new DeveloperError('All instance geometries must have the same primitiveType.');
            }
        }

        // Unify to world coordinates before combining.
        transformToWorldCoordinates(instances, modelMatrix, allow3DOnly);

        // Clip to IDL
        if (!allow3DOnly) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.wrapLongitude(instances[i].geometry);
            }
        }

        // Add pickColor attribute for picking individual instances
        addPickColorAttribute(instances, pickIds);

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
        if (!allow3DOnly) {
            // Compute 2D positions
            GeometryPipeline.projectTo2D(geometry, projection);

            GeometryPipeline.encodeAttribute(geometry, 'position3D', 'position3DHigh', 'position3DLow');
            GeometryPipeline.encodeAttribute(geometry, 'position2D', 'position2DHigh', 'position2DLow');
        } else {
            GeometryPipeline.encodeAttribute(geometry, 'position', 'position3DHigh', 'position3DLow');
        }

        if (!uintIndexSupport) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }

        // Unsigned int indices are supported.  No need to break into multiple geometries.
        return [geometry];
    }

    function createPerInstanceVAAttributes(geometry, attributeIndices, names) {
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
                index : attributeIndices[name],
                componentDatatype : componentDatatype,
                componentsPerAttribute : attribute.componentsPerAttribute,
                normalize : attribute.normalize,
                values : typedArray
            });

            delete attributes[name];
        }

        return vaAttributes;
    }

    function computePerInstanceAttributeIndices(instances, vertexArrays, attributeIndices) {
        var ids = [];
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
                var index = attributeIndices[name];

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

                    if (typeof ids[i] === 'undefined') {
                        ids[i] = instance.id;
                    }

                    if (typeof indices[i] === 'undefined') {
                        indices[i] = {};
                    }

                    if (typeof indices[i][name] === 'undefined') {
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

        return {
            ids : ids,
            indices : indices
        };
    }

    function combineGeometry(parameters, transferableObjects) {
        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.projection = (parameters.isGeographic) ? new GeographicProjection(parameters.ellipsoid) : new WebMercatorProjection(parameters.ellipsoid);
        parameters.modelMatrix = Matrix4.clone(parameters.modelMatrix);

        var geometries = geometryPipeline(parameters);
        var attributeIndices = GeometryPipeline.createAttributeIndices(geometries[0]);

        var instances = parameters.instances;
        var perInstanceAttributeNames = getCommonPerInstanceAttributeNames(instances);

        var perInstanceAttributes = [];
        var length = geometries.length;
        var i;
        var geometry;

        for (i = 0; i < length; ++i) {
            geometry = geometries[i];
            perInstanceAttributes.push(createPerInstanceVAAttributes(geometry, attributeIndices, perInstanceAttributeNames));
        }

        var indices = computePerInstanceAttributeIndices(instances, perInstanceAttributes, attributeIndices);

        for (i = 0; i < length; ++i) {
            geometry = geometries[i];
            var attributes = geometry.attributes;
            for (var name in attributes) {
                if (attributes.hasOwnProperty(name) &&
                        typeof attributes[name] !== 'undefined' &&
                        typeof attributes[name].values !== 'undefined' &&
                        transferableObjects.indexOf(attributes[name].values.buffer) < 0) {
                    transferableObjects.push(attributes[name].values.buffer);
                }
            }

            if (typeof geometry.indices !== 'undefined') {
                transferableObjects.push(geometry.indices.buffer);
            }
        }

        length = perInstanceAttributes.length;
        for (i = 0; i < length; ++i) {
            var vaAttributes = perInstanceAttributes[i];
            var vaLength = vaAttributes.length;
            for (var j = 0; j < vaLength; ++j) {
                transferableObjects.push(vaAttributes[j].values.buffer);
            }
        }

        return {
            geometries : geometries,
            modelMatrix : parameters.modelMatrix,
            attributeIndices : attributeIndices,
            vaAttributes : perInstanceAttributes,
            vaAttributeIndices : indices
        };
    }

    return createTaskProcessorWorker(combineGeometry);
});
