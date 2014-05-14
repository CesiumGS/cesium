/*global define*/
define([
        '../Core/createGuid',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError'
    ], function(
        createGuid,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError) {
    "use strict";

    /**
     * A collection of primitives.  This is most often used with {@link Scene#primitives},
     * but <code>CompositePrimitive</code> is also a primitive itself so collections can
     * be added to collections forming a hierarchy.
     *
     * @alias CompositePrimitive
     * @constructor
     *
     * @example
     * var billboards = new Cesium.BillboardCollection();
     * var labels = new Cesium.LabelCollection();
     *
     * var collection = new Cesium.CompositePrimitive();
     * collection.add(billboards);
     *
     * scene.primitives.add(collection);  // Add collection
     * scene.primitives.add(labels);      // Add regular primitive
     */
    var CompositePrimitive = function() {
        this._primitives = [];
        this._guid = createGuid();

        /**
         * Determines if primitives in the collection are destroyed when they are removed by
         * {@link CompositePrimitive#destroy} or  {@link CompositePrimitive#remove} or implicitly
         * by {@link CompositePrimitive#removeAll}.
         *
         * @type {Boolean}
         * @default true
         *
         * @example
         * // Example 1. Primitives are destroyed by default.
         * var primitives = new Cesium.CompositePrimitive();
         * var labels = primitives.add(new Cesium.LabelCollection());
         * primitives = primitives.destroy();
         * var b = labels.isDestroyed(); // true
         *
         * //////////////////////////////////////////////////////////////////
         *
         * // Example 2. Do not destroy primitives in a collection.
         * var primitives = new Cesium.CompositePrimitive();
         * primitives.destroyPrimitives = false;
         * var labels = primitives.add(new Cesium.LabelCollection());
         * primitives = primitives.destroy();
         * var b = labels.isDestroyed(); // false
         * labels = labels.destroy();    // explicitly destroy
         */
        this.destroyPrimitives = true;

        /**
         * Determines if primitives in this collection will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;
    };

    defineProperties(CompositePrimitive.prototype, {
        /**
         * Gets the number of primitives in the collection.
         *
         * @memberof CompositePrimitive.prototype
         *
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._primitives.length;
            }
        }
    });

    /**
     * Adds a primitive to the collection.
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} primitive The primitive to add.
     * @returns {Object} The primitive added to the collection.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * var billboards = scene.primitives.add(new Cesium.BillboardCollection());
     */
    CompositePrimitive.prototype.add = function(primitive) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(primitive)) {
            throw new DeveloperError('primitive is required.');
        }
        //>>includeEnd('debug');

        var external = (primitive._external = primitive._external || {});
        var composites = (external._composites = external._composites || {});
        composites[this._guid] = {
            collection : this
        };

        this._primitives.push(primitive);

        return primitive;
    };

    /**
     * Removes a primitive from the collection.
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} [primitive] The primitive to remove.
     * @returns {Boolean} <code>true</code> if the primitive was removed; <code>false</code> if the primitive is <code>undefined</code> or was not found in the collection.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#destroyPrimitives
     *
     * @example
     * var billboards = scene.primitives.add(new Cesium.BillboardCollection());
     * scene.primitives.remove(p);  // Returns true
     */
    CompositePrimitive.prototype.remove = function(primitive) {
        // PERFORMANCE_IDEA:  We can obviously make this a lot faster.
        if (this.contains(primitive)) {
            var index = this._primitives.indexOf(primitive);
            if (index !== -1) {
                this._primitives.splice(index, 1);

                delete primitive._external._composites[this._guid];

                if (this.destroyPrimitives) {
                    primitive.destroy();
                }

                return true;
            }
            // else ... this is not possible, I swear.
        }

        return false;
    };

    /**
     * Removes all primitives in the collection.
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#destroyPrimitives
     */
    CompositePrimitive.prototype.removeAll = function() {
        if (this.destroyPrimitives) {
            var primitives = this._primitives;
            var length = primitives.length;
            for ( var i = 0; i < length; ++i) {
                primitives[i].destroy();
            }
        }
        this._primitives = [];
    };

    /**
     * Determines if this collection contains a primitive.
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} [primitive] The primitive to check for.
     * @returns {Boolean} <code>true</code> if the primitive is in the collection; <code>false</code> if the primitive is <code>undefined</code> or was not found in the collection.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#get
     */
    CompositePrimitive.prototype.contains = function(primitive) {
        return !!(defined(primitive) &&
                  primitive._external &&
                  primitive._external._composites &&
                  primitive._external._composites[this._guid]);
    };

    function getPrimitiveIndex(compositePrimitive, primitive) {
        //>>includeStart('debug', pragmas.debug);
        if (!compositePrimitive.contains(primitive)) {
            throw new DeveloperError('primitive is not in this collection.');
        }
        //>>includeEnd('debug');

        return compositePrimitive._primitives.indexOf(primitive);
    }

    /**
     * Raises a primitive "up one" in the collection.  If all primitives in the collection are drawn
     * on the globe surface, this visually moves the primitive up one.
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} [primitive] The primitive to raise.
     *
     * @exception {DeveloperError} primitive is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#raiseToTop
     * @see CompositePrimitive#lower
     * @see CompositePrimitive#lowerToBottom
     */
    CompositePrimitive.prototype.raise = function(primitive) {
        if (defined(primitive)) {
            var index = getPrimitiveIndex(this, primitive);
            var primitives = this._primitives;

            if (index !== primitives.length - 1) {
                var p = primitives[index];
                primitives[index] = primitives[index + 1];
                primitives[index + 1] = p;
            }
        }
    };

    /**
     * Raises a primitive to the "top" of the collection.  If all primitives in the collection are drawn
     * on the globe surface, this visually moves the primitive to the top.
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} [primitive] The primitive to raise the top.
     *
     * @exception {DeveloperError} primitive is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#raise
     * @see CompositePrimitive#lower
     * @see CompositePrimitive#lowerToBottom
     */
    CompositePrimitive.prototype.raiseToTop = function(primitive) {
        if (defined(primitive)) {
            var index = getPrimitiveIndex(this, primitive);
            var primitives = this._primitives;

            if (index !== primitives.length - 1) {
                // PERFORMANCE_IDEA:  Could be faster
                primitives.splice(index, 1);
                primitives.push(primitive);
            }
        }
    };

    /**
     * Lowers a primitive "down one" in the collection.  If all primitives in the collection are drawn
     * on the globe surface, this visually moves the primitive down one.
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} [primitive] The primitive to lower.
     *
     * @exception {DeveloperError} primitive is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#lowerToBottom
     * @see CompositePrimitive#raise
     * @see CompositePrimitive#raiseToTop
     */
    CompositePrimitive.prototype.lower = function(primitive) {
        if (defined(primitive)) {
            var index = getPrimitiveIndex(this, primitive);
            var primitives = this._primitives;

            if (index !== 0) {
                var p = primitives[index];
                primitives[index] = primitives[index - 1];
                primitives[index - 1] = p;
            }
        }
    };

    /**
     * Lowers a primitive to the "bottom" of the collection.  If all primitives in the collection are drawn
     * on the globe surface, this visually moves the primitive to the bottom.
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} [primitive] The primitive to lower to the bottom.
     *
     * @exception {DeveloperError} primitive is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#lower
     * @see CompositePrimitive#raise
     * @see CompositePrimitive#raiseToTop
     */
    CompositePrimitive.prototype.lowerToBottom = function(primitive) {
        if (defined(primitive)) {
            var index = getPrimitiveIndex(this, primitive);
            var primitives = this._primitives;

            if (index !== 0) {
                // PERFORMANCE_IDEA:  Could be faster
                primitives.splice(index, 1);
                primitives.unshift(primitive);
            }
        }
    };

    /**
     * Returns the primitive in the collection at the specified index.
     *
     * @memberof CompositePrimitive
     *
     * @param {Number} index The zero-based index of the primitive to return.
     * @returns {Object} The primitive at the <code>index</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#length
     *
     * @example
     * // Toggle the show property of every primitive in the collection.
     * var primitives = scene.primitives;
     * var length = primitives.length;
     * for (var i = 0; i < length; ++i) {
     *   var p = primitives.get(i);
     *   p.show = !p.show;
     * }
     */
    CompositePrimitive.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._primitives[index];
    };

    /**
     * @private
     */
    CompositePrimitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        var primitives = this._primitives;
        var length = primitives.length;
        for (var i = 0; i < length; ++i) {
            primitives[i].update(context, frameState, commandList);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CompositePrimitive
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see CompositePrimitive#destroy
     */
    CompositePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by each primitive in this collection.  Explicitly destroying this
     * collection allows for deterministic release of WebGL resources, instead of relying on the garbage
     * collector to destroy this collection.
     * <br /><br />
     * Since destroying a collection destroys all the contained primitives, only destroy a collection
     * when you are sure no other code is still using any of the contained primitives.
     * <br /><br />
     * Once this collection is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CompositePrimitive
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#isDestroyed
     *
     * @example
     * primitives = primitives && primitives.destroy();
     */
    CompositePrimitive.prototype.destroy = function() {
        this.removeAll();
        return destroyObject(this);
    };

    return CompositePrimitive;
});
