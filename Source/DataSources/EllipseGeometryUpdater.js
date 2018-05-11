define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/EllipseGeometry',
        '../Core/EllipseOutlineGeometry',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryUpdater',
        './Property'
    ], function(
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        EllipseGeometry,
        EllipseOutlineGeometry,
        GeometryInstance,
        Iso8601,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryUpdater,
        Property) {
    'use strict';

    var scratchColor = new Color();

    function EllipseGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.center = undefined;
        this.semiMajorAxis = undefined;
        this.semiMinorAxis = undefined;
        this.rotation = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.numberOfVerticalLines = undefined;
    }

    /**
     * A {@link GeometryUpdater} for ellipses.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias EllipseGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function EllipseGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new EllipseGeometryOptions(entity),
            geometryPropertyName : 'ellipse',
            observedPropertyNames : ['availability', 'position', 'ellipse']
        });
    }

    if (defined(Object.create)) {
        EllipseGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        EllipseGeometryUpdater.prototype.constructor = EllipseGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    EllipseGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._fillEnabled) {
            throw new DeveloperError('This instance does not represent a filled geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute,
                color : color
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new EllipseGeometry(this._options),
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
    EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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

        return new GeometryInstance({
            id : entity,
            geometry : new EllipseOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    EllipseGeometryUpdater.prototype._isHidden = function(entity, ellipse) {
        var position = entity.position;

        return !defined(position) || !defined(ellipse.semiMajorAxis) || !defined(ellipse.semiMinorAxis) || GeometryUpdater.prototype._isHidden.call(this, entity, ellipse);
    };

    EllipseGeometryUpdater.prototype._isOnTerrain = function(entity, ellipse) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        return this._fillEnabled && !defined(ellipse.height) && !defined(ellipse.extrudedHeight) && isColorMaterial && GroundPrimitive.isSupported(this._scene);
    };

    EllipseGeometryUpdater.prototype._isDynamic = function(entity, ellipse) {
        return !entity.position.isConstant || //
               !ellipse.semiMajorAxis.isConstant || //
               !ellipse.semiMinorAxis.isConstant || //
               !Property.isConstant(ellipse.rotation) || //
               !Property.isConstant(ellipse.height) || //
               !Property.isConstant(ellipse.extrudedHeight) || //
               !Property.isConstant(ellipse.granularity) || //
               !Property.isConstant(ellipse.stRotation) || //
               !Property.isConstant(ellipse.outlineWidth) || //
               !Property.isConstant(ellipse.numberOfVerticalLines) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    EllipseGeometryUpdater.prototype._getIsClosed = function(options) {
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        return height === 0 || (defined(extrudedHeight) && extrudedHeight !== height);
    };

    EllipseGeometryUpdater.prototype._setStaticOptions = function(entity, ellipse) {
        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;
        var numberOfVerticalLines = ellipse.numberOfVerticalLines;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.center = entity.position.getValue(Iso8601.MINIMUM_VALUE, options.center);
        options.semiMajorAxis = ellipse.semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMajorAxis);
        options.semiMinorAxis = ellipse.semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMinorAxis);
        options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    EllipseGeometryUpdater.DynamicGeometryUpdater = DynamicEllipseGeometryUpdater;

    /**
     * @private
     */
    function DynamicEllipseGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicEllipseGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicEllipseGeometryUpdater.prototype.constructor = DynamicEllipseGeometryUpdater;
    }

    DynamicEllipseGeometryUpdater.prototype._isHidden = function(entity, ellipse, time) {
        var options = this._options;
        return !defined(options.center) || !defined(options.semiMajorAxis) || !defined(options.semiMinorAxis) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, ellipse, time);
    };

    DynamicEllipseGeometryUpdater.prototype._setOptions = function(entity, ellipse, time) {
        var options = this._options;
        options.center = Property.getValueOrUndefined(entity.position, time, options.center);
        options.semiMajorAxis = Property.getValueOrUndefined(ellipse.semiMajorAxis, time);
        options.semiMinorAxis = Property.getValueOrUndefined(ellipse.semiMinorAxis, time);
        options.rotation = Property.getValueOrUndefined(ellipse.rotation, time);
        options.height = Property.getValueOrUndefined(ellipse.height, time);
        options.extrudedHeight = Property.getValueOrUndefined(ellipse.extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(ellipse.granularity, time);
        options.stRotation = Property.getValueOrUndefined(ellipse.stRotation, time);
        options.numberOfVerticalLines = Property.getValueOrUndefined(ellipse.numberOfVerticalLines, time);
    };

    return EllipseGeometryUpdater;
});
