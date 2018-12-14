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
    '../Scene/GroundPrimitive',
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
    GroundPrimitive,
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
     * @alias GroundGeometryUpdater
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

    GroundGeometryUpdater.prototype._isOnTerrain = function(entity, geometry) {
        return this._fillEnabled && !defined(geometry.height) && !defined(geometry.extrudedHeight) && GroundPrimitive.isSupported(this._scene);
    };

    GroundGeometryUpdater.prototype._getIsClosed = function(options) {
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        return height === 0 || (defined(extrudedHeight) && extrudedHeight !== height);
    };

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
    GroundGeometryUpdater.getGeometryHeight = function(height, heightReference) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('heightReference', heightReference);
        //>>includeEnd('debug');
        if (!defined(height)) {
            if (heightReference !== HeightReference.NONE) {
                oneTimeWarning(oneTimeWarning.geometryHeightReference);
            }
            return;
        }

        if (heightReference !== HeightReference.CLAMP_TO_GROUND) {
            return height;
        }
        return 0.0;
    };

    /**
     * @private
     */
    GroundGeometryUpdater.getGeometryExtrudedHeight = function(extrudedHeight, extrudedHeightReference) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('extrudedHeightReference', extrudedHeightReference);
        //>>includeEnd('debug');
        if (!defined(extrudedHeight)) {
            if (extrudedHeightReference !== HeightReference.NONE) {
                oneTimeWarning(oneTimeWarning.geometryExtrudedHeightReference);
            }
            return;
        }
        if (extrudedHeightReference !== HeightReference.CLAMP_TO_GROUND) {
            return extrudedHeight;
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
    GroundGeometryUpdater.computeGeometryOffsetAttribute = function(height, heightReference, extrudedHeight, extrudedHeightReference) {
        if (!defined(height) || !defined(heightReference)) {
            heightReference = HeightReference.NONE;
        }
        if (!defined(extrudedHeight) || !defined(extrudedHeightReference)) {
            extrudedHeightReference = HeightReference.NONE;
        }
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
