/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/PolygonGeometry',
        '../Core/PrimitiveType',
        './GroundPrimitive',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        Cartesian3,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        defaultValue,
        defined,
        destroyObject,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        Matrix4,
        PolygonGeometry,
        PrimitiveType,
        GroundPrimitive,
        PerInstanceColorAppearance,
        Primitive) {
    'use strict';

    function Cesium3DTileGroundPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._positions = options.positions;
        this._offsets = options.offsets;
        this._counts = options.counts;
        this._indices = options.indices;
        this._decodeMatrix = options.decodeMatrix;

        this._ellispoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._minimumHeight = options.minimumHeight;
        this._maximumHeight = options.maximumHeight;
        this._center = options.center;
        this._color = options.color;

        this._primitive = undefined;
    }

    Cesium3DTileGroundPrimitive.prototype.update = function(frameState) {
        if (defined(this._positions) && !defined(this._va)) {
            var positions = this._positions;
            var offsets = this._offsets;
            var counts = this._counts;
            var indices = this._indices;
            var decodeMatrix = this._decodeMatrix;
            var center = this._center;
            var ellipsoid = this._ellispoid;

            var positionsLength = positions.length;
            var extrudedPositions = new Float64Array(positionsLength * 2.0);
            var positionIndex = 0;

            var minHeight = this._minimumHeight;
            var maxHeight = this._maximumHeight;

            var i;
            for (i = 0; i < positionsLength; i += 3) {
                var encodedPosition = Cartesian3.unpack(positions, i);
                var rtcPosition = Matrix4.multiplyByPoint(decodeMatrix, encodedPosition, encodedPosition);
                var position = Cartesian3.add(rtcPosition, center, rtcPosition);

                var normal = ellipsoid.geodeticSurfaceNormal(position);
                var scaledPosition = ellipsoid.scaleToGeodeticSurface(position);
                var scaledNormal = Cartesian3.multiplyByScalar(normal, minHeight, new Cartesian3());
                var minHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, new Cartesian3());

                scaledNormal = Cartesian3.multiplyByScalar(normal, maxHeight, new Cartesian3());
                var maxHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, new Cartesian3());

                Cartesian3.pack(maxHeightPosition, extrudedPositions, positionIndex);
                Cartesian3.pack(minHeightPosition, extrudedPositions, positionIndex + positionsLength);
                positionIndex += 3;
            }

            var positionIndicesLength = positions.length / 3;
            var wallIndicesLength = positions.length / 3 * 6;
            var indicesLength = indices.length;
            var extrudedIndices = new Uint32Array(indicesLength * 2 + wallIndicesLength);

            for (i = 0; i < indicesLength; i += 3) {
                var i0 = indices[i];
                var i1 = indices[i + 1];
                var i2 = indices[i + 2];

                extrudedIndices[i]     = i0;
                extrudedIndices[i + 1] = i1;
                extrudedIndices[i + 2] = i2;

                extrudedIndices[i + indicesLength]     = i2 + positionIndicesLength;
                extrudedIndices[i + 1 + indicesLength] = i1 + positionIndicesLength;
                extrudedIndices[i + 2 + indicesLength] = i0 + positionIndicesLength;
            }

            var indicesIndex = indicesLength * 2;
            var length = offsets.length;

            for (i = 0; i < length; ++i) {
                var offset = offsets[i];
                var count = counts[i];

                for (var j = 0; j < count - 1; ++j) {
                    extrudedIndices[indicesIndex++] = positionIndicesLength + offset + j;
                    extrudedIndices[indicesIndex++] = offset + j + 1;
                    extrudedIndices[indicesIndex++] = offset + j;

                    extrudedIndices[indicesIndex++] = positionIndicesLength + offset + j;
                    extrudedIndices[indicesIndex++] = positionIndicesLength + offset + j + 1;
                    extrudedIndices[indicesIndex++] = offset + j + 1;
                }
            }

            this._primitive = new GroundPrimitive({
                geometryInstances : new GeometryInstance({
                    geometry : new Geometry({
                        attributes : new GeometryAttributes({
                            position : new GeometryAttribute({
                                componentDatatype : ComponentDatatype.DOUBLE,
                                componentsPerAttribute : 3,
                                values : extrudedPositions
                            })
                        }),
                        indices : extrudedIndices,
                        primitiveType : PrimitiveType.TRIANGLES
                    }),
                    attributes: {
                        color: ColorGeometryInstanceAttribute.fromColor(this._color)
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true
                }),
                _precreated : true,
                asynchronous : false,
                _minimumHeight : this._minimumHeight,
                _maximumHeight : this._maximumHeight
            });

            this._positions = undefined;
            this._offsets = undefined;
            this._counts = undefined;
            this._decodeMatrix = undefined;
            this._center = undefined;
        }

        this._primitive.update(frameState);
    };

    Cesium3DTileGroundPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTileGroundPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Cesium3DTileGroundPrimitive;
});
