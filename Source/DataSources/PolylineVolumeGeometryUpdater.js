import Check from '../Core/Check.js';
import Color from '../Core/Color.js';
import ColorGeometryInstanceAttribute from '../Core/ColorGeometryInstanceAttribute.js';
import defined from '../Core/defined.js';
import DeveloperError from '../Core/DeveloperError.js';
import DistanceDisplayConditionGeometryInstanceAttribute from '../Core/DistanceDisplayConditionGeometryInstanceAttribute.js';
import GeometryInstance from '../Core/GeometryInstance.js';
import Iso8601 from '../Core/Iso8601.js';
import PolylineVolumeGeometry from '../Core/PolylineVolumeGeometry.js';
import PolylineVolumeOutlineGeometry from '../Core/PolylineVolumeOutlineGeometry.js';
import ShowGeometryInstanceAttribute from '../Core/ShowGeometryInstanceAttribute.js';
import MaterialAppearance from '../Scene/MaterialAppearance.js';
import PerInstanceColorAppearance from '../Scene/PerInstanceColorAppearance.js';
import ColorMaterialProperty from './ColorMaterialProperty.js';
import DynamicGeometryUpdater from './DynamicGeometryUpdater.js';
import GeometryUpdater from './GeometryUpdater.js';
import Property from './Property.js';

    var scratchColor = new Color();

    function PolylineVolumeGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.polylinePositions = undefined;
        this.shapePositions = undefined;
        this.cornerType = undefined;
        this.granularity = undefined;
    }

    /**
     * A {@link GeometryUpdater} for polyline volumes.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias PolylineVolumeGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function PolylineVolumeGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new PolylineVolumeGeometryOptions(entity),
            geometryPropertyName : 'polylineVolume',
            observedPropertyNames : ['availability', 'polylineVolume']
        });

        this._onEntityPropertyChanged(entity, 'polylineVolume', entity.polylineVolume, undefined);
    }

    if (defined(Object.create)) {
        PolylineVolumeGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        PolylineVolumeGeometryUpdater.prototype.constructor = PolylineVolumeGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    PolylineVolumeGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new PolylineVolumeGeometry(this._options),
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
    PolylineVolumeGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new PolylineVolumeOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    PolylineVolumeGeometryUpdater.prototype._isHidden = function(entity, polylineVolume) {
        return !defined(polylineVolume.positions) || !defined(polylineVolume.shape) || GeometryUpdater.prototype._isHidden.call(this, entity, polylineVolume);
    };

    PolylineVolumeGeometryUpdater.prototype._isDynamic = function(entity, polylineVolume) {
        return !polylineVolume.positions.isConstant || //
               !polylineVolume.shape.isConstant || //
               !Property.isConstant(polylineVolume.granularity) || //
               !Property.isConstant(polylineVolume.outlineWidth) || //
               !Property.isConstant(polylineVolume.cornerType);
    };

    PolylineVolumeGeometryUpdater.prototype._setStaticOptions = function(entity, polylineVolume) {
        var granularity = polylineVolume.granularity;
        var cornerType = polylineVolume.cornerType;

        var options = this._options;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.polylinePositions = polylineVolume.positions.getValue(Iso8601.MINIMUM_VALUE, options.polylinePositions);
        options.shapePositions = polylineVolume.shape.getValue(Iso8601.MINIMUM_VALUE, options.shape);
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.cornerType = defined(cornerType) ? cornerType.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    PolylineVolumeGeometryUpdater.DynamicGeometryUpdater = DynamicPolylineVolumeGeometryUpdater;

    /**
     * @private
     */
    function DynamicPolylineVolumeGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicPolylineVolumeGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicPolylineVolumeGeometryUpdater.prototype.constructor = DynamicPolylineVolumeGeometryUpdater;
    }

    DynamicPolylineVolumeGeometryUpdater.prototype._isHidden = function(entity, polylineVolume, time) {
        var options = this._options;
        return !defined(options.polylinePositions) || !defined(options.shapePositions) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, polylineVolume, time);
    };

    DynamicPolylineVolumeGeometryUpdater.prototype._setOptions = function(entity, polylineVolume, time) {
        var options = this._options;
        options.polylinePositions = Property.getValueOrUndefined(polylineVolume.positions, time, options.polylinePositions);
        options.shapePositions = Property.getValueOrUndefined(polylineVolume.shape, time);
        options.granularity = Property.getValueOrUndefined(polylineVolume.granularity, time);
        options.cornerType = Property.getValueOrUndefined(polylineVolume.cornerType, time);
    };
export default PolylineVolumeGeometryUpdater;
