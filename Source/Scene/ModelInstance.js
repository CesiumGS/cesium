/*global define*/
define([
        '../Core/clone',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Matrix4'
    ], function(
        clone,
        Color,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Matrix4) {
    "use strict";
    
    /**
     * A model instance, contained within a ModelInstanceCollection
     * 
     * @private
     */
    var ModelInstance = function(options, collection) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this._collection = collection;
        this._index = -1;
        this._modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._color = options.color;
        this._show = defaultValue(options.show, true);
        this._pickId = undefined;
        this._dirty = false;
    };

    function makeDirty(instance) {
        instance._collection._updateInstance(instance);
        instance._dirty = true;
    }

    defineProperties(ModelInstance.prototype, {
        index : {
            get : function() {
                return this._index;
            }
        },

        modelMatrix : {
            get : function() {
                return this._modelMatrix;
            },
            set : function(value) {
                if (Matrix4.equals(this._modelMatrix, value)) {
                    this._modelMatrix = Matrix4.clone(value);
                    makeDirty(this);
                }
            }

        },

        show : {
            get : function() {
                return this._show;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._show !== value) {
                    this._show = value;
                    makeDirty(this);
                }
            }
        },
        
        color : {
            get : function() {
                if (!defined(this._color)) {
                    this._color = new Color();
                }
                return this._color;
            },
            set : function(value) {
                if (!Color.equals(this._color, value)) {
                    Color.clone(value, this._color);
                    makeDirty(this);
                }
            }
        }
    });

    ModelInstance.prototype.getPickId = function(context) {
        if (!defined(this._pickId)) {
            // TODO : change this later
            this._pickId = context.createPickId({
                id : 10
            });
        }

        return this._pickId;
    };

    return ModelInstance;
});
