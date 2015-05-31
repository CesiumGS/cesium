/*global define*/
define([
        '../Core/defineProperties'
    ], function(
        defineProperties) {
    "use strict";

    /**
     * @private
     */
    var BatchedModel = function(content, batchId) {
        this._content = content;
        this._batchId = batchId;
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
                return this._content.getColor(this._batchId);
            },
            set : function(value) {
                this._content.setColor(this._batchId, value);
            }
        }
    });

    return BatchedModel;
});