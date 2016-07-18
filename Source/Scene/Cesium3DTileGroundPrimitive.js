/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/PolygonGeometry',
        './GroundPrimitive'
    ], function(
        Cartesian3,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        destroyObject,
        GeometryInstance,
        Matrix4,
        PolygonGeometry,
        GroundPrimitive) {
    'use strict';

    function Cesium3DTileGroundPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._positions = options.positions;
        this._offsets = options.offsets;
        this._counts = options.counts;
        this._decodeMatrix = options.decodeMatrix;

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
            var decodeMatrix = this._decodeMatrix;
            var center = this._center;

            var length = offsets.length;

            var instances = new Array(length);

            for (var i = 0; i < length; ++i) {
                var offset = offsets[i];
                var count = counts[i];

                var polygonPositions = new Array(count);
                for (var k = 0; k < count; ++k) {
                    var encodedPosition = Cartesian3.unpack(positions, offset * 3 + k * 3);
                    var rtcPosition = Matrix4.multiplyByPoint(decodeMatrix, encodedPosition, encodedPosition);
                    polygonPositions[k] = Cartesian3.add(rtcPosition, center, rtcPosition);
                }

                instances[i] = new GeometryInstance({
                    geometry : PolygonGeometry.fromPositions({
                        positions : polygonPositions
                    }),
                    attributes: {
                        color: ColorGeometryInstanceAttribute.fromColor(this._color)
                    }
                });
            }

            this._primitive = new GroundPrimitive({
                geometryInstances : instances,
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
