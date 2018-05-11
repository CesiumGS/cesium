define([
        '../Core/BoxGeometry',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
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
        BoxGeometry,
        BoxOutlineGeometry,
        Cartesian3,
        Check,
        Color,
        ColorGeometryInstanceAttribute,
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

    function BoxGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.dimensions = undefined;
    }

    /**
     * A {@link GeometryUpdater} for boxes.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias BoxGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function BoxGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new BoxGeometryOptions(entity),
            geometryPropertyName : 'box',
            observedPropertyNames : ['availability', 'position', 'orientation', 'box']
        });
    }

    if (defined(Object.create)) {
        BoxGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        BoxGeometryUpdater.prototype.constructor = BoxGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    BoxGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : BoxGeometry.fromDimensions(this._options),
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
    BoxGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : BoxOutlineGeometry.fromDimensions(this._options),
            modelMatrix : entity.computeModelMatrix(time),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    BoxGeometryUpdater.prototype._isHidden = function(entity, box) {
        return !defined(box.dimensions) || !defined(entity.position) || GeometryUpdater.prototype._isHidden.call(this, entity, box);
    };

    BoxGeometryUpdater.prototype._isDynamic = function(entity, box) {
        return !entity.position.isConstant ||  !Property.isConstant(entity.orientation) ||  !box.dimensions.isConstant ||  !Property.isConstant(box.outlineWidth);
    };

    BoxGeometryUpdater.prototype._setStaticOptions = function(entity, box) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.dimensions = box.dimensions.getValue(Iso8601.MINIMUM_VALUE, options.dimensions);
    };

    BoxGeometryUpdater.DynamicGeometryUpdater = DynamicBoxGeometryUpdater;

    /**
     * @private
     */
    function DynamicBoxGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicBoxGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicBoxGeometryUpdater.prototype.constructor = DynamicBoxGeometryUpdater;
    }

    DynamicBoxGeometryUpdater.prototype._isHidden = function(entity, box, time) {
        var position = Property.getValueOrUndefined(entity.position, time, positionScratch);
        var dimensions = this._options.dimensions;
        return !defined(position) || !defined(dimensions) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, box, time);
    };

    DynamicBoxGeometryUpdater.prototype._setOptions = function(entity, box, time) {
        this._options.dimensions = Property.getValueOrUndefined(box.dimensions, time, this._options.dimensions);
    };

    return BoxGeometryUpdater;
});
