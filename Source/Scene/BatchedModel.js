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
    var BatchedModel = function(content, batchId) {
        this._content = content;
        this._batchId = batchId;
        this._color = undefined;  // for calling getColor

// TODO: this should not be here.  It is so pickEntity doesn't crash when pickPosition is called.
        this.primitive = {};
    };

    defineProperties(BatchedModel.prototype, {
        /**
         * DOC_TBA
         */
        show : {
            get : function() {
                return this._content.getShow(this._batchId);
            },
            set : function(value) {
                this._content.setShow(this._batchId, value);
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
                return this._content.getColor(this._batchId, this._color);
            },
            set : function(value) {
                this._content.setColor(this._batchId, value);
            }
        }
    });

    BatchedModel.prototype.getProperty = function(name) {
        return this._content.getProperty(this._batchId, name);
    };

    BatchedModel.prototype.setProperty = function(name, value) {
        this._content.setProperty(this._batchId, name, value);
    };

    return BatchedModel;
});