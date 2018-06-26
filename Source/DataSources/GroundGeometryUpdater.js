define([
    '../Core/Cartesian3',
    '../Core/Check',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/Iso8601',
    '../Core/oneTimeWarning',
    '../Scene/HeightReference',
    './ConstantProperty',
    './GeometryHeightProperty',
    './GeometryUpdater',
    './TerrainOffsetProperty'
], function(
    Cartesian3,
    Check,
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    Iso8601,
    oneTimeWarning,
    HeightReference,
    ConstantProperty,
    GeometryHeightProperty,
    GeometryUpdater,
    TerrainOffsetProperty) {
    'use strict';

    var defaultZIndex = new ConstantProperty(0);

    /**
     * An abstract class for updating ground geometry entities.
     * @constructor
     *
     * @param {Object} options An object with the following properties:
     * @param {Entity} options.entity The entity containing the geometry to be visualized.
     * @param {Scene} options.scene The scene where visualization is taking place.
     * @param {Object} options.geometryOptions Options for the geometry
     * @param {String} options.geometryPropertyName The geometry property name
     * @param {String[]} options.observedPropertyNames The entity properties this geometry cares about
     */
    function GroundGeometryUpdater(options) {
        GeometryUpdater.call(this, options);

        this._zIndex = 0;
        this._terrainOffsetProperty = undefined;
    }

    if (defined(Object.create)) {
        GroundGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        GroundGeometryUpdater.prototype.constructor = GroundGeometryUpdater;
    }

    defineProperties(GroundGeometryUpdater.prototype, {
        /**
         * Gets the zindex
         * @type {Number}
         * @memberof GroundGeometryUpdater.prototype
         * @readonly
         */
        zIndex: {
            get: function() {
                return this._zIndex;
            }
        },

        terrainOffsetProperty: {
            get: function() {
                return this._terrainOffsetProperty;
            }
        }
    });

    GroundGeometryUpdater.prototype._computeCenter = DeveloperError.throwInstantiationError;

    GroundGeometryUpdater.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        GeometryUpdater.prototype._onEntityPropertyChanged.call(this, entity, propertyName, newValue, oldValue);
        if (this._observedPropertyNames.indexOf(propertyName) === -1) {
            return;
        }

        var geometry = this._entity[this._geometryPropertyName];
        if (!defined(geometry)) {
            return;
        }
        if (defined(geometry.zIndex) && (defined(geometry.height) || defined(geometry.extrudedHeight))) {
            oneTimeWarning(oneTimeWarning.geometryZIndex);
        }

        this._zIndex = defaultValue(geometry.zIndex, defaultZIndex);

        var heightProperty = geometry.height;
        var extrudedHeightProperty = geometry.extrudedHeight;

        if (defined(this._terrainOffsetProperty)) {
            this._terrainOffsetProperty.destroy();
        }

        if (heightProperty instanceof GeometryHeightProperty || extrudedHeightProperty instanceof GeometryHeightProperty) {
            this._terrainOffsetProperty = new TerrainOffsetProperty(this._scene, heightProperty, extrudedHeightProperty, this._computeCenter.bind(this));
        } else {
            this._terrainOffsetProperty = undefined;
        }
    };

    return GroundGeometryUpdater;
});
