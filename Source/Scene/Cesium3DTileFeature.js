/*global define*/
define([
        '../Core/Color',
        '../Core/defineProperties'
    ], function(
        Color,
        defineProperties) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Cesium3DTileFeature(tileset, batchTableResources, batchId) {
        this._batchTableResources = batchTableResources;
        this._batchId = batchId;
        this._color = undefined;  // for calling getColor

        /**
         * DOC_TBA
         *
         * All objects returned by {@link Scene#pick} have a <code>primitive</code> property.
         */
        this.primitive = tileset;
    }

    defineProperties(Cesium3DTileFeature.prototype, {
        /**
         * DOC_TBA
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
         * DOC_TBA
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
     * DOC_TBA
     */
    Cesium3DTileFeature.prototype.getProperty = function(name) {
        return this._batchTableResources.getProperty(this._batchId, name);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTileFeature.prototype.setProperty = function(name, value) {
        this._batchTableResources.setProperty(this._batchId, name, value);
    };

    return Cesium3DTileFeature;
});