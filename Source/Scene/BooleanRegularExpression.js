/*global define*/
define([
       '../Core/defined',
       '../Core/defineProperties'
    ], function(
        defined,
        defineProperties) {
    'use strict';

    // TODO: replace with a real parser/AST
    // TODO: expose flags? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp

    /**
     * DOC_TBA
     */
    function BooleanRegularExpression(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;

        var pattern = jsonExpression.pattern;
        this._pattern = pattern;
        this._regEx = new RegExp(pattern);

        this._propertyName = jsonExpression.propertyName;
    }

    defineProperties(BooleanRegularExpression.prototype, {
        /**
         * DOC_TBA
         */
        pattern : {
            get : function() {
                return this._pattern;
            },
            set : function(value) {
                if (this._pattern !== value) {
                    this._pattern = value;
                    this._regEx = new RegExp(value);
                    this._styleEngine.makeDirty();
                }
            }
        },

        /**
         * DOC_TBA
         */
        propertyName : {
            get : function() {
                return this._propertyName;
            },
            set : function(value) {
                if (this._propertyName !== value) {
                    this._propertyName = value;
                    this._styleEngine.makeDirty();
                }
            }
        }
    });

    BooleanRegularExpression.prototype.evaluate = function(feature) {
        var str = feature.getProperty(this._propertyName);
        return this._regEx.test(str);
    };

    return BooleanRegularExpression;
});
