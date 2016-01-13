/*global define*/
define([
        './AttributeCompression',
        './barycentricCoordinates',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './Cartographic',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './EncodedCartesian3',
        './GeographicProjection',
        './Geometry',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryType',
        './IndexDatatype',
        './Intersect',
        './IntersectionTests',
        './Math',
        './Matrix3',
        './Matrix4',
        './Plane',
        './PrimitiveType',
        './Tipsify'
    ], function(
        AttributeCompression,
        barycentricCoordinates,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        EncodedCartesian3,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        GeometryType,
        IndexDatatype,
        Intersect,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        Matrix4,
        Plane,
        PrimitiveType,
        Tipsify) {
    "use strict";

    /**
     * Content pipeline functions for geometries.
     *
     * @exports GeometryPipeline
     *
     * @see Geometry
     */
    var GeometryPipeline = {};

    function addTriangle(lines, index, i0, i1, i2) {
        lines[index++] = i0;
        lines[index++] = i1;

        lines[index++] = i1;
        lines[index++] = i2;

        lines[index++] = i2;
        lines[index] = i0;
    }

    function trianglesToLines(triangles) {
        var count = triangles.length;
        var size = (count / 3) * 6;
        var lines = IndexDatatype.createTypedArray(count, size);

        var index = 0;
        for ( var i = 0; i < count; i += 3, index += 6) {
            addTriangle(lines, index, triangles[i], triangles[i + 1], triangles[i + 2]);
        }

        return lines;
    }

    function triangleStripToLines(triangles) {
        var count = triangles.length;
        if (count >= 3) {
            var size = (count - 2) * 6;
            var lines = IndexDatatype.createTypedArray(count, size);

            addTriangle(lines, 0, triangles[0], triangles[1], triangles[2]);
            var index = 6;

            for ( var i = 3; i < count; ++i, index += 6) {
                addTriangle(lines, index, triangles[i - 1], triangles[i], triangles[i - 2]);
            }

            return lines;
        }

        return new Uint16Array();
    }

    function triangleFanToLines(triangles) {
        if (triangles.length > 0) {
            var count = triangles.length - 1;
            var size = (count - 1) * 6;
            var lines = IndexDatatype.createTypedArray(count, size);

            var base = triangles[0];
            var index = 0;
            for ( var i = 1; i < count; ++i, index += 6) {
                addTriangle(lines, index, base, triangles[i], triangles[i + 1]);
            }

            return lines;
        }

        return new Uint16Array();
    }

    /**
     * Converts a geometry's triangle indices to line indices.  If the geometry has an <code>indices</code>
     * and its <code>primitiveType</code> is <code>TRIANGLES</code>, <code>TRIANGLE_STRIP</code>,
     * <code>TRIANGLE_FAN</code>, it is converted to <code>LINES</code>; otherwise, the geometry is not changed.
     * <p>
     * This is commonly used to create a wireframe geometry for visual debugging.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its triangle indices converted to lines.
     *
     * @exception {DeveloperError} geometry.primitiveType must be TRIANGLES, TRIANGLE_STRIP, or TRIANGLE_FAN.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.toWireframe(geometry);
     */
    GeometryPipeline.toWireframe = function(geometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        //>>includeEnd('debug');

        var indices = geometry.indices;
        if (defined(indices)) {
            switch (geometry.primitiveType) {
                case PrimitiveType.TRIANGLES:
                    geometry.indices = trianglesToLines(indices);
                    break;
                case PrimitiveType.TRIANGLE_STRIP:
                    geometry.indices = triangleStripToLines(indices);
                    break;
                case PrimitiveType.TRIANGLE_FAN:
                    geometry.indices = triangleFanToLines(indices);
                    break;
                default:
                    throw new DeveloperError('geometry.primitiveType must be TRIANGLES, TRIANGLE_STRIP, or TRIANGLE_FAN.');
            }

            geometry.primitiveType = PrimitiveType.LINES;
        }

        return geometry;
    };

    /**
     * Creates a new {@link Geometry} with <code>LINES</code> representing the provided
     * attribute (<code>attributeName</code>) for the provided geometry.  This is used to
     * visualize vector attributes like normals, binormals, and tangents.
     *
     * @param {Geometry} geometry The <code>Geometry</code> instance with the attribute.
     * @param {String} [attributeName='normal'] The name of the attribute.
     * @param {Number} [length=10000.0] The length of each line segment in meters.  This can be negative to point the vector in the opposite direction.
     * @returns {Geometry} A new <code>Geometry</code> instance with line segments for the vector.
     *
     * @exception {DeveloperError} geometry.attributes must have an attribute with the same name as the attributeName parameter.
     *
     * @example
     * var geometry = Cesium.GeometryPipeline.createLineSegmentsForVectors(instance.geometry, 'binormal', 100000.0);
     */
    GeometryPipeline.createLineSegmentsForVectors = function(geometry, attributeName, length) {
        attributeName = defaultValue(attributeName, 'normal');

        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(geometry.attributes.position)) {
            throw new DeveloperError('geometry.attributes.position is required.');
        }
        if (!defined(geometry.attributes[attributeName])) {
            throw new DeveloperError('geometry.attributes must have an attribute with the same name as the attributeName parameter, ' + attributeName + '.');
        }
        //>>includeEnd('debug');

        length = defaultValue(length, 10000.0);

        var positions = geometry.attributes.position.values;
        var vectors = geometry.attributes[attributeName].values;
        var positionsLength = positions.length;

        var newPositions = new Float64Array(2 * positionsLength);

        var j = 0;
        for (var i = 0; i < positionsLength; i += 3) {
            newPositions[j++] = positions[i];
            newPositions[j++] = positions[i + 1];
            newPositions[j++] = positions[i + 2];

            newPositions[j++] = positions[i] + (vectors[i] * length);
            newPositions[j++] = positions[i + 1] + (vectors[i + 1] * length);
            newPositions[j++] = positions[i + 2] + (vectors[i + 2] * length);
        }

        var newBoundingSphere;
        var bs = geometry.boundingSphere;
        if (defined(bs)) {
            newBoundingSphere = new BoundingSphere(bs.center, bs.radius + length);
        }

        return new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : newPositions
                })
            },
            primitiveType : PrimitiveType.LINES,
            boundingSphere : newBoundingSphere
        });
    };

    /**
     * Creates an object that maps attribute names to unique locations (indices)
     * for matching vertex attributes and shader programs.
     *
     * @param {Geometry} geometry The geometry, which is not modified, to create the object for.
     * @returns {Object} An object with attribute name / index pairs.
     *
     * @example
     * var attributeLocations = Cesium.GeometryPipeline.createAttributeLocations(geometry);
     * // Example output
     * // {
     * //   'position' : 0,
     * //   'normal' : 1
     * // }
     */
    GeometryPipeline.createAttributeLocations = function(geometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        //>>includeEnd('debug')

        // There can be a WebGL performance hit when attribute 0 is disabled, so
        // assign attribute locations to well-known attributes.
        var semantics = [
            'position',
            'positionHigh',
            'positionLow',

            // From VertexFormat.position - after 2D projection and high-precision encoding
            'position3DHigh',
            'position3DLow',
            'position2DHigh',
            'position2DLow',

            // From Primitive
            'pickColor',

            // From VertexFormat
            'normal',
            'st',
            'binormal',
            'tangent',

            // From compressing texture coordinates and normals
            'compressedAttributes'
        ];

        var attributes = geometry.attributes;
        var indices = {};
        var j = 0;
        var i;
        var len = semantics.length;

        // Attribute locations for well-known attributes
        for (i = 0; i < len; ++i) {
            var semantic = semantics[i];

            if (defined(attributes[semantic])) {
                indices[semantic] = j++;
            }
        }

        // Locations for custom attributes
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name) && (!defined(indices[name]))) {
                indices[name] = j++;
            }
        }

        return indices;
    };

    /**
     * Reorders a geometry's attributes and <code>indices</code> to achieve better performance from the GPU's pre-vertex-shader cache.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its attributes and indices reordered for the GPU's pre-vertex-shader cache.
     *
     * @exception {DeveloperError} Each attribute array in geometry.attributes must have the same number of attributes.
     *
     *
     * @example
     * geometry = Cesium.GeometryPipeline.reorderForPreVertexCache(geometry);
     * 
     * @see GeometryPipeline.reorderForPostVertexCache
     */
    GeometryPipeline.reorderForPreVertexCache = function(geometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        //>>includeEnd('debug');

        var numVertices = Geometry.computeNumberOfVertices(geometry);

        var indices = geometry.indices;
        if (defined(indices)) {
            var indexCrossReferenceOldToNew = new Int32Array(numVertices);
            for ( var i = 0; i < numVertices; i++) {
                indexCrossReferenceOldToNew[i] = -1;
            }

            // Construct cross reference and reorder indices
            var indicesIn = indices;
            var numIndices = indicesIn.length;
            var indicesOut = IndexDatatype.createTypedArray(numVertices, numIndices);

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
                    indexCrossReferenceOldToNew[tempIndex] = nextIndex;

                    indicesOut[intoIndicesOut] = nextIndex;
                    ++nextIndex;
                }
                ++intoIndicesIn;
                ++intoIndicesOut;
            }
            geometry.indices = indicesOut;

            // Reorder attributes
            var attributes = geometry.attributes;
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) &&
                        defined(attributes[property]) &&
                        defined(attributes[property].values)) {

                    var attribute = attributes[property];
                    var elementsIn = attribute.values;
                    var intoElementsIn = 0;
                    var numComponents = attribute.componentsPerAttribute;
                    var elementsOut = ComponentDatatype.createTypedArray(attribute.componentDatatype, nextIndex * numComponents);
                    while (intoElementsIn < numVertices) {
                        var temp = indexCrossReferenceOldToNew[intoElementsIn];
                        if (temp !== -1) {
                            for (i = 0; i < numComponents; i++) {
                                elementsOut[numComponents * temp + i] = elementsIn[numComponents * intoElementsIn + i];
                            }
                        }
                        ++intoElementsIn;
                    }
                    attribute.values = elementsOut;
                }
            }
        }

        return geometry;
    };

    /**
     * Reorders a geometry's <code>indices</code> to achieve better performance from the GPU's
     * post vertex-shader cache by using the Tipsify algorithm.  If the geometry <code>primitiveType</code>
     * is not <code>TRIANGLES</code> or the geometry does not have an <code>indices</code>, this function has no effect.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @param {Number} [cacheCapacity=24] The number of vertices that can be held in the GPU's vertex cache.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its indices reordered for the post-vertex-shader cache.
     *
     * @exception {DeveloperError} cacheCapacity must be greater than two.
     *
     *
     * @example
     * geometry = Cesium.GeometryPipeline.reorderForPostVertexCache(geometry);
     * 
     * @see GeometryPipeline.reorderForPreVertexCache
     * @see {@link http://gfx.cs.princ0eton.edu/pubs/Sander_2007_%3ETR/tipsy.pdf|Fast Triangle Reordering for Vertex Locality and Reduced Overdraw}
     * by Sander, Nehab, and Barczak
     */
    GeometryPipeline.reorderForPostVertexCache = function(geometry, cacheCapacity) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        //>>includeEnd('debug');

        var indices = geometry.indices;
        if ((geometry.primitiveType === PrimitiveType.TRIANGLES) && (defined(indices))) {
            var numIndices = indices.length;
            var maximumIndex = 0;
            for ( var j = 0; j < numIndices; j++) {
                if (indices[j] > maximumIndex) {
                    maximumIndex = indices[j];
                }
            }
            geometry.indices = Tipsify.tipsify({
                indices : indices,
                maximumIndex : maximumIndex,
                cacheSize : cacheCapacity
            });
        }

        return geometry;
    };

    function copyAttributesDescriptions(attributes) {
        var newAttributes = {};

        for ( var attribute in attributes) {
            if (attributes.hasOwnProperty(attribute) &&
                    defined(attributes[attribute]) &&
                    defined(attributes[attribute].values)) {

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
    }

    function copyVertex(destinationAttributes, sourceAttributes, index) {
        for ( var attribute in sourceAttributes) {
            if (sourceAttributes.hasOwnProperty(attribute) &&
                    defined(sourceAttributes[attribute]) &&
                    defined(sourceAttributes[attribute].values)) {

                var attr = sourceAttributes[attribute];

                for ( var k = 0; k < attr.componentsPerAttribute; ++k) {
                    destinationAttributes[attribute].values.push(attr.values[(index * attr.componentsPerAttribute) + k]);
                }
            }
        }
    }

    /**
     * Splits a geometry into multiple geometries, if necessary, to ensure that indices in the
     * <code>indices</code> fit into unsigned shorts.  This is used to meet the WebGL requirements
     * when unsigned int indices are not supported.
     * <p>
     * If the geometry does not have any <code>indices</code>, this function has no effect.
     * </p>
     *
     * @param {Geometry} geometry The geometry to be split into multiple geometries.
     * @returns {Geometry[]} An array of geometries, each with indices that fit into unsigned shorts.
     *
     * @exception {DeveloperError} geometry.primitiveType must equal to PrimitiveType.TRIANGLES, PrimitiveType.LINES, or PrimitiveType.POINTS
     * @exception {DeveloperError} All geometry attribute lists must have the same number of attributes.
     *
     * @example
     * var geometries = Cesium.GeometryPipeline.fitToUnsignedShortIndices(geometry);
     */
    GeometryPipeline.fitToUnsignedShortIndices = function(geometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if ((defined(geometry.indices)) &&
            ((geometry.primitiveType !== PrimitiveType.TRIANGLES) &&
             (geometry.primitiveType !== PrimitiveType.LINES) &&
             (geometry.primitiveType !== PrimitiveType.POINTS))) {
            throw new DeveloperError('geometry.primitiveType must equal to PrimitiveType.TRIANGLES, PrimitiveType.LINES, or PrimitiveType.POINTS.');
        }
        //>>includeEnd('debug');

        var geometries = [];

        // If there's an index list and more than 64K attributes, it is possible that
        // some indices are outside the range of unsigned short [0, 64K - 1]
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);
        if (defined(geometry.indices) && (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES)) {
            var oldToNewIndex = [];
            var newIndices = [];
            var currentIndex = 0;
            var newAttributes = copyAttributesDescriptions(geometry.attributes);

            var originalIndices = geometry.indices;
            var numberOfIndices = originalIndices.length;

            var indicesPerPrimitive;

            if (geometry.primitiveType === PrimitiveType.TRIANGLES) {
                indicesPerPrimitive = 3;
            } else if (geometry.primitiveType === PrimitiveType.LINES) {
                indicesPerPrimitive = 2;
            } else if (geometry.primitiveType === PrimitiveType.POINTS) {
                indicesPerPrimitive = 1;
            }

            for ( var j = 0; j < numberOfIndices; j += indicesPerPrimitive) {
                for (var k = 0; k < indicesPerPrimitive; ++k) {
                    var x = originalIndices[j + k];
                    var i = oldToNewIndex[x];
                    if (!defined(i)) {
                        i = currentIndex++;
                        oldToNewIndex[x] = i;
                        copyVertex(newAttributes, geometry.attributes, x);
                    }
                    newIndices.push(i);
                }

                if (currentIndex + indicesPerPrimitive >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
                    geometries.push(new Geometry({
                        attributes : newAttributes,
                        indices : newIndices,
                        primitiveType : geometry.primitiveType,
                        boundingSphere : geometry.boundingSphere,
                        boundingSphereCV : geometry.boundingSphereCV
                    }));

                    // Reset for next vertex-array
                    oldToNewIndex = [];
                    newIndices = [];
                    currentIndex = 0;
                    newAttributes = copyAttributesDescriptions(geometry.attributes);
                }
            }

            if (newIndices.length !== 0) {
                geometries.push(new Geometry({
                    attributes : newAttributes,
                    indices : newIndices,
                    primitiveType : geometry.primitiveType,
                    boundingSphere : geometry.boundingSphere,
                    boundingSphereCV : geometry.boundingSphereCV
                }));
            }
        } else {
            // No need to split into multiple geometries
            geometries.push(geometry);
        }

        return geometries;
    };

    var scratchProjectTo2DCartesian3 = new Cartesian3();
    var scratchProjectTo2DCartographic = new Cartographic();

    /**
     * Projects a geometry's 3D <code>position</code> attribute to 2D, replacing the <code>position</code>
     * attribute with separate <code>position3D</code> and <code>position2D</code> attributes.
     * <p>
     * If the geometry does not have a <code>position</code>, this function has no effect.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @param {String} attributeName The name of the attribute.
     * @param {String} attributeName3D The name of the attribute in 3D.
     * @param {String} attributeName2D The name of the attribute in 2D.
     * @param {Object} [projection=new GeographicProjection()] The projection to use.
     * @returns {Geometry} The modified <code>geometry</code> argument with <code>position3D</code> and <code>position2D</code> attributes.
     *
     * @exception {DeveloperError} geometry must have attribute matching the attributeName argument.
     * @exception {DeveloperError} The attribute componentDatatype must be ComponentDatatype.DOUBLE.
     * @exception {DeveloperError} Could not project a point to 2D.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.projectTo2D(geometry, 'position', 'position3D', 'position2D');
     */
    GeometryPipeline.projectTo2D = function(geometry, attributeName, attributeName3D, attributeName2D, projection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(attributeName)) {
            throw new DeveloperError('attributeName is required.');
        }
        if (!defined(attributeName3D)) {
            throw new DeveloperError('attributeName3D is required.');
        }
        if (!defined(attributeName2D)) {
            throw new DeveloperError('attributeName2D is required.');
        }
        if (!defined(geometry.attributes[attributeName])) {
            throw new DeveloperError('geometry must have attribute matching the attributeName argument: ' + attributeName + '.');
        }
        if (geometry.attributes[attributeName].componentDatatype !== ComponentDatatype.DOUBLE) {
            throw new DeveloperError('The attribute componentDatatype must be ComponentDatatype.DOUBLE.');
        }
        //>>includeEnd('debug');

        var attribute = geometry.attributes[attributeName];
        projection = (defined(projection)) ? projection : new GeographicProjection();
        var ellipsoid = projection.ellipsoid;

        // Project original values to 2D.
        var values3D = attribute.values;
        var projectedValues = new Float64Array(values3D.length);
        var index = 0;

        for ( var i = 0; i < values3D.length; i += 3) {
            var value = Cartesian3.fromArray(values3D, i, scratchProjectTo2DCartesian3);

            var lonLat = ellipsoid.cartesianToCartographic(value, scratchProjectTo2DCartographic);
            if (!defined(lonLat)) {
                throw new DeveloperError('Could not project point (' + value.x + ', ' + value.y + ', ' + value.z + ') to 2D.');
            }

            var projectedLonLat = projection.project(lonLat, scratchProjectTo2DCartesian3);

            projectedValues[index++] = projectedLonLat.x;
            projectedValues[index++] = projectedLonLat.y;
            projectedValues[index++] = projectedLonLat.z;
        }

        // Rename original cartesians to WGS84 cartesians.
        geometry.attributes[attributeName3D] = attribute;

        // Replace original cartesians with 2D projected cartesians
        geometry.attributes[attributeName2D] = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : projectedValues
        });
        delete geometry.attributes[attributeName];

        return geometry;
    };

    var encodedResult = {
        high : 0.0,
        low : 0.0
    };

    /**
     * Encodes floating-point geometry attribute values as two separate attributes to improve
     * rendering precision.
     * <p>
     * This is commonly used to create high-precision position vertex attributes.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @param {String} attributeName The name of the attribute.
     * @param {String} attributeHighName The name of the attribute for the encoded high bits.
     * @param {String} attributeLowName The name of the attribute for the encoded low bits.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its encoded attribute.
     *
     * @exception {DeveloperError} geometry must have attribute matching the attributeName argument.
     * @exception {DeveloperError} The attribute componentDatatype must be ComponentDatatype.DOUBLE.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.encodeAttribute(geometry, 'position3D', 'position3DHigh', 'position3DLow');
     */
    GeometryPipeline.encodeAttribute = function(geometry, attributeName, attributeHighName, attributeLowName) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(attributeName)) {
            throw new DeveloperError('attributeName is required.');
        }
        if (!defined(attributeHighName)) {
            throw new DeveloperError('attributeHighName is required.');
        }
        if (!defined(attributeLowName)) {
            throw new DeveloperError('attributeLowName is required.');
        }
        if (!defined(geometry.attributes[attributeName])) {
            throw new DeveloperError('geometry must have attribute matching the attributeName argument: ' + attributeName + '.');
        }
        if (geometry.attributes[attributeName].componentDatatype !== ComponentDatatype.DOUBLE) {
            throw new DeveloperError('The attribute componentDatatype must be ComponentDatatype.DOUBLE.');
        }
        //>>includeEnd('debug');

        var attribute = geometry.attributes[attributeName];
        var values = attribute.values;
        var length = values.length;
        var highValues = new Float32Array(length);
        var lowValues = new Float32Array(length);

        for (var i = 0; i < length; ++i) {
            EncodedCartesian3.encode(values[i], encodedResult);
            highValues[i] = encodedResult.high;
            lowValues[i] = encodedResult.low;
        }

        var componentsPerAttribute = attribute.componentsPerAttribute;

        geometry.attributes[attributeHighName] = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : componentsPerAttribute,
            values : highValues
        });
        geometry.attributes[attributeLowName] = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : componentsPerAttribute,
            values : lowValues
        });
        delete geometry.attributes[attributeName];

        return geometry;
    };

    var scratchCartesian3 = new Cartesian3();

    function transformPoint(matrix, attribute) {
        if (defined(attribute)) {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.unpack(values, i, scratchCartesian3);
                Matrix4.multiplyByPoint(matrix, scratchCartesian3, scratchCartesian3);
                Cartesian3.pack(scratchCartesian3, values, i);
            }
        }
    }

    function transformVector(matrix, attribute) {
        if (defined(attribute)) {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.unpack(values, i, scratchCartesian3);
                Matrix3.multiplyByVector(matrix, scratchCartesian3, scratchCartesian3);
                scratchCartesian3 = Cartesian3.normalize(scratchCartesian3, scratchCartesian3);
                Cartesian3.pack(scratchCartesian3, values, i);
            }
        }
    }

    var inverseTranspose = new Matrix4();
    var normalMatrix = new Matrix3();

    /**
     * Transforms a geometry instance to world coordinates.  This changes
     * the instance's <code>modelMatrix</code> to {@link Matrix4.IDENTITY} and transforms the
     * following attributes if they are present: <code>position</code>, <code>normal</code>,
     * <code>binormal</code>, and <code>tangent</code>.
     *
     * @param {GeometryInstance} instance The geometry instance to modify.
     * @returns {GeometryInstance} The modified <code>instance</code> argument, with its attributes transforms to world coordinates.
     *
     * @example
     * Cesium.GeometryPipeline.transformToWorldCoordinates(instance);
     */
    GeometryPipeline.transformToWorldCoordinates = function(instance) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(instance)) {
            throw new DeveloperError('instance is required.');
        }
        //>>includeEnd('debug');

        var modelMatrix = instance.modelMatrix;

        if (Matrix4.equals(modelMatrix, Matrix4.IDENTITY)) {
            // Already in world coordinates
            return instance;
        }

        var attributes = instance.geometry.attributes;

        // Transform attributes in known vertex formats
        transformPoint(modelMatrix, attributes.position);
        transformPoint(modelMatrix, attributes.prevPosition);
        transformPoint(modelMatrix, attributes.nextPosition);

        if ((defined(attributes.normal)) ||
            (defined(attributes.binormal)) ||
            (defined(attributes.tangent))) {

            Matrix4.inverse(modelMatrix, inverseTranspose);
            Matrix4.transpose(inverseTranspose, inverseTranspose);
            Matrix4.getRotation(inverseTranspose, normalMatrix);

            transformVector(normalMatrix, attributes.normal);
            transformVector(normalMatrix, attributes.binormal);
            transformVector(normalMatrix, attributes.tangent);
        }

        var boundingSphere = instance.geometry.boundingSphere;

        if (defined(boundingSphere)) {
            instance.geometry.boundingSphere = BoundingSphere.transform(boundingSphere, modelMatrix, boundingSphere);
        }

        instance.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

        return instance;
    };

    function findAttributesInAllGeometries(instances, propertyName) {
        var length = instances.length;

        var attributesInAllGeometries = {};

        var attributes0 = instances[0][propertyName].attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name) &&
                    defined(attributes0[name]) &&
                    defined(attributes0[name].values)) {

                var attribute = attributes0[name];
                var numberOfComponents = attribute.values.length;
                var inAllGeometries = true;

                // Does this same attribute exist in all geometries?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = instances[i][propertyName].attributes[name];

                    if ((!defined(otherAttribute)) ||
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
                        values : ComponentDatatype.createTypedArray(attribute.componentDatatype, numberOfComponents)
                    });
                }
            }
        }

        return attributesInAllGeometries;
    }

    var tempScratch = new Cartesian3();

    function combineGeometries(instances, propertyName) {
        var length = instances.length;

        var name;
        var i;
        var j;
        var k;

        var m = instances[0].modelMatrix;
        var haveIndices = (defined(instances[0][propertyName].indices));
        var primitiveType = instances[0][propertyName].primitiveType;

        //>>includeStart('debug', pragmas.debug);
        for (i = 1; i < length; ++i) {
            if (!Matrix4.equals(instances[i].modelMatrix, m)) {
                throw new DeveloperError('All instances must have the same modelMatrix.');
            }
            if ((defined(instances[i][propertyName].indices)) !== haveIndices) {
                throw new DeveloperError('All instance geometries must have an indices or not have one.');
            }
            if (instances[i][propertyName].primitiveType !== primitiveType) {
                throw new DeveloperError('All instance geometries must have the same primitiveType.');
            }
        }
        //>>includeEnd('debug');

        // Find subset of attributes in all geometries
        var attributes = findAttributesInAllGeometries(instances, propertyName);
        var values;
        var sourceValues;
        var sourceValuesLength;

        // Combine attributes from each geometry into a single typed array
        for (name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                values = attributes[name].values;

                k = 0;
                for (i = 0; i < length; ++i) {
                    sourceValues = instances[i][propertyName].attributes[name].values;
                    sourceValuesLength = sourceValues.length;

                    for (j = 0; j < sourceValuesLength; ++j) {
                        values[k++] = sourceValues[j];
                    }
                }
            }
        }

        // Combine index lists
        var indices;

        if (haveIndices) {
            var numberOfIndices = 0;
            for (i = 0; i < length; ++i) {
                numberOfIndices += instances[i][propertyName].indices.length;
            }

            var numberOfVertices = Geometry.computeNumberOfVertices(new Geometry({
                attributes : attributes,
                primitiveType : PrimitiveType.POINTS
            }));
            var destIndices = IndexDatatype.createTypedArray(numberOfVertices, numberOfIndices);

            var destOffset = 0;
            var offset = 0;

            for (i = 0; i < length; ++i) {
                var sourceIndices = instances[i][propertyName].indices;
                var sourceIndicesLen = sourceIndices.length;

                for (k = 0; k < sourceIndicesLen; ++k) {
                    destIndices[destOffset++] = offset + sourceIndices[k];
                }

                offset += Geometry.computeNumberOfVertices(instances[i][propertyName]);
            }

            indices = destIndices;
        }

        // Create bounding sphere that includes all instances
        var center = new Cartesian3();
        var radius = 0.0;
        var bs;

        for (i = 0; i < length; ++i) {
            bs = instances[i][propertyName].boundingSphere;
            if (!defined(bs)) {
                // If any geometries have an undefined bounding sphere, then so does the combined geometry
                center = undefined;
                break;
            }

            Cartesian3.add(bs.center, center, center);
        }

        if (defined(center)) {
            Cartesian3.divideByScalar(center, length, center);

            for (i = 0; i < length; ++i) {
                bs = instances[i][propertyName].boundingSphere;
                var tempRadius = Cartesian3.magnitude(Cartesian3.subtract(bs.center, center, tempScratch)) + bs.radius;

                if (tempRadius > radius) {
                    radius = tempRadius;
                }
            }
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : primitiveType,
            boundingSphere : (defined(center)) ? new BoundingSphere(center, radius) : undefined
        });
    }

    /**
     * Combines geometry from several {@link GeometryInstance} objects into one geometry.
     * This concatenates the attributes, concatenates and adjusts the indices, and creates
     * a bounding sphere encompassing all instances.
     * <p>
     * If the instances do not have the same attributes, a subset of attributes common
     * to all instances is used, and the others are ignored.
     * </p>
     * <p>
     * This is used by {@link Primitive} to efficiently render a large amount of static data.
     * </p>
     * 
     * @private
     *
     * @param {GeometryInstance[]} [instances] The array of {@link GeometryInstance} objects whose geometry will be combined.
     * @returns {Geometry} A single geometry created from the provided geometry instances.
     *
     * @exception {DeveloperError} All instances must have the same modelMatrix.
     * @exception {DeveloperError} All instance geometries must have an indices or not have one.
     * @exception {DeveloperError} All instance geometries must have the same primitiveType.
     *
     *
     * @example
     * for (var i = 0; i < instances.length; ++i) {
     *   Cesium.GeometryPipeline.transformToWorldCoordinates(instances[i]);
     * }
     * var geometries = Cesium.GeometryPipeline.combineInstances(instances);
     * 
     * @see GeometryPipeline.transformToWorldCoordinates
     */
    GeometryPipeline.combineInstances = function(instances) {
        //>>includeStart('debug', pragmas.debug);
        if ((!defined(instances)) || (instances.length < 1)) {
            throw new DeveloperError('instances is required and must have length greater than zero.');
        }
        //>>includeEnd('debug');

        var instanceGeometry = [];
        var instanceSplitGeometry = [];
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            if (defined(instance.geometry)) {
                instanceGeometry.push(instance);
            } else {
                instanceSplitGeometry.push(instance);
            }
        }

        var geometries = [];
        if (instanceGeometry.length > 0) {
            geometries.push(combineGeometries(instanceGeometry, 'geometry'));
        }

        if (instanceSplitGeometry.length > 0) {
            geometries.push(combineGeometries(instanceSplitGeometry, 'westHemisphereGeometry'));
            geometries.push(combineGeometries(instanceSplitGeometry, 'eastHemisphereGeometry'));
        }

        return geometries;
    };

    var normal = new Cartesian3();
    var v0 = new Cartesian3();
    var v1 = new Cartesian3();
    var v2 = new Cartesian3();

    /**
     * Computes per-vertex normals for a geometry containing <code>TRIANGLES</code> by averaging the normals of
     * all triangles incident to the vertex.  The result is a new <code>normal</code> attribute added to the geometry.
     * This assumes a counter-clockwise winding order.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument with the computed <code>normal</code> attribute.
     *
     * @exception {DeveloperError} geometry.indices length must be greater than 0 and be a multiple of 3.
     * @exception {DeveloperError} geometry.primitiveType must be {@link PrimitiveType.TRIANGLES}.
     *
     * @example
     * Cesium.GeometryPipeline.computeNormal(geometry);
     */
    GeometryPipeline.computeNormal = function(geometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(geometry.attributes.position) || !defined(geometry.attributes.position.values)) {
            throw new DeveloperError('geometry.attributes.position.values is required.');
        }
        if (!defined(geometry.indices)) {
            throw new DeveloperError('geometry.indices is required.');
        }
        if (geometry.indices.length < 2 || geometry.indices.length % 3 !== 0) {
            throw new DeveloperError('geometry.indices length must be greater than 0 and be a multiple of 3.');
        }
        if (geometry.primitiveType !== PrimitiveType.TRIANGLES) {
            throw new DeveloperError('geometry.primitiveType must be PrimitiveType.TRIANGLES.');
        }
        //>>includeEnd('debug');

        var indices = geometry.indices;
        var attributes = geometry.attributes;
        var vertices = attributes.position.values;
        var numVertices = attributes.position.values.length / 3;
        var numIndices = indices.length;
        var normalsPerVertex = new Array(numVertices);
        var normalsPerTriangle = new Array(numIndices / 3);
        var normalIndices = new Array(numIndices);

        for ( var i = 0; i < numVertices; i++) {
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
            var i03 = i0 * 3;
            var i13 = i1 * 3;
            var i23 = i2 * 3;

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

            Cartesian3.subtract(v1, v0, v1);
            Cartesian3.subtract(v2, v0, v2);
            normalsPerTriangle[j] = Cartesian3.cross(v1, v2, new Cartesian3());
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

        var normalValues = new Float32Array(numVertices * 3);
        for (i = 0; i < numVertices; i++) {
            var i3 = i * 3;
            vertexNormalData = normalsPerVertex[i];
            if (vertexNormalData.count > 0) {
                Cartesian3.clone(Cartesian3.ZERO, normal);
                for (j = 0; j < vertexNormalData.count; j++) {
                    Cartesian3.add(normal, normalsPerTriangle[normalIndices[vertexNormalData.indexOffset + j]], normal);
                }
                Cartesian3.normalize(normal, normal);
                normalValues[i3] = normal.x;
                normalValues[i3 + 1] = normal.y;
                normalValues[i3 + 2] = normal.z;
            } else {
                normalValues[i3] = 0.0;
                normalValues[i3 + 1] = 0.0;
                normalValues[i3 + 2] = 1.0;
            }
        }

        geometry.attributes.normal = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : normalValues
        });

        return geometry;
    };

    var normalScratch = new Cartesian3();
    var normalScale = new Cartesian3();
    var tScratch = new Cartesian3();

    /**
     * Computes per-vertex binormals and tangents for a geometry containing <code>TRIANGLES</code>.
     * The result is new <code>binormal</code> and <code>tangent</code> attributes added to the geometry.
     * This assumes a counter-clockwise winding order.
     * <p>
     * Based on <a href="http://www.terathon.com/code/tangent.html">Computing Tangent Space Basis Vectors
     * for an Arbitrary Mesh</a> by Eric Lengyel.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument with the computed <code>binormal</code> and <code>tangent</code> attributes.
     *
     * @exception {DeveloperError} geometry.indices length must be greater than 0 and be a multiple of 3.
     * @exception {DeveloperError} geometry.primitiveType must be {@link PrimitiveType.TRIANGLES}.
     *
     * @example
     * Cesium.GeometryPipeline.computeBinormalAndTangent(geometry);
     */
    GeometryPipeline.computeBinormalAndTangent = function(geometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        //>>includeEnd('debug');

        var attributes = geometry.attributes;
        var indices = geometry.indices;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(attributes.position) || !defined(attributes.position.values)) {
            throw new DeveloperError('geometry.attributes.position.values is required.');
        }
        if (!defined(attributes.normal) || !defined(attributes.normal.values)) {
            throw new DeveloperError('geometry.attributes.normal.values is required.');
        }
        if (!defined(attributes.st) || !defined(attributes.st.values)) {
            throw new DeveloperError('geometry.attributes.st.values is required.');
        }
        if (!defined(indices)) {
            throw new DeveloperError('geometry.indices is required.');
        }
        if (indices.length < 2 || indices.length % 3 !== 0) {
            throw new DeveloperError('geometry.indices length must be greater than 0 and be a multiple of 3.');
        }
        if (geometry.primitiveType !== PrimitiveType.TRIANGLES) {
            throw new DeveloperError('geometry.primitiveType must be PrimitiveType.TRIANGLES.');
        }
        //>>includeEnd('debug');

        var vertices = geometry.attributes.position.values;
        var normals = geometry.attributes.normal.values;
        var st = geometry.attributes.st.values;

        var numVertices = geometry.attributes.position.values.length / 3;
        var numIndices = indices.length;
        var tan1 = new Array(numVertices * 3);

        for ( var i = 0; i < tan1.length; i++) {
            tan1[i] = 0;
        }

        var i03;
        var i13;
        var i23;
        for (i = 0; i < numIndices; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];
            i03 = i0 * 3;
            i13 = i1 * 3;
            i23 = i2 * 3;
            var i02 = i0 * 2;
            var i12 = i1 * 2;
            var i22 = i2 * 2;

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
            tan1[i03 + 1] += sdiry;
            tan1[i03 + 2] += sdirz;

            tan1[i13] += sdirx;
            tan1[i13 + 1] += sdiry;
            tan1[i13 + 2] += sdirz;

            tan1[i23] += sdirx;
            tan1[i23 + 1] += sdiry;
            tan1[i23 + 2] += sdirz;
        }

        var binormalValues = new Float32Array(numVertices * 3);
        var tangentValues = new Float32Array(numVertices * 3);

        for (i = 0; i < numVertices; i++) {
            i03 = i * 3;
            i13 = i03 + 1;
            i23 = i03 + 2;

            var n = Cartesian3.fromArray(normals, i03, normalScratch);
            var t = Cartesian3.fromArray(tan1, i03, tScratch);
            var scalar = Cartesian3.dot(n, t);
            Cartesian3.multiplyByScalar(n, scalar, normalScale);
            Cartesian3.normalize(Cartesian3.subtract(t, normalScale, t), t);

            tangentValues[i03] = t.x;
            tangentValues[i13] = t.y;
            tangentValues[i23] = t.z;

            Cartesian3.normalize(Cartesian3.cross(n, t, t), t);

            binormalValues[i03] = t.x;
            binormalValues[i13] = t.y;
            binormalValues[i23] = t.z;
        }

        geometry.attributes.tangent = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : tangentValues
        });

        geometry.attributes.binormal = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : binormalValues
        });

        return geometry;
    };

    var scratchCartesian2 = new Cartesian2();
    var toEncode1 = new Cartesian3();
    var toEncode2 = new Cartesian3();
    var toEncode3 = new Cartesian3();

    /**
     * Compresses and packs geometry normal attribute values to save memory.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its normals compressed and packed.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.compressVertices(geometry);
     */
    GeometryPipeline.compressVertices = function(geometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        //>>includeEnd('debug');

        var normalAttribute = geometry.attributes.normal;
        var stAttribute = geometry.attributes.st;
        if (!defined(normalAttribute) && !defined(stAttribute)) {
            return geometry;
        }

        var tangentAttribute = geometry.attributes.tangent;
        var binormalAttribute = geometry.attributes.binormal;

        var normals;
        var st;
        var tangents;
        var binormals;

        if (defined(normalAttribute)) {
            normals = normalAttribute.values;
        }
        if (defined(stAttribute)) {
            st = stAttribute.values;
        }
        if (defined(tangentAttribute)) {
            tangents = tangentAttribute.values;
        }
        if (binormalAttribute) {
            binormals = binormalAttribute.values;
        }

        var length = defined(normals) ? normals.length : st.length;
        var numComponents = defined(normals) ? 3.0 : 2.0;
        var numVertices = length / numComponents;

        var compressedLength = numVertices;
        var numCompressedComponents = defined(st) && defined(normals) ? 2.0 : 1.0;
        numCompressedComponents += defined(tangents) || defined(binormals) ? 1.0 : 0.0;
        compressedLength *= numCompressedComponents;

        var compressedAttributes = new Float32Array(compressedLength);

        var normalIndex = 0;
        for (var i = 0; i < numVertices; ++i) {
            if (defined(st)) {
                Cartesian2.fromArray(st, i * 2.0, scratchCartesian2);
                compressedAttributes[normalIndex++] = AttributeCompression.compressTextureCoordinates(scratchCartesian2);
            }

            var index = i * 3.0;
            if (defined(normals) && defined(tangents) && defined(binormals)) {
                Cartesian3.fromArray(normals, index, toEncode1);
                Cartesian3.fromArray(tangents, index, toEncode2);
                Cartesian3.fromArray(binormals, index, toEncode3);

                AttributeCompression.octPack(toEncode1, toEncode2, toEncode3, scratchCartesian2);
                compressedAttributes[normalIndex++] = scratchCartesian2.x;
                compressedAttributes[normalIndex++] = scratchCartesian2.y;
            } else {
                if (defined(normals)) {
                    Cartesian3.fromArray(normals, index, toEncode1);
                    compressedAttributes[normalIndex++] = AttributeCompression.octEncodeFloat(toEncode1);
                }

                if (defined(tangents)) {
                    Cartesian3.fromArray(tangents, index, toEncode1);
                    compressedAttributes[normalIndex++] = AttributeCompression.octEncodeFloat(toEncode1);
                }

                if (defined(binormals)) {
                    Cartesian3.fromArray(binormals, index, toEncode1);
                    compressedAttributes[normalIndex++] = AttributeCompression.octEncodeFloat(toEncode1);
                }
            }
        }

        geometry.attributes.compressedAttributes = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : numCompressedComponents,
            values : compressedAttributes
        });

        if (defined(normals)) {
            delete geometry.attributes.normal;
        }
        if (defined(st)) {
            delete geometry.attributes.st;
        }
        if (defined(tangents)) {
            delete geometry.attributes.tangent;
        }
        if (defined(binormals)) {
            delete geometry.attributes.binormal;
        }

        return geometry;
    };

    function indexTriangles(geometry) {
        if (defined(geometry.indices)) {
            return geometry;
        }
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        //>>includeStart('debug', pragmas.debug);
        if (numberOfVertices < 3) {
            throw new DeveloperError('The number of vertices must be at least three.');
        }
        if (numberOfVertices % 3 !== 0) {
            throw new DeveloperError('The number of vertices must be a multiple of three.');
        }
        //>>includeEnd('debug');

        var indices = IndexDatatype.createTypedArray(numberOfVertices, numberOfVertices);
        for (var i = 0; i < numberOfVertices; ++i) {
            indices[i] = i;
        }

        geometry.indices = indices;
        return geometry;
    }

    function indexTriangleFan(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        //>>includeStart('debug', pragmas.debug);
        if (numberOfVertices < 3) {
            throw new DeveloperError('The number of vertices must be at least three.');
        }
        //>>includeEnd('debug');

        var indices = IndexDatatype.createTypedArray(numberOfVertices, (numberOfVertices - 2) * 3);
        indices[0] = 1;
        indices[1] = 0;
        indices[2] = 2;

        var indicesIndex = 3;
        for (var i = 3; i < numberOfVertices; ++i) {
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = 0;
            indices[indicesIndex++] = i;
        }

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.TRIANGLES;
        return geometry;
    }

    function indexTriangleStrip(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        //>>includeStart('debug', pragmas.debug);
        if (numberOfVertices < 3) {
            throw new DeveloperError('The number of vertices must be at least 3.');
        }
        //>>includeEnd('debug');

        var indices = IndexDatatype.createTypedArray(numberOfVertices, (numberOfVertices - 2) * 3);
        indices[0] = 0;
        indices[1] = 1;
        indices[2] = 2;

        if (numberOfVertices > 3) {
            indices[3] = 0;
            indices[4] = 2;
            indices[5] = 3;
        }

        var indicesIndex = 6;
        for (var i = 3; i < numberOfVertices - 1; i += 2) {
            indices[indicesIndex++] = i;
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = i + 1;

            if (i + 2 < numberOfVertices) {
                indices[indicesIndex++] = i;
                indices[indicesIndex++] = i + 1;
                indices[indicesIndex++] = i + 2;
            }
        }

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.TRIANGLES;
        return geometry;
    }

    function indexLines(geometry) {
        if (defined(geometry.indices)) {
            return geometry;
        }
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        //>>includeStart('debug', pragmas.debug);
        if (numberOfVertices < 2) {
            throw new DeveloperError('The number of vertices must be at least two.');
        }
        if (numberOfVertices % 2 !== 0) {
            throw new DeveloperError('The number of vertices must be a multiple of 2.');
        }
        //>>includeEnd('debug');

        var indices = IndexDatatype.createTypedArray(numberOfVertices, numberOfVertices);
        for (var i = 0; i < numberOfVertices; ++i) {
            indices[i] = i;
        }

        geometry.indices = indices;
        return geometry;
    }

    function indexLineStrip(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        //>>includeStart('debug', pragmas.debug);
        if (numberOfVertices < 2) {
            throw new DeveloperError('The number of vertices must be at least two.');
        }
        //>>includeEnd('debug');

        var indices = IndexDatatype.createTypedArray(numberOfVertices, (numberOfVertices - 1) * 2);
        indices[0] = 0;
        indices[1] = 1;
        var indicesIndex = 2;
        for (var i = 2; i < numberOfVertices; ++i) {
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = i;
        }

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.LINES;
        return geometry;
    }

    function indexLineLoop(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

        //>>includeStart('debug', pragmas.debug);
        if (numberOfVertices < 2) {
            throw new DeveloperError('The number of vertices must be at least two.');
        }
        //>>includeEnd('debug');

        var indices = IndexDatatype.createTypedArray(numberOfVertices, numberOfVertices * 2);

        indices[0] = 0;
        indices[1] = 1;

        var indicesIndex = 2;
        for (var i = 2; i < numberOfVertices; ++i) {
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = i;
        }

        indices[indicesIndex++] = numberOfVertices - 1;
        indices[indicesIndex] = 0;

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.LINES;
        return geometry;
    }

    function indexPrimitive(geometry) {
        switch (geometry.primitiveType) {
        case PrimitiveType.TRIANGLE_FAN:
            return indexTriangleFan(geometry);
        case PrimitiveType.TRIANGLE_STRIP:
            return indexTriangleStrip(geometry);
        case PrimitiveType.TRIANGLES:
            return indexTriangles(geometry);
        case PrimitiveType.LINE_STRIP:
            return indexLineStrip(geometry);
        case PrimitiveType.LINE_LOOP:
            return indexLineLoop(geometry);
        case PrimitiveType.LINES:
            return indexLines(geometry);
        }

        return geometry;
    }

    function offsetPointFromXZPlane(p, isBehind) {
        if (Math.abs(p.y) < CesiumMath.EPSILON6){
            if (isBehind) {
                p.y = -CesiumMath.EPSILON6;
            } else {
                p.y = CesiumMath.EPSILON6;
            }
        }
    }

    function offsetTriangleFromXZPlane(p0, p1, p2) {
        if (p0.y !== 0.0 && p1.y !== 0.0 && p2.y !== 0.0) {
            offsetPointFromXZPlane(p0, p0.y < 0.0);
            offsetPointFromXZPlane(p1, p1.y < 0.0);
            offsetPointFromXZPlane(p2, p2.y < 0.0);
            return;
        }

        var p0y = Math.abs(p0.y);
        var p1y = Math.abs(p1.y);
        var p2y = Math.abs(p2.y);

        var sign;
        if (p0y > p1y) {
            if (p0y > p2y) {
                sign = CesiumMath.sign(p0.y);
            } else {
                sign = CesiumMath.sign(p2.y);
            }
        } else if (p1y > p2y) {
            sign = CesiumMath.sign(p1.y);
        } else {
            sign = CesiumMath.sign(p2.y);
        }

        var isBehind = sign < 0.0;
        offsetPointFromXZPlane(p0, isBehind);
        offsetPointFromXZPlane(p1, isBehind);
        offsetPointFromXZPlane(p2, isBehind);
    }

    var c3 = new Cartesian3();
    function getXZIntersectionOffsetPoints(p, p1, u1, v1) {
        Cartesian3.add(p, Cartesian3.multiplyByScalar(Cartesian3.subtract(p1, p, c3), p.y/(p.y-p1.y), c3), u1);
        Cartesian3.clone(u1, v1);
        offsetPointFromXZPlane(u1, true);
        offsetPointFromXZPlane(v1, false);
    }

    var u1 = new Cartesian3();
    var u2 = new Cartesian3();
    var q1 = new Cartesian3();
    var q2 = new Cartesian3();

    var splitTriangleResult = {
        positions : new Array(7),
        indices : new Array(3 * 3)
    };

    function splitTriangle(p0, p1, p2) {
        // In WGS84 coordinates, for a triangle approximately on the
        // ellipsoid to cross the IDL, first it needs to be on the
        // negative side of the plane x = 0.
        if ((p0.x >= 0.0) || (p1.x >= 0.0) || (p2.x >= 0.0)) {
            return undefined;
        }

        offsetTriangleFromXZPlane(p0, p1, p2);

        var p0Behind = p0.y < 0.0;
        var p1Behind = p1.y < 0.0;
        var p2Behind = p2.y < 0.0;

        var numBehind = 0;
        numBehind += p0Behind ? 1 : 0;
        numBehind += p1Behind ? 1 : 0;
        numBehind += p2Behind ? 1 : 0;

        var indices = splitTriangleResult.indices;

        if (numBehind === 1) {
            indices[1] = 3;
            indices[2] = 4;
            indices[5] = 6;
            indices[7] = 6;
            indices[8] = 5;

            if (p0Behind) {
                getXZIntersectionOffsetPoints(p0, p1, u1, q1);
                getXZIntersectionOffsetPoints(p0, p2, u2, q2);

                indices[0] = 0;
                indices[3] = 1;
                indices[4] = 2;
                indices[6] = 1;
            } else if (p1Behind) {
                getXZIntersectionOffsetPoints(p1, p2, u1, q1);
                getXZIntersectionOffsetPoints(p1, p0, u2, q2);

                indices[0] = 1;
                indices[3] = 2;
                indices[4] = 0;
                indices[6] = 2;
            } else if (p2Behind) {
                getXZIntersectionOffsetPoints(p2, p0, u1, q1);
                getXZIntersectionOffsetPoints(p2, p1, u2, q2);

                indices[0] = 2;
                indices[3] = 0;
                indices[4] = 1;
                indices[6] = 0;
            }
        } else if (numBehind === 2) {
            indices[2] = 4;
            indices[4] = 4;
            indices[5] = 3;
            indices[7] = 5;
            indices[8] = 6;

            if (!p0Behind) {
                getXZIntersectionOffsetPoints(p0, p1, u1, q1);
                getXZIntersectionOffsetPoints(p0, p2, u2, q2);

                indices[0] = 1;
                indices[1] = 2;
                indices[3] = 1;
                indices[6] = 0;
            } else if (!p1Behind) {
                getXZIntersectionOffsetPoints(p1, p2, u1, q1);
                getXZIntersectionOffsetPoints(p1, p0, u2, q2);

                indices[0] = 2;
                indices[1] = 0;
                indices[3] = 2;
                indices[6] = 1;
            } else if (!p2Behind) {
                getXZIntersectionOffsetPoints(p2, p0, u1, q1);
                getXZIntersectionOffsetPoints(p2, p1, u2, q2);

                indices[0] = 0;
                indices[1] = 1;
                indices[3] = 0;
                indices[6] = 2;
            }
        }

        var positions = splitTriangleResult.positions;
        positions[0] = p0;
        positions[1] = p1;
        positions[2] = p2;
        positions.length = 3;

        if (numBehind === 1 || numBehind === 2) {
            positions[3] = u1;
            positions[4] = u2;
            positions[5] = q1;
            positions[6] = q2;
            positions.length = 7;
        }

        return splitTriangleResult;
    }

    function updateGeometryAfterSplit(geometry, computeBoundingSphere) {
        var attributes = geometry.attributes;

        if (attributes.position.values.length === 0) {
            return undefined;
        }

        for (var property in attributes) {
            if (attributes.hasOwnProperty(property) &&
                    defined(attributes[property]) &&
                    defined(attributes[property].values)) {

                var attribute = attributes[property];
                attribute.values = ComponentDatatype.createTypedArray(attribute.componentDatatype, attribute.values);
            }
        }

        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);
        geometry.indices = IndexDatatype.createTypedArray(numberOfVertices, geometry.indices);

        if (computeBoundingSphere) {
            geometry.boundingSphere = BoundingSphere.fromVertices(attributes.position.values);
        }

        return geometry;
    }

    function copyGeometryForSplit(geometry) {
        var attributes = geometry.attributes;
        var copiedAttributes = {};

        for (var property in attributes) {
            if (attributes.hasOwnProperty(property) &&
                    defined(attributes[property]) &&
                    defined(attributes[property].values)) {

                var attribute = attributes[property];
                copiedAttributes[property] = new GeometryAttribute({
                    componentDatatype : attribute.componentDatatype,
                    componentsPerAttribute : attribute.componentsPerAttribute,
                    normalize : attribute.normalize,
                    values : []
                });
            }
        }

        return new Geometry({
            attributes : copiedAttributes,
            indices : [],
            primitiveType : geometry.primitiveType
        });
    }

    function updateInstanceAfterSplit(instance, westGeometry, eastGeometry) {
        var computeBoundingSphere = defined(instance.geometry.boundingSphere);

        westGeometry = updateGeometryAfterSplit(westGeometry, computeBoundingSphere);
        eastGeometry = updateGeometryAfterSplit(eastGeometry, computeBoundingSphere);

        if (defined(eastGeometry) && !defined(westGeometry)) {
            instance.geometry = eastGeometry;
        } else if (!defined(eastGeometry) && defined(westGeometry)) {
            instance.geometry = westGeometry;
        } else {
            instance.westHemisphereGeometry = westGeometry;
            instance.eastHemisphereGeometry = eastGeometry;
            instance.geometry = undefined;
        }
    }

    var p0Scratch = new Cartesian3();
    var p1Scratch = new Cartesian3();
    var p2Scratch = new Cartesian3();
    var barycentricScratch = new Cartesian3();
    var s0Scratch = new Cartesian2();
    var s1Scratch = new Cartesian2();
    var s2Scratch = new Cartesian2();

    function computeTriangleAttributes(i0, i1, i2, point, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex) {
        if (!defined(normals) && !defined(binormals) && !defined(tangents) && !defined(texCoords)) {
            return;
        }

        var p0 = Cartesian3.fromArray(positions, i0 * 3, p0Scratch);
        var p1 = Cartesian3.fromArray(positions, i1 * 3, p1Scratch);
        var p2 = Cartesian3.fromArray(positions, i2 * 3, p2Scratch);
        var coords = barycentricCoordinates(point, p0, p1, p2, barycentricScratch);

        if (defined(normals)) {
            var n0 = Cartesian3.fromArray(normals, i0 * 3, p0Scratch);
            var n1 = Cartesian3.fromArray(normals, i1 * 3, p1Scratch);
            var n2 = Cartesian3.fromArray(normals, i2 * 3, p2Scratch);

            Cartesian3.multiplyByScalar(n0, coords.x, n0);
            Cartesian3.multiplyByScalar(n1, coords.y, n1);
            Cartesian3.multiplyByScalar(n2, coords.z, n2);

            var normal = Cartesian3.add(n0, n1, n0);
            Cartesian3.add(normal, n2, normal);
            Cartesian3.normalize(normal, normal);

            Cartesian3.pack(normal, currentAttributes.normal.values, insertedIndex * 3);
        }

        if (defined(binormals)) {
            var b0 = Cartesian3.fromArray(binormals, i0 * 3, p0Scratch);
            var b1 = Cartesian3.fromArray(binormals, i1 * 3, p1Scratch);
            var b2 = Cartesian3.fromArray(binormals, i2 * 3, p2Scratch);

            Cartesian3.multiplyByScalar(b0, coords.x, b0);
            Cartesian3.multiplyByScalar(b1, coords.y, b1);
            Cartesian3.multiplyByScalar(b2, coords.z, b2);

            var binormal = Cartesian3.add(b0, b1, b0);
            Cartesian3.add(binormal, b2, binormal);
            Cartesian3.normalize(binormal, binormal);

            Cartesian3.pack(binormal, currentAttributes.binormal.values, insertedIndex * 3);
        }

        if (defined(tangents)) {
            var t0 = Cartesian3.fromArray(tangents, i0 * 3, p0Scratch);
            var t1 = Cartesian3.fromArray(tangents, i1 * 3, p1Scratch);
            var t2 = Cartesian3.fromArray(tangents, i2 * 3, p2Scratch);

            Cartesian3.multiplyByScalar(t0, coords.x, t0);
            Cartesian3.multiplyByScalar(t1, coords.y, t1);
            Cartesian3.multiplyByScalar(t2, coords.z, t2);

            var tangent = Cartesian3.add(t0, t1, t0);
            Cartesian3.add(tangent, t2, tangent);
            Cartesian3.normalize(tangent, tangent);

            Cartesian3.pack(tangent, currentAttributes.tangent.values, insertedIndex * 3);
        }

        if (defined(texCoords)) {
            var s0 = Cartesian2.fromArray(texCoords, i0 * 2, s0Scratch);
            var s1 = Cartesian2.fromArray(texCoords, i1 * 2, s1Scratch);
            var s2 = Cartesian2.fromArray(texCoords, i2 * 2, s2Scratch);

            Cartesian2.multiplyByScalar(s0, coords.x, s0);
            Cartesian2.multiplyByScalar(s1, coords.y, s1);
            Cartesian2.multiplyByScalar(s2, coords.z, s2);

            var texCoord = Cartesian2.add(s0, s1, s0);
            Cartesian2.add(texCoord, s2, texCoord);

            Cartesian2.pack(texCoord, currentAttributes.st.values, insertedIndex * 2);
        }
    }

    function insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, currentIndex, point) {
        var insertIndex = currentAttributes.position.values.length / 3;

        if (currentIndex !== -1) {
            var prevIndex = indices[currentIndex];
            var newIndex = currentIndexMap[prevIndex];

            if (newIndex === -1) {
                currentIndexMap[prevIndex] = insertIndex;
                currentAttributes.position.values.push(point.x, point.y, point.z);
                currentIndices.push(insertIndex);
                return insertIndex;
            }

            currentIndices.push(newIndex);
            return newIndex;
        }

        currentAttributes.position.values.push(point.x, point.y, point.z);
        currentIndices.push(insertIndex);
        return insertIndex;
    }

    function splitLongitudeTriangles(instance) {
        var geometry = instance.geometry;
        var attributes = geometry.attributes;
        var positions = attributes.position.values;
        var normals = (defined(attributes.normal)) ? attributes.normal.values : undefined;
        var binormals = (defined(attributes.binormal)) ? attributes.binormal.values : undefined;
        var tangents = (defined(attributes.tangent)) ? attributes.tangent.values : undefined;
        var texCoords = (defined(attributes.st)) ? attributes.st.values : undefined;
        var indices = geometry.indices;

        var eastGeometry = copyGeometryForSplit(geometry);
        var westGeometry = copyGeometryForSplit(geometry);

        var currentAttributes;
        var currentIndices;
        var currentIndexMap;
        var insertedIndex;
        var i;

        var westGeometryIndexMap = [];
        westGeometryIndexMap.length = positions.length / 3;

        var eastGeometryIndexMap = [];
        eastGeometryIndexMap.length = positions.length / 3;

        for (i = 0; i < westGeometryIndexMap.length; ++i) {
            westGeometryIndexMap[i] = -1;
            eastGeometryIndexMap[i] = -1;
        }

        var len = indices.length;
        for (i = 0; i < len; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var p0 = Cartesian3.fromArray(positions, i0 * 3);
            var p1 = Cartesian3.fromArray(positions, i1 * 3);
            var p2 = Cartesian3.fromArray(positions, i2 * 3);

            var result = splitTriangle(p0, p1, p2);
            if (defined(result) && result.positions.length > 3) {
                var resultPositions = result.positions;
                var resultIndices = result.indices;
                var resultLength = resultIndices.length;

                for (var j = 0; j < resultLength; ++j) {
                    var resultIndex = resultIndices[j];
                    var point = resultPositions[resultIndex];

                    if (point.y < 0.0) {
                        currentAttributes = westGeometry.attributes;
                        currentIndices = westGeometry.indices;
                        currentIndexMap = westGeometryIndexMap;
                    } else {
                        currentAttributes = eastGeometry.attributes;
                        currentIndices = eastGeometry.indices;
                        currentIndexMap = eastGeometryIndexMap;
                    }

                    insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, resultIndex < 3 ? i + resultIndex : -1, point);
                    computeTriangleAttributes(i0, i1, i2, point, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);
                }
            } else {
                if (defined(result)) {
                    p0 = result.positions[0];
                    p1 = result.positions[1];
                    p2 = result.positions[2];
                }

                if (p0.y < 0.0) {
                    currentAttributes = westGeometry.attributes;
                    currentIndices = westGeometry.indices;
                    currentIndexMap = westGeometryIndexMap;
                } else {
                    currentAttributes = eastGeometry.attributes;
                    currentIndices = eastGeometry.indices;
                    currentIndexMap = eastGeometryIndexMap;
                }

                insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i, p0);
                computeTriangleAttributes(i0, i1, i2, p0, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);

                insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i + 1, p1);
                computeTriangleAttributes(i0, i1, i2, p1, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);

                insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i + 2, p2);
                computeTriangleAttributes(i0, i1, i2, p2, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);
            }
        }

        updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
    }

    var xzPlane = Plane.fromPointNormal(Cartesian3.ZERO, Cartesian3.UNIT_Y);

    var offsetScratch = new Cartesian3();
    var offsetPointScratch = new Cartesian3();

    function splitLongitudeLines(instance) {
        var geometry = instance.geometry;
        var attributes = geometry.attributes;
        var positions = attributes.position.values;
        var indices = geometry.indices;

        var eastGeometry = copyGeometryForSplit(geometry);
        var westGeometry = copyGeometryForSplit(geometry);

        var i;
        var length = indices.length;

        var westGeometryIndexMap = [];
        westGeometryIndexMap.length = positions.length / 3;

        var eastGeometryIndexMap = [];
        eastGeometryIndexMap.length = positions.length / 3;

        for (i = 0; i < westGeometryIndexMap.length; ++i) {
            westGeometryIndexMap[i] = -1;
            eastGeometryIndexMap[i] = -1;
        }

        for (i = 0; i < length; i += 2) {
            var i0 = indices[i];
            var i1 = indices[i + 1];

            var p0 = Cartesian3.fromArray(positions, i0 * 3, p0Scratch);
            var p1 = Cartesian3.fromArray(positions, i1 * 3, p1Scratch);

            if (Math.abs(p0.y) < CesiumMath.EPSILON6){
                if (p0.y < 0.0) {
                    p0.y = -CesiumMath.EPSILON6;
                } else {
                    p0.y = CesiumMath.EPSILON6;
                }
            }

            if (Math.abs(p1.y) < CesiumMath.EPSILON6){
                if (p1.y < 0.0) {
                    p1.y = -CesiumMath.EPSILON6;
                } else {
                    p1.y = CesiumMath.EPSILON6;
                }
            }

            var p0Attributes = eastGeometry.attributes;
            var p0Indices = eastGeometry.indices;
            var p0IndexMap = eastGeometryIndexMap;
            var p1Attributes = westGeometry.attributes;
            var p1Indices = westGeometry.indices;
            var p1IndexMap = westGeometryIndexMap;

            var intersection = IntersectionTests.lineSegmentPlane(p0, p1, xzPlane, p2Scratch);
            if (defined(intersection)) {
                // move point on the xz-plane slightly away from the plane
                var offset = Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, 5.0 * CesiumMath.EPSILON9, offsetScratch);
                if (p0.y < 0.0) {
                    Cartesian3.negate(offset, offset);

                    p0Attributes = westGeometry.attributes;
                    p0Indices = westGeometry.indices;
                    p0IndexMap = westGeometryIndexMap;
                    p1Attributes = eastGeometry.attributes;
                    p1Indices = eastGeometry.indices;
                    p1IndexMap = eastGeometryIndexMap;
                }

                var offsetPoint = Cartesian3.add(intersection, offset, offsetPointScratch);
                insertSplitPoint(p0Attributes, p0Indices, p0IndexMap, indices, i, p0);
                insertSplitPoint(p0Attributes, p0Indices, p0IndexMap, indices, -1, offsetPoint);

                Cartesian3.negate(offset, offset);
                Cartesian3.add(intersection, offset, offsetPoint);
                insertSplitPoint(p1Attributes, p1Indices, p1IndexMap, indices, -1, offsetPoint);
                insertSplitPoint(p1Attributes, p1Indices, p1IndexMap, indices, i + 1, p1);
            } else {
                var currentAttributes;
                var currentIndices;
                var currentIndexMap;

                if (p0.y < 0.0) {
                    currentAttributes = westGeometry.attributes;
                    currentIndices = westGeometry.indices;
                    currentIndexMap = westGeometryIndexMap;
                } else {
                    currentAttributes = eastGeometry.attributes;
                    currentIndices = eastGeometry.indices;
                    currentIndexMap = eastGeometryIndexMap;
                }

                insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i, p0);
                insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i + 1, p1);
            }
        }

        updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
    }

    var cartesian2Scratch0 = new Cartesian2();
    var cartesian2Scratch1 = new Cartesian2();

    var cartesian3Scratch0 = new Cartesian3();
    var cartesian3Scratch1 = new Cartesian3();
    var cartesian3Scratch2 = new Cartesian3();
    var cartesian3Scratch3 = new Cartesian3();
    var cartesian3Scratch4 = new Cartesian3();
    var cartesian3Scratch5 = new Cartesian3();
    var cartesian3Scratch6 = new Cartesian3();

    var cartesian4Scratch0 = new Cartesian4();

    function splitLongitudePolyline(instance) {
        var geometry = instance.geometry;
        var attributes = geometry.attributes;
        var positions = attributes.position.values;
        var prevPositions = attributes.prevPosition.values;
        var nextPositions = attributes.nextPosition.values;
        var expandAndWidths = attributes.expandAndWidth.values;

        var texCoords = (defined(attributes.st)) ? attributes.st.values : undefined;
        var colors = (defined(attributes.color)) ? attributes.color.values : undefined;

        var eastGeometry = copyGeometryForSplit(geometry);
        var westGeometry = copyGeometryForSplit(geometry);

        var i;
        var j;
        var index;

        var length = positions.length / 3;
        for (i = 0; i < length; i += 4) {
            var i0 = i;
            var i1 = i + 1;
            var i2 = i + 2;
            var i3 = i + 3;

            var p0 = Cartesian3.fromArray(positions, i0 * 3, cartesian3Scratch0);
            var p1 = Cartesian3.fromArray(positions, i1 * 3, cartesian3Scratch1);
            var p2 = Cartesian3.fromArray(positions, i2 * 3, cartesian3Scratch2);
            var p3 = Cartesian3.fromArray(positions, i3 * 3, cartesian3Scratch3);

            if (Math.abs(p0.y) < CesiumMath.EPSILON6) {
                p0.y = CesiumMath.EPSILON6 * (p2.y < 0.0 ? -1.0 : 1.0);
                p1.y = p0.y;
            }

            if (Math.abs(p2.y) < CesiumMath.EPSILON6) {
                p2.y = CesiumMath.EPSILON6 * (p0.y < 0.0 ? -1.0 : 1.0);
                p3.y = p2.y;
            }

            var p0Attributes = eastGeometry.attributes;
            var p0Indices = eastGeometry.indices;
            var p2Attributes = westGeometry.attributes;
            var p2Indices = westGeometry.indices;

            var intersection = IntersectionTests.lineSegmentPlane(p0, p2, xzPlane, cartesian3Scratch4);
            if (defined(intersection)) {
                // move point on the xz-plane slightly away from the plane
                var offset = Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, 5.0 * CesiumMath.EPSILON9, cartesian3Scratch5);
                if (p0.y < 0.0) {
                    Cartesian3.negate(offset, offset);
                    p0Attributes = westGeometry.attributes;
                    p0Indices = westGeometry.indices;
                    p2Attributes = eastGeometry.attributes;
                    p2Indices = eastGeometry.indices;
                }

                var offsetPoint = Cartesian3.add(intersection, offset, cartesian3Scratch6);
                p0Attributes.position.values.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
                p0Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);
                p0Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);

                Cartesian3.negate(offset, offset);
                Cartesian3.add(intersection, offset, offsetPoint);
                p2Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);
                p2Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);
                p2Attributes.position.values.push(p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);

                for (j = i0 * 3; j < i0 * 3 + 2 * 3; ++j) {
                    p0Attributes.prevPosition.values.push(prevPositions[j]);
                }
                p0Attributes.prevPosition.values.push(p0.x, p0.y, p0.z, p0.x, p0.y, p0.z);
                p2Attributes.prevPosition.values.push(p0.x, p0.y, p0.z, p0.x, p0.y, p0.z);
                for (j = i2 * 3; j < i2 * 3 + 2 * 3; ++j) {
                    p2Attributes.prevPosition.values.push(prevPositions[j]);
                }

                for (j = i0 * 3; j < i0 * 3 + 2 * 3; ++j) {
                    p0Attributes.nextPosition.values.push(nextPositions[j]);
                }
                p0Attributes.nextPosition.values.push(p2.x, p2.y, p2.z, p2.x, p2.y, p2.z);
                p2Attributes.nextPosition.values.push(p2.x, p2.y, p2.z, p2.x, p2.y, p2.z);
                for (j = i2 * 3; j < i2 * 3 + 2 * 3; ++j) {
                    p2Attributes.nextPosition.values.push(nextPositions[j]);
                }

                var ew0 = Cartesian2.fromArray(expandAndWidths, i0 * 2, cartesian2Scratch0);
                var width = Math.abs(ew0.y);

                p0Attributes.expandAndWidth.values.push(-1,  width, 1,  width);
                p0Attributes.expandAndWidth.values.push(-1, -width, 1, -width);
                p2Attributes.expandAndWidth.values.push(-1,  width, 1,  width);
                p2Attributes.expandAndWidth.values.push(-1, -width, 1, -width);

                var t = Cartesian3.magnitudeSquared(Cartesian3.subtract(intersection, p0, cartesian3Scratch3));
                t /= Cartesian3.magnitudeSquared(Cartesian3.subtract(p2, p0, cartesian3Scratch3));

                if (defined(colors)) {
                    var c0 = Cartesian4.fromArray(colors, i0 * 4, cartesian4Scratch0);
                    var c2 = Cartesian4.fromArray(colors, i2 * 4, cartesian4Scratch0);

                    var r = CesiumMath.lerp(c0.x, c2.x, t);
                    var g = CesiumMath.lerp(c0.y, c2.y, t);
                    var b = CesiumMath.lerp(c0.z, c2.z, t);
                    var a = CesiumMath.lerp(c0.w, c2.w, t);

                    for (j = i0 * 4; j < i0 * 4 + 2 * 4; ++j) {
                        p0Attributes.color.values.push(colors[j]);
                    }
                    p0Attributes.color.values.push(r, g, b, a);
                    p0Attributes.color.values.push(r, g, b, a);
                    p2Attributes.color.values.push(r, g, b, a);
                    p2Attributes.color.values.push(r, g, b, a);
                    for (j = i2 * 4; j < i2 * 4 + 2 * 4; ++j) {
                        p2Attributes.color.values.push(colors[j]);
                    }
                }

                if (defined(texCoords)) {
                    var s0 = Cartesian2.fromArray(texCoords, i0 * 2, cartesian2Scratch0);
                    var s3 = Cartesian2.fromArray(texCoords, (i + 3) * 2, cartesian2Scratch1);

                    var sx = CesiumMath.lerp(s0.x, s3.x, t);

                    for (j = i0 * 2; j < i0 * 2 + 2 * 2; ++j) {
                        p0Attributes.st.values.push(texCoords[j]);
                    }
                    p0Attributes.st.values.push(sx, s0.y);
                    p0Attributes.st.values.push(sx, s3.y);
                    p2Attributes.st.values.push(sx, s0.y);
                    p2Attributes.st.values.push(sx, s3.y);
                    for (j = i2 * 2; j < i2 * 2 + 2 * 2; ++j) {
                        p2Attributes.st.values.push(texCoords[j]);
                    }
                }

                index = p0Attributes.position.values.length / 3 - 4;
                p0Indices.push(index, index + 2, index + 1);
                p0Indices.push(index + 1, index + 2, index + 3);

                index = p2Attributes.position.values.length / 3 - 4;
                p2Indices.push(index, index + 2, index + 1);
                p2Indices.push(index + 1, index + 2, index + 3);
            } else {
                var currentAttributes;
                var currentIndices;

                if (p0.y < 0.0) {
                    currentAttributes = westGeometry.attributes;
                    currentIndices = westGeometry.indices;
                } else {
                    currentAttributes = eastGeometry.attributes;
                    currentIndices = eastGeometry.indices;
                }

                currentAttributes.position.values.push(p0.x, p0.y, p0.z);
                currentAttributes.position.values.push(p1.x, p1.y, p1.z);
                currentAttributes.position.values.push(p2.x, p2.y, p2.z);
                currentAttributes.position.values.push(p3.x, p3.y, p3.z);

                for (j = i * 3; j < i * 3 + 4 * 3; ++j) {
                    currentAttributes.prevPosition.values.push(prevPositions[j]);
                    currentAttributes.nextPosition.values.push(nextPositions[j]);
                }

                for (j = i * 2; j < i * 2 + 4 * 2; ++j) {
                    currentAttributes.expandAndWidth.values.push(expandAndWidths[j]);
                    if (defined(texCoords)) {
                        currentAttributes.st.values.push(texCoords[j]);
                    }
                }

                if (defined(colors)) {
                    for (j = i * 4; j < i * 4 + 4 * 4; ++j) {
                        currentAttributes.color.values.push(colors[j]);
                    }
                }

                index = currentAttributes.position.values.length / 3 - 4;
                currentIndices.push(index, index + 2, index + 1);
                currentIndices.push(index + 1, index + 2, index + 3);
            }
        }

        updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
    }

    /**
     * Splits the instances's geometry, by introducing new vertices and indices,that
     * intersect the International Date Line and Prime Meridian so that no primitives cross longitude
     * -180/180 degrees.  This is not required for 3D drawing, but is required for
     * correcting drawing in 2D and Columbus view.
     *
     * @private
     *
     * @param {GeometryInstance} instance The instance to modify.
     * @returns {GeometryInstance} The modified <code>instance</code> argument, with it's geometry split at the International Date Line.
     *
     * @example
     * instance = Cesium.GeometryPipeline.splitLongitude(instance);
     */
    GeometryPipeline.splitLongitude = function(instance) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(instance)) {
            throw new DeveloperError('instance is required.');
        }
        //>>includeEnd('debug');

        var geometry = instance.geometry;
        var boundingSphere = geometry.boundingSphere;
        if (defined(boundingSphere)) {
            var minX = boundingSphere.center.x - boundingSphere.radius;
            if (minX > 0 || BoundingSphere.intersectPlane(boundingSphere, Plane.ORIGIN_ZX_PLANE) !== Intersect.INTERSECTING) {
                return instance;
            }
        }

        if (geometry.geometryType !== GeometryType.NONE) {
            switch (geometry.geometryType) {
            case GeometryType.POLYLINES:
                splitLongitudePolyline(instance);
                break;
            case GeometryType.TRIANGLES:
                splitLongitudeTriangles(instance);
                break;
            case GeometryType.LINES:
                splitLongitudeLines(instance);
                break;
            }
        } else {
            indexPrimitive(geometry);
            if (geometry.primitiveType === PrimitiveType.TRIANGLES) {
                splitLongitudeTriangles(instance);
            } else if (geometry.primitiveType === PrimitiveType.LINES) {
                splitLongitudeLines(instance);
            }
        }

        return instance;
    };

    return GeometryPipeline;
});
