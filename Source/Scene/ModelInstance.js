/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Matrix4'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        Matrix4) {
    "use strict";
    
    /**
     * A model instance, contained within a ModelInstanceCollection
     * 
     * @private
     */
    var ModelInstance = function(options, collection, index, batchId) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this._collection = collection;
        this._content = collection._content;
        this._index = index;
        this._batchId = batchId;
        this._modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._color = undefined; // for calling getColor

        this.show = defaultValue(options.show, true);
        this.color = defaultValue(options.color, Color.WHITE);
    };

    defineProperties(ModelInstance.prototype, {
        modelMatrix : {
            get : function() {
                return this._modelMatrix;
            },
            set : function(value) {
                if (Matrix4.equals(this._modelMatrix, value)) {
                    this._modelMatrix = Matrix4.clone(value);
                    this._collection._updateInstance(this);
                }
            }
        },

        show : {
            get : function() {
                return this._content.getShow(this._batchId);
            },
            set : function(value) {
                this._content.setShow(this._batchId, value);
            }
        },
        
        color : {
            get : function() {
                if (!defined(this._color)) {
                    this._color = new Color();
                }
                return this._content.getColor(this._batchId, this._color);
            },
            set : function(value) {
                this._content.setColor(this._batchId, value);
            }
        }
    });

    ModelInstance.prototype.getProperty = function(name) {
        return this._content.getProperty(this._batchId, name);
    };

    ModelInstance.prototype.setProperty = function(name, value) {
        this._content.setProperty(this._batchId, name, value);
    };

    return ModelInstance;
});
