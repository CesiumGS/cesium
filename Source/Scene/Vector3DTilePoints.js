define([
        '../Core/AttributeCompression',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DistanceDisplayCondition',
        '../Core/Math',
        '../Core/NearFarScalar',
        './BillboardCollection',
        './Cesium3DTilePointFeature',
        './HorizontalOrigin',
        './LabelCollection',
        './LabelStyle',
        './PolylineCollection',
        './VerticalOrigin'
    ], function(
        AttributeCompression,
        Cartesian3,
        Cartographic,
        Color,
        defined,
        destroyObject,
        DistanceDisplayCondition,
        CesiumMath,
        NearFarScalar,
        BillboardCollection,
        Cesium3DTilePointFeature,
        HorizontalOrigin,
        LabelCollection,
        LabelStyle,
        PolylineCollection,
        VerticalOrigin) {
    'use strict';

    function Vector3DTilePoints(options) {
        // released after the first update
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

        primitive._positions = undefined;
    }

    /**
     * Creates features for each point and places it at the batch id index of features.
     *
     * @param {Vector3DTileContent} content The vector tile content.
     * @param {Cesium3DTileFeature[]} features An array of features where the point features will be placed.
     */
    Vector3DTilePoints.prototype.createFeatures = function(content, features) {
        var billboardCollection = this._billboardCollection;
        var labelCollection = this._labelCollection;
        var polylineCollection = this._polylineCollection;

        var batchIds = this._batchIds;
        var length = batchIds.length;
        for (var i = 0; i < length; ++i) {
            var batchId = batchIds[i];

            var billboard = billboardCollection.get(i);
            var label = labelCollection.get(i);
            var polyline = polylineCollection.get(i);

            features[batchId] = new Cesium3DTilePointFeature(content, batchId, billboard, label, polyline);
        }
    };

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (batch table color * color).
     *
     * @param {Boolean} enabled Whether to enable debug coloring.
     * @param {Color} color The debug color.
     */
    Vector3DTilePoints.prototype.applyDebugSettings = function(enabled, color) {
        // TODO
    };

    function clearStyle(polygons, features) {
        var batchIds = polygons._batchIds;
        var length = batchIds.length;
        for (var i = 0; i < length; ++i) {
            var batchId = batchIds[i];
            var feature = features[batchId];

            feature.show = true;
            feature.pointSize = 8.0;
            feature.pointColor = Color.WHITE;
            feature.pointOutlineColor = Color.BLACK;
            feature.pointOutlineWidth = 0.0;
            feature.labelColor = Color.WHITE;
            feature.labelOutlineColor = Color.WHITE;
            feature.labelOutlineWidth = 1.0;
            feature.font = '30px sans-serif';
            feature.labelStyle = LabelStyle.FILL;
            feature.labelText = undefined;
            feature.backgroundColor = undefined;
            feature.backgroundPadding = undefined;
            feature.backgroundEnabled = false;
            feature.scaleByDistance = undefined;
            feature.translucencyByDistance = undefined;
            feature.distanceDisplayCondition = undefined;
            feature.heightOffset = 0.0;
            feature.anchorLineEnabled = false;
            feature.anchorLineColor = Color.WHITE;
            feature.image = undefined;
            feature.disableDepthTestDistance = 0.0;
            feature.origin = HorizontalOrigin.CENTER;
            feature.labelOrigin = HorizontalOrigin.LEFT;

            feature._setBillboardImage();
        }
    }

    var scratchColor = new Color();
    var scratchColor2 = new Color();
    var scratchColor3 = new Color();
    var scratchColor4 = new Color();
    var scratchColor5 = new Color();
    var scratchColor6 = new Color();

    /**
     * Apply a style to the content.
     *
     * @param {FrameState} frameState The frame state.
     * @param {Cesium3DTileStyle} style The style.
     * @param {Cesium3DTileFeature[]} features The array of features.
     */
    Vector3DTilePoints.prototype.applyStyle = function(frameState, style, features) {
        if (!defined(style)) {
            clearStyle(this, features);
            return;
        }

        var batchIds = this._batchIds;
        var length = batchIds.length;
        for (var i = 0; i < length; ++i) {
            var batchId = batchIds[i];
            var feature = features[batchId];

            if (defined(style.show)) {
                feature.show = style.show.evaluate(frameState, feature);
            }

            if (defined(style.pointSize)) {
                feature.pointSize = style.pointSize.evaluate(frameState, feature);
            }

            if (defined(style.pointColor)) {
                feature.pointColor = style.pointColor.evaluateColor(frameState, feature, scratchColor);
            }

            if (defined(style.pointOutlineColor)) {
                feature.pointOutlineColor = style.pointOutlineColor.evaluateColor(frameState, feature, scratchColor2);
            }

            if (defined(style.pointOutlineWidth)) {
                feature.pointOutlineWidth = style.pointOutlineWidth.evaluate(frameState, feature);
            }

            if (defined(style.labelColor)) {
                feature.labelColor = style.labelColor.evaluateColor(frameState, feature, scratchColor3);
            }

            if (defined(style.labelOutlineColor)) {
                feature.labelOutlineColor = style.labelOutlineColor.evaluateColor(frameState, feature, scratchColor4);
            }

            if (defined(style.labelOutlineWidth)) {
                feature.labelOutlineWidth = style.labelOutlineWidth.evaluate(frameState, feature);
            }

            if (defined(style.font)) {
                feature.font = style.font.evaluate(frameState, feature);
            }

            if (defined(style.labelStyle)) {
                feature.labelStyle = style.labelStyle.evaluate(frameState, feature);
            }

            if (defined(style.labelText)) {
                feature.labelText = style.labelText.evaluate(frameState, feature);
            } else {
                feature.labelText = undefined;
            }

            if (defined(style.backgroundColor)) {
                feature.backgroundColor = style.backgroundColor.evaluateColor(frameState, feature, scratchColor5);
            }

            if (defined(style.backgroundPadding)) {
                feature.backgroundPadding = style.backgroundPadding.evaluate(frameState, feature);
            }

            if (defined(style.backgroundEnabled)) {
                feature.backgroundEnabled = style.backgroundEnabled.evaluate(frameState, feature);
            }

            if (defined(style.scaleByDistance)) {
                var scaleByDistanceCart4 = style.scaleByDistance.evaluate(frameState, feature);
                feature.scaleByDistance = new NearFarScalar(scaleByDistanceCart4.x, scaleByDistanceCart4.y, scaleByDistanceCart4.z, scaleByDistanceCart4.w);
            } else {
                feature.scaleBydistance = undefined;
            }

            if (defined(style.translucencyByDistance)) {
                var translucencyByDistanceCart4 = style.translucencyByDistance.evaluate(frameState, feature);
                feature.translucencyByDistance = new NearFarScalar(translucencyByDistanceCart4.x, translucencyByDistanceCart4.y, translucencyByDistanceCart4.z, translucencyByDistanceCart4.w);
            } else {
                feature.translucencyByDistance = undefined;
            }

            if (defined(style.distanceDisplayCondition)) {
                var distanceDisplayConditionCart2 = style.distanceDisplayCondition.evaluate(frameState, feature);
                feature.distanceDisplayCondition = new DistanceDisplayCondition(distanceDisplayConditionCart2.x, distanceDisplayConditionCart2.y);
            } else {
                feature.distanceDisplayCondition = undefined;
            }

            if (defined(style.heightOffset)) {
                feature.heightOffset = style.heightOffset.evaluate(frameState, feature);
            }

            if (defined(style.anchorLineEnabled)) {
                feature.anchorLineEnabled = style.anchorLineEnabled.evaluate(frameState, feature);
            }

            if (defined(style.anchorLineColor)) {
                feature.anchorLineColor = style.anchorLineColor.evaluateColor(frameState, feature, scratchColor6);
            }

            if (defined(style.image)) {
                feature.image = style.image.evaluate(frameState, feature);
            } else {
                feature.image = undefined;
            }

            if (defined(style.disableDepthTestDistance)) {
                feature.disableDepthTestDistance = style.disableDepthTestDistance.evaluate(frameState, feature);
            }

            if (defined(style.origin)) {
                feature.origin = style.origin.evaluate(frameState, feature);
            }

            if (defined(style.labelOrigin)) {
                feature.labelOrigin = style.labelOrigin.evaluate(frameState, feature);
            }

            feature._setBillboardImage();
        }
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
