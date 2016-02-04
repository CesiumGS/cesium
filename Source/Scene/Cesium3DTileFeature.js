/*global define*/
define([
        '../Core/Color',
        '../Core/defineProperties'
    ], function(
        Color,
        defineProperties) {
    "use strict";

    /**
     * Provides access to a feature's properties stored in the 3D tile's batch table, as well
     * as the ability to show/hide a feature and change its highlight color via
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color}, respectively.
     * <p>
     * Modifications to a <code>Cesium3DTileFeature</code> object have the lifetime of the tile's
     * content.  If the tile's content is unloaded, e.g., due to it going out of view and needing
     * to free space in the cache for visible tiles, listen to the DOC_TBA event to save any
     * modifications.
     * </p>
     * <p>
     * Do not construct this directly.  Access it through {@link Cesium3DTileContent#getFeature}
     * or picking using {@link Scene#pick} and {@link Scene#pickPosition}.
     * </p>
     *
     * @alias Cesium3DTileFeature
     * @constructor
     *
     * @example
     * // On mouse over, display all the properties for a feature in the console log.
     * handler.setInputAction(function(movement) {
     *     var feature = scene.pick(movement.endPosition);
     *     if (Cesium.defined(feature) && (feature.primitive === tileset)) {
     *         var properties = tileset.properties;
     *         if (Cesium.defined(properties)) {
     *             for (var name in properties) {
     *                 if (properties.hasOwnProperty(name)) {
     *                     console.log(name + ': ' + feature.getProperty(name));
     *                 }
     *             }
     *         }
     *     }
     * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
     */
    function Cesium3DTileFeature(tileset, batchTableResources, batchId) {
        this._batchTableResources = batchTableResources;
        this._batchId = batchId;
        this._color = undefined;  // for calling getColor

        /**
         * All objects returned by {@link Scene#pick} have a <code>primitive</code> property.
         *
         * @type {Cesium3DTileset}
         *
         * @private
         */
        this.primitive = tileset;
    }

    defineProperties(Cesium3DTileFeature.prototype, {
        /**
         * Gets and sets if the feature will be shown.
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Boolean}
         *
         * @default true
         */
        show : {
            get : function() {
                return this._batchTableResources.getShow(this._batchId);
            },
            set : function(value) {
                this._batchTableResources.setShow(this._batchId, value);
            }
        },

        /**
         * Gets and sets the highlight color multiplied with the feature's color.  When
         * this is white, the feature's color is not changed.
         * <p>
         * Only <code>red</code>, <code>green</code>, and <code>blue</code> components
         * are used; <code>alpha</code> is ignored.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Color}
         *
         * @default {@link Color.WHITE}
         */
        color : {
            get : function() {
                if (!this._color) {
                    this._color = new Color();
                }
                return this._batchTableResources.getColor(this._batchId, this._color);
            },
            set : function(value) {
                this._batchTableResources.setColor(this._batchId, value);
            }
        }
    });

    /**
     * Returns the value of the feature's property with the given name.
     * <p>
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color} are not equivalent to
     * <code>'show'</code> and <code>'color'</code> properties; the former are runtime-specific properties
     * that are not part of the feature's properties in the stored 3D Tileset.
     * </p>
     *
     * @param {String} name The case-sensitive name of the property.
     * @returns {Any} The value of the property or <code>undefined</code> if the property does not exist.
     *
     * @example
     * // Display all the properties for a feature in the console log.
     * var properties = tileset.properties;
     * if (Cesium.defined(properties)) {
     *     for (var name in properties) {
     *         if (properties.hasOwnProperty(name)) {
     *             console.log(name + ': ' + feature.getProperty(name));
     *         }
     *     }
     * }
     *
     * @see {Cesium3DTileset#properties}
     */
    Cesium3DTileFeature.prototype.getProperty = function(name) {
        return this._batchTableResources.getProperty(this._batchId, name);
    };

    /**
     * Sets the value of the feature's property with the given name.
     * <p>
     * If a property with the given name doesn't exist, it is created.
     * </p>
     * <p>
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color} are not equivalent to
     * <code>'show'</code> and <code>'color'</code> properties; the former are runtime-specific properties
     * that are not part of the feature's properties in the stored 3D Tileset.
     * </p>
     *
     * @param {String} name The case-sensitive name of the property.
     * @param {Any} value The value of the property that will be copied.
     *
     * @example
     * var height = feature.getProperty('Height'); // e.g., the height of a building
     *
     * @example
     * var name = 'clicked';
     * if (feature.getProperty(name)) {
     *     console.log('already clicked');
     * } else {
     *     feature.setProperty(name, true);
     *     console.log('first click');
     * }
     *
     * @see {Cesium3DTileset#properties}
     */
    Cesium3DTileFeature.prototype.setProperty = function(name, value) {
        this._batchTableResources.setProperty(this._batchId, name, value);
    };

    return Cesium3DTileFeature;
});