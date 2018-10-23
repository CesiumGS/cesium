define([
        '../Core/ApproximateTerrainHeights',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/Ellipsoid',
        '../Core/GeometryInstance',
        '../Core/GeometryOffsetAttribute',
        '../Core/Iso8601',
        '../Core/OffsetGeometryInstanceAttribute',
        '../Core/Rectangle',
        '../Core/RectangleGeometry',
        '../Core/RectangleOutlineGeometry',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        '../Scene/HeightReference',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryUpdater',
        './GroundGeometryUpdater',
        './Property'
    ], function(
        ApproximateTerrainHeights,
        Cartesian3,
        Cartographic,
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        Ellipsoid,
        GeometryInstance,
        GeometryOffsetAttribute,
        Iso8601,
        OffsetGeometryInstanceAttribute,
        Rectangle,
        RectangleGeometry,
        RectangleOutlineGeometry,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        HeightReference,
        MaterialAppearance,
        PerInstanceColorAppearance,
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryUpdater,
        GroundGeometryUpdater,
        Property) {
    'use strict';

    var scratchColor = new Color();
    var defaultOffset = Cartesian3.ZERO;
    var offsetScratch = new Cartesian3();
    var scratchRectangle = new Rectangle();
    var scratchCenterRect = new Rectangle();
    var scratchCarto = new Cartographic();

    function RectangleGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.rectangle = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.rotation = undefined;
        this.offsetAttribute = undefined;
    }

    /**
     * A {@link GeometryUpdater} for rectangles.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias RectangleGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function RectangleGeometryUpdater(entity, scene) {
        GroundGeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new RectangleGeometryOptions(entity),
            geometryPropertyName : 'rectangle',
            observedPropertyNames : ['availability', 'rectangle']
        });

        this._onEntityPropertyChanged(entity, 'rectangle', entity.rectangle, undefined);
    }

    if (defined(Object.create)) {
        RectangleGeometryUpdater.prototype = Object.create(GroundGeometryUpdater.prototype);
        RectangleGeometryUpdater.prototype.constructor = RectangleGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    RectangleGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._fillEnabled) {
            throw new DeveloperError('This instance does not represent a filled geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);

        var attributes = {
            show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._fillProperty.getValue(time)),
            distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(this._distanceDisplayConditionProperty.getValue(time)),
            offset : undefined,
            color : undefined
        };

        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
            }
            attributes.color = ColorGeometryInstanceAttribute.fromColor(currentColor);
        }
        if (defined(this._options.offsetAttribute)) {
            attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));
        }

        return new GeometryInstance({
            id : entity,
            geometry : new RectangleGeometry(this._options),
            attributes : attributes
        });
    };

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    RectangleGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._outlineEnabled) {
            throw new DeveloperError('This instance does not represent an outlined geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK, scratchColor);
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);

        var attributes = {
            show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
            color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
            distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition),
            offset : undefined
        };

        if (defined(this._options.offsetAttribute)) {
            attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));
        }

        return new GeometryInstance({
            id : entity,
            geometry : new RectangleOutlineGeometry(this._options),
            attributes : attributes
        });
    };

    RectangleGeometryUpdater.prototype._computeCenter = function(time, result) {
        var rect = Property.getValueOrUndefined(this._entity.rectangle.coordinates, time, scratchCenterRect);
        if (!defined(rect)) {
            return;
        }
        var center = Rectangle.center(rect, scratchCarto);
        return Cartographic.toCartesian(center, Ellipsoid.WGS84, result);
    };

    RectangleGeometryUpdater.prototype._isHidden = function(entity, rectangle) {
        return !defined(rectangle.coordinates) || GeometryUpdater.prototype._isHidden.call(this, entity, rectangle);
    };

    RectangleGeometryUpdater.prototype._isDynamic = function(entity, rectangle) {
        return !rectangle.coordinates.isConstant || //
               !Property.isConstant(rectangle.height) || //
               !Property.isConstant(rectangle.extrudedHeight) || //
               !Property.isConstant(rectangle.granularity) || //
               !Property.isConstant(rectangle.stRotation) || //
               !Property.isConstant(rectangle.rotation) || //
               !Property.isConstant(rectangle.outlineWidth) || //
               !Property.isConstant(rectangle.zIndex) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    RectangleGeometryUpdater.prototype._setStaticOptions = function(entity, rectangle) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var heightValue = Property.getValueOrUndefined(rectangle.height, Iso8601.MINIMUM_VALUE);
        var heightReferenceValue = Property.getValueOrDefault(rectangle.heightReference, Iso8601.MINIMUM_VALUE, HeightReference.NONE);
        var extrudedHeightValue = Property.getValueOrUndefined(rectangle.extrudedHeight, Iso8601.MINIMUM_VALUE);
        var extrudedHeightReferenceValue = Property.getValueOrDefault(rectangle.extrudedHeightReference, Iso8601.MINIMUM_VALUE, HeightReference.NONE);
        if (defined(extrudedHeightValue) && !defined(heightValue)) {
            heightValue = 0;
        }

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.rectangle = rectangle.coordinates.getValue(Iso8601.MINIMUM_VALUE, options.rectangle);
        options.granularity = Property.getValueOrUndefined(rectangle.granularity, Iso8601.MINIMUM_VALUE);
        options.stRotation = Property.getValueOrUndefined(rectangle.stRotation, Iso8601.MINIMUM_VALUE);
        options.rotation = Property.getValueOrUndefined(rectangle.rotation, Iso8601.MINIMUM_VALUE);
        options.offsetAttribute = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightValue, heightReferenceValue, extrudedHeightValue, extrudedHeightReferenceValue);
        options.height = GroundGeometryUpdater.getGeometryHeight(heightValue, heightReferenceValue);

        extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(extrudedHeightValue, extrudedHeightReferenceValue);
        if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
            extrudedHeightValue = ApproximateTerrainHeights.getApproximateTerrainHeights(RectangleGeometry.computeRectangle(options, scratchRectangle)).minimumTerrainHeight;
        }

        options.extrudedHeight = extrudedHeightValue;
    };

    RectangleGeometryUpdater.DynamicGeometryUpdater = DynamicRectangleGeometryUpdater;

    /**
     * @private
     */
    function DynamicRectangleGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicRectangleGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicRectangleGeometryUpdater.prototype.constructor = DynamicRectangleGeometryUpdater;
    }

    DynamicRectangleGeometryUpdater.prototype._isHidden = function(entity, rectangle, time) {
        return  !defined(this._options.rectangle) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, rectangle, time);
    };

    DynamicRectangleGeometryUpdater.prototype._setOptions = function(entity, rectangle, time) {
        var options = this._options;
        var heightValue = Property.getValueOrUndefined(rectangle.height, time);
        var heightReferenceValue = Property.getValueOrDefault(rectangle.heightReference, time, HeightReference.NONE);
        var extrudedHeightValue = Property.getValueOrUndefined(rectangle.extrudedHeight, time);
        var extrudedHeightReferenceValue = Property.getValueOrDefault(rectangle.extrudedHeightReference, time, HeightReference.NONE);
        if (defined(extrudedHeightValue) && !defined(heightValue)) {
            heightValue = 0;
        }

        options.rectangle = Property.getValueOrUndefined(rectangle.coordinates, time, options.rectangle);
        options.granularity = Property.getValueOrUndefined(rectangle.granularity, time);
        options.stRotation = Property.getValueOrUndefined(rectangle.stRotation, time);
        options.rotation = Property.getValueOrUndefined(rectangle.rotation, time);
        options.offsetAttribute = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightValue, heightReferenceValue, extrudedHeightValue, extrudedHeightReferenceValue);
        options.height = GroundGeometryUpdater.getGeometryHeight(heightValue, heightReferenceValue);

        extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(extrudedHeightValue, extrudedHeightReferenceValue);
        if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
            extrudedHeightValue = ApproximateTerrainHeights.getApproximateTerrainHeights(RectangleGeometry.computeRectangle(options, scratchRectangle)).minimumTerrainHeight;
        }

        options.extrudedHeight = extrudedHeightValue;
    };

    return RectangleGeometryUpdater;
});
