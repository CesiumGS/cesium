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
    './GeometryUpdater',
    './TerrainOffsetProperty',
    './Property'
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
    GeometryUpdater,
    TerrainOffsetProperty,
    Property) {
    'use strict';

    var defaultTerrainOffsetProperty = new ConstantProperty(0);

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

        this._terrainOffsetProperty = defaultTerrainOffsetProperty;
    }

    if (defined(Object.create)) {
        GroundGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        GroundGeometryUpdater.prototype.constructor = GroundGeometryUpdater;
    }

    defineProperties(GroundGeometryUpdater.prototype, {
        terrainOffsetProperty: {
            get: function() {
                return this._terrainOffsetProperty;
            }
        }
    });

    /**
     * @param {Entity} entity
     * @param {Object} geometry
     * @param {JulianDate} time
     * @param {Cartesian3} result
     *
     * @private
     */
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

        if (!this._dynamic) {
            var heightProperty = geometry.height;
            var extrudedHeightProperty = geometry.extrudedHeight;
            var heightReference = HeightReference.NONE;
            var extrudedHeightReference = HeightReference.NONE;
            if (defined(heightProperty)) {
                heightReference = Property.getValueOrDefault(heightProperty.heightReference, Iso8601.MINIMUM_VALUE, HeightReference.NONE);
            }
            if (defined(extrudedHeightProperty)) {
                extrudedHeightReference = Property.getValueOrDefault(extrudedHeightProperty.heightReference, Iso8601.MINIMUM_VALUE, HeightReference.NONE);
            }

            if (heightReference !== HeightReference.NONE || extrudedHeightReference === HeightReference.RELATIVE_TO_GROUND) {
                this._terrainOffsetProperty = new TerrainOffsetProperty(this._scene, new ConstantProperty(this._computeCenter(entity, geometry, Iso8601.MINIMUM_VALUE, new Cartesian3())));
            } else {
                this._terrainOffsetProperty = defaultTerrainOffsetProperty;
            }
        }
    };

    return GroundGeometryUpdater;
});
