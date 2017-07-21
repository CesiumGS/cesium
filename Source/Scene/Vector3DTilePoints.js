define([
        '../Core/AttributeCompression',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Math',
        './BillboardCollection',
        './LabelCollection',
        './PolylineCollection',
        './VerticalOrigin'
    ], function(
        AttributeCompression,
        Cartesian3,
        Cartographic,
        defined,
        destroyObject,
        CesiumMath,
        BillboardCollection,
        LabelCollection,
        PolylineCollection,
        VerticalOrigin) {
    'use strict';

    function Vector3DTilePoints(options) {
        this._positions = options.positions;
        this._batchTable = options.batchTable;
        this._batchIds = options.batchIds;

        this._rectangle = options.rectangle;
        this._minHeight = options.minimumHeight;
        this._maxHeight = options.maximumHeight;

        this._billboardCollection = undefined;
        this._labelCollection = undefined;
        this._polylineCollection = undefined;
    }

    var maxShort = 32767;

    var scratchCartographic = new Cartographic();
    var scratchCartesian3 = new Cartesian3();

    function createPoints(primitive, ellipsoid) {
        var positions = primitive._positions;
        var batchTable = primitive._batchTable;
        var batchIds = primitive._batchIds;

        var rectangle = primitive._rectangle;
        var minHeight = primitive._minHeight;
        var maxHeight = primitive._maxHeight;

        var billboardCollection = primitive._billboardCollection = new BillboardCollection({ batchTable : batchTable });
        var labelCollection = primitive._labelCollection = new LabelCollection({ batchTable : batchTable });
        var polylineCollection = primitive._polylineCollection = new PolylineCollection();

        var numberOfPoints = positions.length / 3;
        var uBuffer = positions.subarray(0, numberOfPoints);
        var vBuffer = positions.subarray(numberOfPoints, 2 * numberOfPoints);
        var heightBuffer = positions.subarray(2 * numberOfPoints, 3 * numberOfPoints);
        AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

        for (var i = 0; i < numberOfPoints; ++i) {
            var id = batchIds[i];

            var u = uBuffer[i];
            var v = vBuffer[i];
            var height = heightBuffer[i];

            var lon = CesiumMath.lerp(rectangle.west, rectangle.east, u / maxShort);
            var lat = CesiumMath.lerp(rectangle.south, rectangle.north, v / maxShort);
            var alt = CesiumMath.lerp(minHeight, maxHeight, height / maxShort);

            var cartographic = Cartographic.fromRadians(lon, lat, alt, scratchCartographic);
            var position = ellipsoid.cartographicToCartesian(cartographic, scratchCartesian3);

            var b = billboardCollection.add();
            b.position = position;
            b.verticalOrigin = VerticalOrigin.BOTTOM;
            b._batchIndex = id;

            var l = labelCollection.add();
            l.text = ' ';
            l.position = position;
            l.verticalOrigin = VerticalOrigin.BOTTOM;
            l._batchIndex = id;

            var p = polylineCollection.add();
            p.positions = [Cartesian3.clone(position), Cartesian3.clone(position)];
        }
    }

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (batch table color * color).
     *
     * @param {Boolean} enabled Whether to enable debug coloring.
     * @param {Color} color The debug color.
     */
    Vector3DTilePoints.prototype.applyDebugSettings = function(enabled, color) {
        // TODO
    };

    /**
     * @private
     */
    Vector3DTilePoints.prototype.update = function(frameState) {
        if (!defined(this._billboardCollection)) {
            createPoints(this, frameState.mapProjection.ellipsoid);
        }

        this._billboardCollection.update(frameState);
        this._labelCollection.update(frameState);
        this._polylineCollection.update(frameState);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    Vector3DTilePoints.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Vector3DTilePoints.prototype.destroy = function() {
        this._billboardCollection = this._billboardCollection && this._billboardCollection.destroy();
        this._labelCollection = this._labelCollection && this._labelCollection.destroy();
        this._polylineCollection = this._polylineCollection && this._polylineCollection.destroy();
        return destroyObject(this);
    };

    return Vector3DTilePoints;
});
