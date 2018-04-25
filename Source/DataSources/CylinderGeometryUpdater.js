define([
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CylinderGeometry',
        '../Core/CylinderOutlineGeometry',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryUpdater',
        './Property'
    ], function(
        Cartesian3,
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        CylinderGeometry,
        CylinderOutlineGeometry,
        defined,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GeometryInstance,
        Iso8601,
        ShowGeometryInstanceAttribute,
        MaterialAppearance,
        PerInstanceColorAppearance,
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryUpdater,
        Property) {
    'use strict';

    var positionScratch = new Cartesian3();
    var scratchColor = new Color();

    function CylinderGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.length = undefined;
        this.topRadius = undefined;
        this.bottomRadius = undefined;
        this.slices = undefined;
        this.numberOfVerticalLines = undefined;
    }

    /**
     * A {@link GeometryUpdater} for cylinders.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias CylinderGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function CylinderGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity: entity,
            scene: scene,
            geometryOptions: new CylinderGeometryOptions(entity),
            geometryPropertyName: 'cylinder',
            observedPropertyNames: ['availability', 'position', 'orientation', 'cylinder']
        });
    }

    if (defined(Object.create)) {
        CylinderGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        CylinderGeometryUpdater.prototype.constructor = CylinderGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    CylinderGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new CylinderGeometry(this._options),
            modelMatrix : entity.computeModelMatrix(time),
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
    CylinderGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new CylinderOutlineGeometry(this._options),
            modelMatrix : entity.computeModelMatrix(time),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    CylinderGeometryUpdater.prototype._isHidden = function(entity, cylinder) {
        return !defined(entity.position) || !defined(cylinder.length) || !defined(cylinder.topRadius) || !defined(cylinder.bottomRadius) || GeometryUpdater.prototype._isHidden.call(this, entity, cylinder);
    };

    CylinderGeometryUpdater.prototype._isDynamic = function(entity, cylinder) {
        return !entity.position.isConstant || //
                !Property.isConstant(entity.orientation) || //
                !cylinder.length.isConstant || //
                !cylinder.topRadius.isConstant || //
                !cylinder.bottomRadius.isConstant || //
                !Property.isConstant(cylinder.slices) || //
                !Property.isConstant(cylinder.outlineWidth) || //
                !Property.isConstant(cylinder.numberOfVerticalLines);
    };

    CylinderGeometryUpdater.prototype._setStaticOptions = function(entity, cylinder) {
        var slices = cylinder.slices;
        var numberOfVerticalLines = cylinder.numberOfVerticalLines;

        var options = this._options;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.length = cylinder.length.getValue(Iso8601.MINIMUM_VALUE);
        options.topRadius = cylinder.topRadius.getValue(Iso8601.MINIMUM_VALUE);
        options.bottomRadius = cylinder.bottomRadius.getValue(Iso8601.MINIMUM_VALUE);
        options.slices = defined(slices) ? slices.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    CylinderGeometryUpdater.DynamicGeometryUpdater = DynamicCylinderGeometryUpdater;

    /**
     * @private
     */
    function DynamicCylinderGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicCylinderGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicCylinderGeometryUpdater.prototype.constructor = DynamicCylinderGeometryUpdater;
    }

    DynamicCylinderGeometryUpdater.prototype._isHidden = function(entity, cylinder, time) {
        var options = this._options;
        var position = Property.getValueOrUndefined(entity.position, time, positionScratch);
        return !defined(position) || !defined(options.length) || !defined(options.topRadius) || //
               !defined(options.bottomRadius) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, cylinder, time);
    };

    DynamicCylinderGeometryUpdater.prototype._setOptions = function(entity, cylinder, time) {
        var options = this._options;
        options.length = Property.getValueOrUndefined(cylinder.length, time);
        options.topRadius = Property.getValueOrUndefined(cylinder.topRadius, time);
        options.bottomRadius = Property.getValueOrUndefined(cylinder.bottomRadius, time);
        options.slices = Property.getValueOrUndefined(cylinder.slices, time);
        options.numberOfVerticalLines = Property.getValueOrUndefined(cylinder.numberOfVerticalLines, time);
    };

    return CylinderGeometryUpdater;
});
