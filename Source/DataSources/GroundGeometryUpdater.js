define([
    '../Core/ApproximateTerrainHeights',
    '../Core/Cartesian3',
    '../Core/Check',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/GeometryOffsetAttribute',
    '../Core/Iso8601',
    '../Core/oneTimeWarning',
    '../Scene/HeightReference',
    './CallbackProperty',
    './ConstantProperty',
    './GeometryUpdater',
    './Property',
    './TerrainOffsetProperty'
], function(
    ApproximateTerrainHeights,
    Cartesian3,
    Check,
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    GeometryOffsetAttribute,
    Iso8601,
    oneTimeWarning,
    HeightReference,
    CallbackProperty,
    ConstantProperty,
    GeometryUpdater,
    Property,
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

        /**
         * Gets the terrain offset property
         * @type {TerrainOffsetProperty}
         * @memberof GroundGeometryUpdater.prototype
         * @readonly
         */
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

        if (defined(this._terrainOffsetProperty)) {
            this._terrainOffsetProperty.destroy();
            this._terrainOffsetProperty = undefined;
        }

        var heightReferenceProperty = geometry.heightReference;
        var extrudedHeightReferenceProperty = geometry.extrudedHeightReference;

        if (defined(heightReferenceProperty) || defined(extrudedHeightReferenceProperty)) {
            var centerPosition = new CallbackProperty(this._computeCenter.bind(this), !this._dynamic);
            this._terrainOffsetProperty = new TerrainOffsetProperty(this._scene, centerPosition, heightReferenceProperty, extrudedHeightReferenceProperty);
        }
    };

    /**
     * @private
     */
    GroundGeometryUpdater.getGeometryHeight = function(heightProperty, heightReferenceProperty, time) {
        var heightReference = Property.getValueOrDefault(heightReferenceProperty, time, HeightReference.NONE);
        if (heightReference !== HeightReference.CLAMP_TO_GROUND) {
            return Property.getValueOrUndefined(heightProperty, time);
        }
        return 0.0;
    };

    /**
     * @private
     */
    GroundGeometryUpdater.getGeometryExtrudedHeight = function(extrudedHeightProperty, extrudedHeightReferenceProperty, time) {
        var heightReference = Property.getValueOrDefault(extrudedHeightReferenceProperty, time, HeightReference.NONE);
        if (heightReference !== HeightReference.CLAMP_TO_GROUND) {
            return Property.getValueOrUndefined(extrudedHeightProperty, time);
        }

        return GroundGeometryUpdater.CLAMP_TO_GROUND;
    };

    /**
     * @private
     */
    GroundGeometryUpdater.CLAMP_TO_GROUND = 'clamp';

    /**
     * @private
     */
    GroundGeometryUpdater.computeGeometryOffsetAttribute = function(heightReferenceProperty, extrudedHeightReferenceProperty, time) {
        var heightReference = Property.getValueOrDefault(heightReferenceProperty, time, HeightReference.NONE);
        var extrudedHeightReference = Property.getValueOrDefault(extrudedHeightReferenceProperty, time, HeightReference.NONE);

        var n = 0;
        if (heightReference !== HeightReference.NONE) {
            n++;
        }
        if (extrudedHeightReference === HeightReference.RELATIVE_TO_GROUND) {
            n++;
        }
        if (n === 2) {
            return GeometryOffsetAttribute.ALL;
        }
        if (n === 1) {
            return GeometryOffsetAttribute.TOP;
        }

        return undefined;
    };

    return GroundGeometryUpdater;
});
