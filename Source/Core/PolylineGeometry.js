/*global define*/
define([
        './defined',
        './DeveloperError',
        './ComponentDatatype',
        './IndexDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './PolylinePipeline',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes'
    ], function(
        defined,
        DeveloperError,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        Cartesian3,
        PolylinePipeline,
        Geometry,
        GeometryAttribute,
        GeometryAttributes) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PolylineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        var width = options.width;

        if ((!defined(positions)) || (positions.length < 2)) {
            throw new DeveloperError('At least two positions are required.');
        }

        if (!defined(width) || width < 1.0) {
            throw new DeveloperError('width is required and must be greater than or equal to one.');
        }

        this._positions = positions;
        this._width = width;
        this._workerName = 'createPolylineGeometry';
    };

    var scratchCartesian3 = new Cartesian3();
    var scratchPosition = new Cartesian3();
    var scratchPrevPosition = new Cartesian3();
    var scratchNextPosition = new Cartesian3();
    /**
     * DOC_TBA
     */
    PolylineGeometry.createGeometry = function(polylineGeometry) {
        var width = polylineGeometry._width;
        var vertexFormat = polylineGeometry._vertexFormat;

        var segments = PolylinePipeline.wrapLongitude(polylineGeometry._positions);
        var positions = segments.positions;
        var lengths = segments.lengths;

        var i;
        var j;
        var k;

        var size = 0;
        var length = lengths.length;
        for (i = 0; i < length; ++i) {
            size += lengths[i] * 4.0 - 4.0;
        }

        var finalPositions = new Float64Array(size * 3);
        var prevPositions = new Float64Array(size * 3);
        var nextPositions = new Float64Array(size * 3);
        var expandAndWidth = new Float32Array(size * 2);
        var st = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;

        var positionIndex = 0;
        var expandAndWidthIndex = 0;
        var stIndex = 0;

        var segmentLength;
        var segmentIndex = 0;
        var count = 0;
        var position;

        var positionsLength = positions.length;
        for (j = 0; j < positionsLength; ++j) {
            if (j === 0) {
                position = scratchCartesian3;
                Cartesian3.subtract(positions[0], positions[1], position);
                Cartesian3.add(positions[0], position, position);
            } else {
                position = positions[j - 1];
            }

            scratchPrevPosition.x = position.x;
            scratchPrevPosition.y = position.y;
            scratchPrevPosition.z = position.z;

            position = positions[j];
            scratchPosition.x = position.x;
            scratchPosition.y = position.y;
            scratchPosition.z = position.z;

            if (j === positionsLength - 1) {
                position = scratchCartesian3;
                Cartesian3.subtract(positions[positionsLength - 1], positions[positionsLength - 2], position);
                Cartesian3.add(positions[positionsLength - 1], position, position);
            } else {
                position = positions[j + 1];
            }

            scratchNextPosition.x = position.x;
            scratchNextPosition.y = position.y;
            scratchNextPosition.z = position.z;

            segmentLength = lengths[segmentIndex];
            if (j === count + segmentLength) {
                count += segmentLength;
                ++segmentIndex;
            }

            var segmentStart = j - count === 0;
            var segmentEnd = j === count + lengths[segmentIndex] - 1;

            var startK = (segmentStart) ? 2 : 0;
            var endK = (segmentEnd) ? 2 : 4;

            for (k = startK; k < endK; ++k) {
                finalPositions[positionIndex]     = scratchPosition.x;
                finalPositions[positionIndex + 1] = scratchPosition.y;
                finalPositions[positionIndex + 2] = scratchPosition.z;

                prevPositions[positionIndex]     = scratchPrevPosition.x;
                prevPositions[positionIndex + 1] = scratchPrevPosition.y;
                prevPositions[positionIndex + 2] = scratchPrevPosition.z;

                nextPositions[positionIndex]     = scratchNextPosition.x;
                nextPositions[positionIndex + 1] = scratchNextPosition.y;
                nextPositions[positionIndex + 2] = scratchNextPosition.z;

                positionIndex += 3;

                var direction = (k - 2 < 0) ? -1.0 : 1.0;
                expandAndWidth[expandAndWidthIndex++]     = 2 * (k % 2) - 1;       // expand direction
                expandAndWidth[expandAndWidthIndex++] = direction * width;

                if (vertexFormat.st) {
                    st[stIndex++] = j / (positionsLength - 1);
                    st[stIndex++] = Math.max(expandAndWidth[expandAndWidthIndex - 2], 0.0);
                }
            }
        }

        var attributes = new GeometryAttributes();

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : finalPositions
        });

        attributes.prevPosition = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : prevPositions
        });

        attributes.nextPosition = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : nextPositions
        });

        attributes.expandAndWidth = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2,
            values : expandAndWidth
        });

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : st
            });
        }

        length = lengths.length;
        var indices = IndexDatatype.createTypedArray(size, positions.length * 6 - length * 6);
        var index = 0;
        var indicesIndex = 0;
        for (i = 0; i < length; ++i) {
            segmentLength = lengths[i] - 1.0;
            for (j = 0; j < segmentLength; ++j) {
                indices[indicesIndex++] = index;
                indices[indicesIndex++] = index + 2;
                indices[indicesIndex++] = index + 1;

                indices[indicesIndex++] = index + 1;
                indices[indicesIndex++] = index + 2;
                indices[indicesIndex++] = index + 3;

                index += 4;
            }
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : BoundingSphere.fromPoints(positions)
        });
    };

    return PolylineGeometry;
});