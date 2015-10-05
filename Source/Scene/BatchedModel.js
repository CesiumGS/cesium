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
    var BatchedModel = function(tileset, batchData, batchId) {
        this._batchData = batchData;
        this._batchId = batchId;
        this._color = undefined;  // for calling getColor

        /**
         * DOC_TBA
         *
         * All objects returned by {@link Scene#pick} have a <code>primitive</code> property.
         */
        this.primitive = tileset;
    };

    defineProperties(BatchedModel.prototype, {
        /**
         * DOC_TBA
         */
        show : {
            get : function() {
                return this._batchData.getShow(this._batchId);
            },
            set : function(value) {
                this._batchData.setShow(this._batchId, value);
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
                return this._batchData.getColor(this._batchId, this._color);
            },
            set : function(value) {
                this._batchData.setColor(this._batchId, value);
            }
        }
    });

    /**
     * DOC_TBA
     */
    BatchedModel.prototype.getProperty = function(name) {
        return this._batchData.getProperty(this._batchId, name);
    };

    /**
     * DOC_TBA
     */
    BatchedModel.prototype.setProperty = function(name, value) {
        this._batchData.setProperty(this._batchId, name, value);
    };

    return BatchedModel;
});