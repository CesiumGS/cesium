/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartesian3',
        './Cartesian2',
        './EncodedCartesian3',
        './Matrix3',
        './Matrix4',
        './GeographicProjection',
        './ComponentDatatype',
        './PrimitiveType',
        './Tipsify',
        './BoundingSphere',
        './Geometry',
        './GeometryAttribute',
    ], function(
        defaultValue,
        DeveloperError,
        Cartesian3,
        Cartesian2,
        EncodedCartesian3,
        Matrix3,
        Matrix4,
        GeographicProjection,
        ComponentDatatype,
        PrimitiveType,
        Tipsify,
        BoundingSphere,
        Geometry,
        GeometryAttribute) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports GeometryFilters
     *
     * @see Context#createVertexArrayFromGeometry
     */
    var GeometryFilters = {};

    /**
     * Converts a geometry's triangle indices to line indices.  The geometry's <code>indexList</code> with
     * a primitive type of <code>triangles</code>, <code>triangleStrip</code>, or <code>trangleFan</code> is converted to a
     * list of indices with a primitive type of <code>lines</code>.
     * <br /><br />
     * The <code>geometry</code> argument should use the standard layout like the geometry returned by {@link BoxGeometry}.
     * <br /><br />
     * This filter is commonly used to create a wireframe geometry for visual debugging.
     *
     * @param {Geometry} geometry The geometry to filter, which is modified in place.
     *
     * @returns The modified <code>geometry</code> argument, with its triangle indices converted to lines.
     *
     * @example
     * var geometry = new BoxGeometry();
     * geometry = GeometryFilters.toWireframe(geometry);
     */
    GeometryFilters.toWireframe = function(geometry) {
        function addTriangle(lines, i0, i1, i2) {
            lines.push(i0);
            lines.push(i1);

            lines.push(i1);
            lines.push(i2);

            lines.push(i2);
            lines.push(i0);
        }

        function trianglesToLines(triangles) {
            var lines = [];
            var count = triangles.length;
            for ( var i = 0; i < count; i += 3) {
                addTriangle(lines, triangles[i], triangles[i + 1], triangles[i + 2]);
            }

            return lines;
        }

        function triangleStripToLines(triangles) {
            var lines = [];
            var count = triangles.length;

            if (count >= 3) {
                addTriangle(lines, triangles[0], triangles[1], triangles[2]);

                for ( var i = 3; i < count; ++i) {
                    addTriangle(lines, triangles[i - 1], triangles[i], triangles[i - 2]);
                }
            }

            return lines;
        }

        function triangleFanToLines(triangles) {
            var lines = [];

            if (triangles.length > 0) {
                var base = triangles[0];
                var count = triangles.length - 1;
                for ( var i = 1; i < count; ++i) {
                    addTriangle(lines, base, triangles[i], triangles[i + 1]);
                }
            }

            return lines;
        }

        if (typeof geometry !== 'undefined') {
            var indices = geometry.indexList;
            if (typeof indices !== 'undefined') {
                switch (geometry.primitiveType) {
                    case PrimitiveType.TRIANGLES:
                        geometry.indexList = trianglesToLines(indices);
                        break;
                    case PrimitiveType.TRIANGLE_STRIP:
                        geometry.indexList = triangleStripToLines(indices);
                        break;
                    case PrimitiveType.TRIANGLE_FAN:
                        geometry.indexList = triangleFanToLines(indices);
                        break;
                }

                geometry.primitiveType = PrimitiveType.LINES;
            }
        }

        return geometry;
    };

    /**
     * DOC_TBA
     */
    GeometryFilters.createAttributeIndices = function(geometry) {
        var indices = {};

        if (typeof geometry !== 'undefined') {
            var attributes = geometry.attributes;
            var j = 0;

            for ( var name in attributes) {
                if (attributes.hasOwnProperty(name)) {
                    indices[name] = j++;
                }
            }
        }

        return indices;
    };

    /**
     * DOC_TBA
     */
    GeometryFilters.mapAttributeIndices = function(indices, map) {
        var mappedIndices = {};

        if (typeof indices !== 'undefined' && typeof map !== 'undefined') {
            for ( var name in map) {
                if (map.hasOwnProperty(name)) {
                    mappedIndices[map[name]] = indices[name];
                }
            }
        }

        return mappedIndices;
    };

    /**
     * Reorders a geometry's indices to achieve better performance from the GPU's pre-vertex-shader cache.
     * Each list of indices in the geometry's <code>indexList</code> is reordered to keep the same index-vertex correspondence.
     * <br /><br />
     * The <code>geometry</code> argument should use the standard layout like the geometry returned by {@link BoxGeometry}.
     * <br /><br />

     * @param {Geometry} geometry The geometry to filter, which is modified in place.
     *
     * @exception {DeveloperError} All geometry attribute lists must have the same number of attributes.
     *
     * @returns The modified <code>geometry</code> argument, with its vertices and indices reordered for the GPU's pre-vertex-shader cache.
     *
     * @see GeometryFilters.reorderForPostVertexCache
     *
     * @example
     * var geometry = new EllipsoidGeometry(...);
     * geometry = GeometryFilters.reorderForPreVertexCache(geometry);
     */
    GeometryFilters.reorderForPreVertexCache = function(geometry) {
        if (typeof geometry !== 'undefined') {
            var numVertices = Geometry.computeNumberOfVertices(geometry);

            var indexCrossReferenceOldToNew = [];
            for ( var i = 0; i < numVertices; i++) {
                indexCrossReferenceOldToNew[i] = -1;
            }

            //Construct cross reference and reorder indices
            var indexList = geometry.indexList;
            if (typeof indexList !== 'undefined') {
                var indicesIn = indexList;
                var numIndices = indicesIn.length;
                var indicesOut = [];
                var intoIndicesIn = 0;
                var intoIndicesOut = 0;
                var nextIndex = 0;
                var tempIndex;
                while (intoIndicesIn < numIndices) {
                    tempIndex = indexCrossReferenceOldToNew[indicesIn[intoIndicesIn]];
                    if (tempIndex !== -1) {
                        indicesOut[intoIndicesOut] = tempIndex;
                    } else {
                        tempIndex = indicesIn[intoIndicesIn];
                        if (tempIndex >= numVertices) {
                            throw new DeveloperError('Input indices contains a value greater than or equal to the number of vertices');
                        }
                        indexCrossReferenceOldToNew[tempIndex] = nextIndex;

                        indicesOut[intoIndicesOut] = nextIndex;
                        ++nextIndex;
                    }
                    ++intoIndicesIn;
                    ++intoIndicesOut;
                }
                geometry.indexList = indicesOut;
            }

            //Reorder Vertices
            var attributes = geometry.attributes;
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && attributes[property].values) {
                    var elementsIn = attributes[property].values;
                    var intoElementsIn = 0;
                    var numComponents = attributes[property].componentsPerAttribute;
                    var elementsOut = [];
                    while (intoElementsIn < numVertices) {
                        var temp = indexCrossReferenceOldToNew[intoElementsIn];
                        for (i = 0; i < numComponents; i++) {
                            elementsOut[numComponents * temp + i] = elementsIn[numComponents * intoElementsIn + i];
                        }
                        ++intoElementsIn;
                    }
                    attributes[property].values = elementsOut;
                }
            }
        }
        return geometry;
    };

    /**
     * Reorders a geometry's indices to achieve better performance from the GPU's post vertex-shader cache by using the Tipsify algorithm.
     * Each list of indices in the geometry's <code>indexList</code> is optimally reordered.
     * <br /><br />
     * The <code>geometry</code> argument should use the standard layout like the geometry returned by {@link BoxGeometry}.
     * <br /><br />

     * @param {Geometry} geometry The geometry to filter, which is modified in place.
     * @param {Number} [cacheCapacity=24] The number of vertices that can be held in the GPU's vertex cache.
     *
     * @exception {DeveloperError} Geometry's index list must be defined.
     * @exception {DeveloperError} Geometry's index lists' lengths must each be a multiple of three.
     * @exception {DeveloperError} Geometry's index list's maximum index value must be greater than zero.
     * @exception {DeveloperError} cacheCapacity must be greater than two.
     *
     * @returns The modified <code>geometry</code> argument, with its indices optimally reordered for the post-vertex-shader cache.
     *
     * @see GeometryFilters.reorderForPreVertexCache
     * @see Tipsify
     * @see <a href='http://gfx.cs.princeton.edu/pubs/Sander_2007_%3ETR/tipsy.pdf'>
     * Fast Triangle Reordering for Vertex Locality and Reduced Overdraw</a>
     * by Sander, Nehab, and Barczak
     *
     * @example
     * var geometry = new EllipsoidGeometry(...);
     * geometry = GeometryFilters.reorderForPostVertexCache(geometry);
     */
    GeometryFilters.reorderForPostVertexCache = function(geometry, cacheCapacity) {
        if (typeof geometry !== 'undefined') {
            var indices = geometry.indexList;
            if (typeof indices !== 'undefined') {
                var numIndices = indices.length;
                var maximumIndex = 0;
                for ( var j = 0; j < numIndices; j++) {
                    if (indices[j] > maximumIndex) {
                        maximumIndex = indices[j];
                    }
                }
                geometry.indexList = Tipsify.tipsify({
                    indices : indices,
                    maximumIndex : maximumIndex,
                    cacheSize : cacheCapacity
                });
            }
        }
        return geometry;
    };

    GeometryFilters._copyAttributesDescriptions = function(attributes) {
        var newAttributes = {};

        for ( var attribute in attributes) {
            if (attributes.hasOwnProperty(attribute) && attributes[attribute].values) {
                var attr = attributes[attribute];
                newAttributes[attribute] = new GeometryAttribute({
                    componentDatatype : attr.componentDatatype,
                    componentsPerAttribute : attr.componentsPerAttribute,
                    normalize : attr.normalize,
                    values : []
                });
            }
        }

        return newAttributes;
    };

    function copyVertex(destinationAttributes, sourceAttributes, index) {
        for ( var attribute in sourceAttributes) {
            if (sourceAttributes.hasOwnProperty(attribute) && sourceAttributes[attribute].values) {
                var attr = sourceAttributes[attribute];

                for ( var k = 0; k < attr.componentsPerAttribute; ++k) {
                    destinationAttributes[attribute].values.push(attr.values[(index * attr.componentsPerAttribute) + k]);
                }
            }
        }
    }

    /**
     * DOC_TBA.  Old geometry is not guaranteed to be copied.
     *
     * @exception {DeveloperError} geometry.primitiveType must equal to PrimitiveType.TRIANGLES.
     * @exception {DeveloperError} All geometry attribute lists must have the same number of attributes.
     */
    GeometryFilters.fitToUnsignedShortIndices = function(geometry) {
        var geometries = [];

        if (typeof geometry !== 'undefined') {
            if (geometry.primitiveType !== PrimitiveType.TRIANGLES) {
                throw new DeveloperError('geometry.primitiveType must equal to PrimitiveType.TRIANGLES.');
            }

            var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

            // If there's an index list and more than 64K attributes, it is possible that
            // some indices are outside the range of unsigned short [0, 64K - 1]
            var sixtyFourK = 64 * 1024;
            if (typeof geometry.indexList !== 'undefined' && (numberOfVertices > sixtyFourK)) {
                var oldToNewIndex = [];
                var newIndices = [];
                var currentIndex = 0;
                var newAttributes = GeometryFilters._copyAttributesDescriptions(geometry.attributes);

                var originalIndices = geometry.indexList;
                var numberOfIndices = originalIndices.length;

                for ( var j = 0; j < numberOfIndices; j += 3) {
                    // It would be easy to extend this inter-loop to support all primitive-types.

                    var x0 = originalIndices[j];
                    var x1 = originalIndices[j + 1];
                    var x2 = originalIndices[j + 2];

                    var i0 = oldToNewIndex[x0];
                    if (typeof i0 === 'undefined') {
                        i0 = currentIndex++;
                        oldToNewIndex[x0] = i0;

                        copyVertex(newAttributes, geometry.attributes, x0);
                    }

                    var i1 = oldToNewIndex[x1];
                    if (typeof i1 === 'undefined') {
                        i1 = currentIndex++;
                        oldToNewIndex[x1] = i1;

                        copyVertex(newAttributes, geometry.attributes, x1);
                    }

                    var i2 = oldToNewIndex[x2];
                    if (typeof i2 === 'undefined') {
                        i2 = currentIndex++;
                        oldToNewIndex[x2] = i2;

                        copyVertex(newAttributes, geometry.attributes, x2);
                    }

                    newIndices.push(i0);
                    newIndices.push(i1);
                    newIndices.push(i2);

                    if (currentIndex + 3 > sixtyFourK) {
                        geometries.push(new Geometry({
                            attributes : newAttributes,
                            indexList : newIndices,
                            primitiveType : geometry.primitiveType
                        }));

                        // Reset for next vertex-array
                        oldToNewIndex = [];
                        newIndices = [];
                        currentIndex = 0;
                        newAttributes = GeometryFilters._copyAttributesDescriptions(geometry.attributes);
                    }
                }

                if (newIndices.length !== 0) {
                    geometries.push(new Geometry({
                        attributes : newAttributes,
                        indexList : newIndices,
                        primitiveType : geometry.primitiveType
                    }));
                }
            } else {
                // No need to split into multiple geometries
                geometries.push(geometry);
            }
        }

        return geometries;
    };

    /**
     * DOC_TBA
     */
    GeometryFilters.projectTo2D = function(geometry, projection) {
        if (typeof geometry !== 'undefined' && typeof geometry.attributes.position !== 'undefined') {
            projection = typeof projection !== 'undefined' ? projection : new GeographicProjection();
            var ellipsoid = projection.getEllipsoid();

            // Project original positions to 2D.
            var wgs84Positions = geometry.attributes.position.values;
            var projectedPositions = [];

            for ( var i = 0; i < wgs84Positions.length; i += 3) {
                var lonLat = ellipsoid.cartesianToCartographic(new Cartesian3(wgs84Positions[i], wgs84Positions[i + 1], wgs84Positions[i + 2]));
                var projectedLonLat = projection.project(lonLat);
                projectedPositions.push(projectedLonLat.x, projectedLonLat.y);
            }

            // Rename original positions to WGS84 Positions.
            geometry.attributes.position3D = geometry.attributes.position;

            // Replace original positions with 2D projected positions
            geometry.attributes.position2D = {
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : projectedPositions
            };
            delete geometry.attributes.position;
        }

        return geometry;
    };

    var encodedResult = {
        high : 0.0,
        low : 0.0
    };

    /**
     * Encodes floating-point geometry attribute values as two separate attributes to improve
     * rendering precision using the same encoding as {@link EncodedCartesian3}.
     * <p>
     * This is commonly used to create high-precision position vertex attributes.
     * </p>
     *
     * @param {Geometry} geometry The geometry to filter, which is modified in place.
     * @param {String} [attributeName='position'] The name of the attribute.
     * @param {String} [attributeHighName='positionHigh'] The name of the attribute for the encoded high bits.
     * @param {String} [attributeLowName='positionLow'] The name of the attribute for the encoded low bits.
     *
     * @returns The modified <code>geometry</code> argument, with its encoded attribute.
     *
     * @exception {DeveloperError} geometry is required.
     * @exception {DeveloperError} geometry must have attribute matching the attributeName argument.
     * @exception {DeveloperError} The attribute componentDatatype must be ComponentDatatype.FLOAT.
     *
     * @example
     * geometry = GeometryFilters.encodeAttribute(geometry, 'position3D', 'position3DHigh', 'position3DLow');
     *
     * @see EncodedCartesian3
     */
    GeometryFilters.encodeAttribute = function(geometry, attributeName, attributeHighName, attributeLowName) {
        attributeName = defaultValue(attributeName, 'position');
        attributeHighName = defaultValue(attributeHighName, 'positionHigh');
        attributeLowName = defaultValue(attributeLowName, 'positionLow');

        if (typeof geometry === 'undefined') {
            throw new DeveloperError('geometry is required.');
        }

        var attribute = geometry.attributes[attributeName];

        if (typeof attribute === 'undefined') {
            throw new DeveloperError('geometry must have attribute matching the attributeName argument: ' + attributeName + '.');
        }

        if (attribute.componentDatatype !== ComponentDatatype.FLOAT) {
            throw new DeveloperError('The attribute componentDatatype must be ComponentDatatype.FLOAT.');
        }

        var values = attribute.values;
        var length = values.length;
        var highValues = new Array(length);
        var lowValues = new Array(length);

        for (var i = 0; i < length; ++i) {
            EncodedCartesian3.encode(values[i], encodedResult);
            highValues[i] = encodedResult.high;
            lowValues[i] = encodedResult.low;
        }

        geometry.attributes[attributeHighName] = new GeometryAttribute({
            componentDatatype : attribute.componentDatatype,
            componentsPerAttribute : attribute.componentsPerAttribute,
            values : highValues
        });
        geometry.attributes[attributeLowName] = new GeometryAttribute({
            componentDatatype : attribute.componentDatatype,
            componentsPerAttribute : attribute.componentsPerAttribute,
            values : lowValues
        });
        delete geometry.attributes[attributeName];

        return geometry;
    };

    var scratch = new Cartesian3();

    function transformPoint(matrix, attribute) {
        if (typeof attribute !== 'undefined') {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(values, i, scratch);
                Matrix4.multiplyByPoint(matrix, scratch, scratch);
                values[i] = scratch.x;
                values[i + 1] = scratch.y;
                values[i + 2] = scratch.z;
            }
        }
    }

    function transformVector(matrix, attribute) {
        if (typeof attribute !== 'undefined') {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(values, i, scratch);
                Matrix3.multiplyByVector(matrix, scratch, scratch);
                values[i] = scratch.x;
                values[i + 1] = scratch.y;
                values[i + 2] = scratch.z;
            }
        }
    }

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} instance is required.
     */
    GeometryFilters.transformToWorldCoordinates = function(instance) {
        if (typeof instance === 'undefined') {
            throw new DeveloperError('instance is required.');
        }

        var modelMatrix = instance.modelMatrix;

        if (modelMatrix.equals(Matrix4.IDENTITY)) {
            // Already in world coordinates
            return;
        }

        var attributes = instance.geometry.attributes;

        // Transform attributes in known vertex formats
        transformPoint(modelMatrix, attributes.position);

        if ((typeof attributes.normal !== 'undefined') ||
            (typeof attributes.binormal !== 'undefined') ||
            (typeof attributes.tangent !== 'undefined')) {

            var inverseTranspose = new Matrix4();
            var normalMatrix = new Matrix3();
            Matrix4.inverse(modelMatrix, inverseTranspose);
            Matrix4.transpose(inverseTranspose, inverseTranspose);
            Matrix4.getRotation(inverseTranspose, normalMatrix);

            transformVector(normalMatrix, attributes.normal);
            transformVector(normalMatrix, attributes.binormal);
            transformVector(normalMatrix, attributes.tangent);
        }

        var boundingSphere = instance.geometry.boundingSphere;

        if (typeof boundingSphere !== 'undefined') {
            Matrix4.multiplyByPoint(modelMatrix, boundingSphere.center, boundingSphere.center);
            boundingSphere.center = Cartesian3.fromCartesian4(boundingSphere.center);
        }

        instance.modelMatrix = Matrix4.IDENTITY.clone();

        return instance;
    };

    function findAttributesInAllGeometries(instances) {
        var length = instances.length;

        var attributesInAllGeometries = {};

        var attributes0 = instances[0].geometry.attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name)) {
                var attribute = attributes0[name];
                var numberOfComponents = attribute.values.length;
                var inAllGeometries = true;

                // Does this same attribute exist in all geometries?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = instances[i].geometry.attributes[name];

                    if ((typeof otherAttribute === 'undefined') ||
                        (attribute.componentDatatype !== otherAttribute.componentDatatype) ||
                        (attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute) ||
                        (attribute.normalize !== otherAttribute.normalize)) {

                        inAllGeometries = false;
                        break;
                    }

                    numberOfComponents += otherAttribute.values.length;
                }

                if (inAllGeometries) {
                    attributesInAllGeometries[name] = new GeometryAttribute({
                        componentDatatype : attribute.componentDatatype,
                        componentsPerAttribute : attribute.componentsPerAttribute,
                        normalize : attribute.normalize,
// TODO: or new Array()
                        values : attribute.componentDatatype.createTypedArray(numberOfComponents)
                    });
                }
            }
        }

        return attributesInAllGeometries;
    }

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} instances is required and must have length greater than zero.
     * @exception {DeveloperError} All instances must have the same modelMatrix.
     */
    GeometryFilters.combine = function(instances) {
        if ((typeof instances === 'undefined') || (instances.length < 1)) {
            throw new DeveloperError('instances is required and must have length greater than zero.');
        }

        var length = instances.length;

        if (length === 1) {
            return instances[0].geometry;
        }

        var name;
        var i;
        var j;
        var k;

        var m = instances[0].modelMatrix;
        for (i = 1; i < length; ++i) {
            if (!Matrix4.equals(instances[i].modelMatrix, m)) {
                throw new DeveloperError('All instances must have the same modelMatrix.');
            }
        }

        // Find subset of attributes in all geometries
        var attributes = findAttributesInAllGeometries(instances);
        var values;
        var sourceValues;
        var sourceValuesLength;

        // PERFORMANCE_IDEA: Interleave here instead of createVertexArrayFromGeometry to save a copy.
        // This will require adding offset and stride to the geometry.

        // Combine attributes from each geometry into a single typed array
        for (name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                values = attributes[name].values;

                k = 0;
                for (i = 0; i < length; ++i) {
                    sourceValues = instances[i].geometry.attributes[name].values;
                    sourceValuesLength = sourceValues.length;

                    for (j = 0; j < sourceValuesLength; ++j) {
                        values[k++] = sourceValues[j];
                    }
                }
            }
        }

        // PERFORMANCE_IDEA: Could combine with fitToUnsignedShortIndices, but it would start to get ugly
        // and it is not needed when OES_element_index_uint is supported.

        // Combine index lists

        // First, determine the size of a typed array per primitive type
        var primitiveType = instances[0].geometry.primitiveType;
        var numberOfIndices = {};
        var indices;

        for (i = 0; i < length; ++i) {
            indices = instances[i].geometry.indexList;
            numberOfIndices[primitiveType] = (typeof numberOfIndices[primitiveType] !== 'undefined') ?
                (numberOfIndices[primitiveType] += indices.length) : indices.length;
        }

        // Next, allocate a typed array for indices per primitive type
        var combinedIndexLists = [];
        var indexListsByPrimitiveType = {};

        for (name in numberOfIndices) {
            if (numberOfIndices.hasOwnProperty(name)) {
                var num = numberOfIndices[name];

// TODO: or new Array()
                if (num < 60 * 1024) {
                    values = new Uint16Array(num);
                } else {
                    values = new Uint32Array(num);
                }

                combinedIndexLists.push(values);

                indexListsByPrimitiveType[name] = {
                    values : values,
                    currentOffset : 0
                };
            }
        }

        // Finally, combine index lists with the same primitive type
        var offset = 0;

        for (i = 0; i < length; ++i) {
            sourceValues = instances[i].geometry.indexList;
            sourceValuesLength = sourceValues.length;
            var destValues = indexListsByPrimitiveType[primitiveType].values;
            var n = indexListsByPrimitiveType[primitiveType].currentOffset;

            for (k = 0; k < sourceValuesLength; ++k) {
                destValues[n++] = offset + sourceValues[k];
            }

            indexListsByPrimitiveType[primitiveType].currentOffset = n;

            var attrs = instances[i].geometry.attributes;
            for (name in attrs) {
                if (attrs.hasOwnProperty(name)) {
                    offset += attrs[name].values.length / attrs[name].componentsPerAttribute;
                    break;
                }
            }
        }

        // Create bounding sphere that includes all instances
        var boundingSphere;

        for (i = 0; i < length; ++i) {
            var bs = instances[i].geometry.boundingSphere;
            if (typeof bs === 'undefined') {
                // If any geometries have an undefined bounding sphere, then so does the combined geometry
                boundingSphere = undefined;
                break;
            }

            if (typeof boundingSphere === 'undefined') {
                boundingSphere = bs.clone();
            } else {
                BoundingSphere.union(boundingSphere, bs, boundingSphere);
            }
        }

        return new Geometry({
            attributes : attributes,
// TODO: cleanup combinedIndexLists
            indexList : combinedIndexLists[0],
            primitiveType : primitiveType,
            boundingSphere : boundingSphere
        });
    };

    var normal = new Cartesian3();
    var v0 = new Cartesian3();
    var v1 = new Cartesian3();
    var v2 = new Cartesian3();

    /**
     * Computes the normals of all vertices in a geometry based on the normals of triangles that include the vertex.
     * This assumes a counter-clockwise vertex winding order.
     *
     * @param {Geometry} geometry The geometry to filter, which is modified in place.
     * @param {Object} geometry.attributes.position
     *
     * @returns The modified <code>geometry</code> argument.
     *
     * @exception {DeveloperError} geometry.attributes.position.values is required
     * @exception {DeveloperError} geometry.attributes.position.values.length must be a multiple of 3
     *
     * @example
     * geometry = GeometryFilters.computeNormal(geometry);
     *
     */
    GeometryFilters.computeNormal = function(geometry) {
        if (typeof geometry === 'undefined') {
            throw new DeveloperError('geometry is required.');
        }
        var attributes = geometry.attributes;
        if (typeof attributes.position === 'undefined' || typeof attributes.position.values === 'undefined') {
            throw new DeveloperError('geometry.attributes.position.values is required');
        }
        var vertices = geometry.attributes.position.values;
        if (geometry.attributes.position.componentsPerAttribute !== 3 || vertices.length % 3 !== 0) {
            throw new DeveloperError('geometry.attributes.position.values.length must be a multiple of 3');
        }
        var indices = geometry.indexList;
        if (typeof indices === 'undefined') {
            return geometry;
        }

        if (geometry.primitiveType !== PrimitiveType.TRIANGLES || typeof indices === 'undefined' ||
                indices.length < 2 || indices.length % 3 !== 0) {
            return geometry;
        }

        var numVertices = geometry.attributes.position.values.length / 3;
        var numIndices = indices.length;
        var normalsPerVertex = new Array(numVertices);
        var normalsPerTriangle = new Array(numIndices / 3);
        var normalIndices = new Array(numIndices);

        for (var i = 0; i < numVertices; i++) {
            normalsPerVertex[i] = {
                indexOffset : 0,
                count : 0,
                currentCount : 0
            };
        }

        var j = 0;
        for (i = 0; i < numIndices; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];
            var i03 = i0*3;
            var i13 = i1*3;
            var i23 = i2*3;

            v0.x = vertices[i03];
            v0.y = vertices[i03 + 1];
            v0.z = vertices[i03 + 2];
            v1.x = vertices[i13];
            v1.y = vertices[i13 + 1];
            v1.z = vertices[i13 + 2];
            v2.x = vertices[i23];
            v2.y = vertices[i23 + 1];
            v2.z = vertices[i23 + 2];

            normalsPerVertex[i0].count++;
            normalsPerVertex[i1].count++;
            normalsPerVertex[i2].count++;

            v1.subtract(v0, v1);
            v2.subtract(v0, v2);
            normalsPerTriangle[j] = v1.cross(v2);
            j++;
        }

        var indexOffset = 0;
        for (i = 0; i < numVertices; i++) {
            normalsPerVertex[i].indexOffset += indexOffset;
            indexOffset += normalsPerVertex[i].count;
        }

        j = 0;
        var vertexNormalData;
        for (i = 0; i < numIndices; i += 3) {
            vertexNormalData = normalsPerVertex[indices[i]];
            var index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
            normalIndices[index] = j;
            vertexNormalData.currentCount++;

            vertexNormalData = normalsPerVertex[indices[i + 1]];
            index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
            normalIndices[index] = j;
            vertexNormalData.currentCount++;

            vertexNormalData = normalsPerVertex[indices[i + 2]];
            index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
            normalIndices[index] = j;
            vertexNormalData.currentCount++;

            j++;
        }

        if (typeof geometry.attributes.normal === 'undefined') {
            geometry.attributes.normal = new GeometryAttribute({
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                values: new Array(numVertices * 3)
            });
        }
        var normalValues = geometry.attributes.normal.values;
        for (i = 0; i < numVertices; i++) {
            var i3 = i * 3;
            vertexNormalData = normalsPerVertex[i];
            if (vertexNormalData.count > 0) {
                Cartesian3.ZERO.clone(normal);
                for (j = 0; j < vertexNormalData.count; j++) {
                    normal.add(normalsPerTriangle[normalIndices[vertexNormalData.indexOffset + j]], normal);
                }
                normal.normalize(normal);
                normalValues[i3] = normal.x;
                normalValues[i3+1] = normal.y;
                normalValues[i3+2] = normal.z;
            } else {
                normalValues[i3] = 0.0;
                normalValues[i3+1] = 0.0;
                normalValues[i3+2] = 1.0;
            }
        }

        return geometry;
    };

    var normalScratch = new Cartesian3();
    var normalScale = new Cartesian3();
    var tScratch = new Cartesian3();

    /**
     * Computes the tangent and binormal of all vertices in a geometry
     * This assumes a counter-clockwise vertex winding order.
     *
     * Based on: Lengyel, Eric. <a href="http://www.terathon.com/code/tangent.html">Computing Tangent Space Basis Vectors for an Arbitrary Mesh</a>. Terathon Software 3D Graphics Library, 2001.
     *
     * @param {Geometry} geometry The geometry for which to calculate tangents and binormals, which is modified in place.
     * @param {Object} geometry.attributes.position The vertices of the geometry
     * @param {Object} geometry.attributes.normal The normals of the vertices
     * @param {Object} geometry.attributes.st The texture coordinates
     *
     * @returns The modified <code>geometry</code> argument.
     *
     * @exception {DeveloperError} geometry.attributes.position.values is required
     * @exception {DeveloperError} geometry.attributes.position.values.length must be a multiple of 3
     * @exception {DeveloperError} geometry.attributes.normal.values is required
     * @exception {DeveloperError} geometry.attributes.normal.values.length must be a multiple of 3
     * @exception {DeveloperError} geometry.attributes.st.values is required
     * @exception {DeveloperError} geometry.attributes.st.values.length must be a multiple of 2
     *
     * @example
     * geometry = GeometryFilters.computeTangentAndBinormal(geometry);
     */
    GeometryFilters.computeTangentAndBinormal = function(geometry) {
        if (typeof geometry === 'undefined') {
            throw new DeveloperError('geometry is required.');
        }
        var attributes = geometry.attributes;
        if (typeof attributes.position === 'undefined' || typeof attributes.position.values === 'undefined') {
            throw new DeveloperError('geometry.attributes.position.values is required');
        }
        var vertices = geometry.attributes.position.values;
        if (geometry.attributes.position.componentsPerAttribute !== 3 || vertices.length % 3 !== 0) {
            throw new DeveloperError('geometry.attributes.position.values.length must be a multiple of 3');
        }
        if (typeof attributes.normal === 'undefined' || typeof attributes.normal.values === 'undefined') {
            throw new DeveloperError('geometry.attributes.normal.values is required');
        }
        var normals = geometry.attributes.normal.values;
        if (geometry.attributes.normal.componentsPerAttribute !== 3 || normals.length % 3 !== 0) {
            throw new DeveloperError('geometry.attributes.normals.values.length must be a multiple of 3');
        }
        if (typeof attributes.st === 'undefined' || typeof attributes.st.values === 'undefined') {
            throw new DeveloperError('geometry.attributes.st.values is required');
        }
        var st = geometry.attributes.st.values;
        if (geometry.attributes.st.componentsPerAttribute !== 2 || st.length % 2 !== 0) {
            throw new DeveloperError('geometry.attributes.st.values.length must be a multiple of 2');
        }

        var indices = geometry.indexList;
        if (typeof indices === 'undefined') {
            return geometry;
        }

        if (geometry.primitiveType !== PrimitiveType.TRIANGLES || typeof indices === 'undefined' ||
                indices.length < 2 || indices.length % 3 !== 0) {
            return geometry;
        }

        var numVertices = geometry.attributes.position.values.length/3;
        var numIndices = indices.length;
        var tan1 = new Array(numVertices * 3);

        for (var i = 0; i < tan1.length; i++) {
            tan1[i] = 0;
        }

        var i03;
        var i13;
        var i23;
        for (i = 0; i < numIndices; i+=3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];
            i03 = i0*3;
            i13 = i1*3;
            i23 = i2*3;
            var i02 = i0*2;
            var i12 = i1*2;
            var i22 = i2*2;

            var ux = vertices[i03];
            var uy = vertices[i03 + 1];
            var uz = vertices[i03 + 2];

            var wx = st[i02];
            var wy = st[i02 + 1];
            var t1 = st[i12 + 1] - wy;
            var t2 = st[i22 + 1] - wy;

            var r = 1.0 / ((st[i12] - wx) * t2 - (st[i22] - wx) * t1);
            var sdirx = (t2 * (vertices[i13] - ux) - t1 * (vertices[i23] - ux)) * r;
            var sdiry = (t2 * (vertices[i13 + 1] - uy) - t1 * (vertices[i23 + 1] - uy)) * r;
            var sdirz = (t2 * (vertices[i13 + 2] - uz) - t1 * (vertices[i23 + 2] - uz)) * r;

            tan1[i03] += sdirx;
            tan1[i03+1] += sdiry;
            tan1[i03+2] += sdirz;

            tan1[i13] += sdirx;
            tan1[i13+1] += sdiry;
            tan1[i13+2] += sdirz;

            tan1[i23] += sdirx;
            tan1[i23+1] += sdiry;
            tan1[i23+2] += sdirz;
        }
        var binormalValues = new Array(numVertices * 3);
        var tangentValues = new Array(numVertices * 3);
        for (i = 0; i < numVertices; i++) {
            i03 = i * 3;
            i13 = i03 + 1;
            i23 = i03 + 2;

            var n = Cartesian3.fromArray(normals, i03, normalScratch);
            var t = Cartesian3.fromArray(tan1, i03, tScratch);
            var scalar = n.dot(t);
            n.multiplyByScalar(scalar, normalScale);
            t.subtract(normalScale, t).normalize(t);
            tangentValues[i03] = t.x;
            tangentValues[i13] = t.y;
            tangentValues[i23] = t.z;
            n.cross(t, t).normalize(t);
            binormalValues[i03] = t.x;
            binormalValues[i13] = t.y;
            binormalValues[i23] = t.z;
        }
        if (typeof geometry.attributes.tangent === 'undefined') {
            geometry.attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangentValues
            });
        } else {
            geometry.attributes.tangent.values = tangentValues;
        }
        if (typeof geometry.attributes.binormal === 'undefined') {
            geometry.attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormalValues
            });
        } else {
            geometry.attributes.binormal.values = binormalValues;
        }

        return geometry;
    };

    return GeometryFilters;
});
