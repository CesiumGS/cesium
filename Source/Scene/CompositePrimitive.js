/*global define*/
define([
        '../Core/createGuid',
        '../Core/destroyObject',
        '../Core/DeveloperError'
    ], function(
        createGuid,
        destroyObject,
        DeveloperError) {
    "use strict";

    // PERFORMANCE_IDEA: Add hierarchical culling and state sorting.

    /**
     * DOC_TBA
     *
     * @alias CompositePrimitive
     * @constructor
     *
     * @example
     * // Example 1. Add primitives to a composite.
     * var primitives = new CompositePrimitive();
     * primitives.setCentralBody(new CentralBody());
     * primitives.add(billboards);
     * primitives.add(labels);
     *
     * //////////////////////////////////////////////////////////////////
     *
     * // Example 2. Create composites of composites.
     * var children = new CompositePrimitive();
     * children.add(billboards);
     *
     * var parent = new CompositePrimitive();
     * parent.add(children);    // Add composite
     * parent.add(labels);      // Add regular primitive
     */
    var CompositePrimitive = function() {
        this._centralBody = undefined;
        this._primitives = [];
        this._guid = createGuid();

        /**
         * DOC_TBA
         *
         * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
         *
         * @see CompositePrimitive#destroy
         * @see CompositePrimitive#setCentralBody
         * @see CompositePrimitive#remove
         * @see CompositePrimitive#removeAll
         *
         * @example
         * // Example 1. Primitives are destroyed by default.
         * var primitives = new CompositePrimitive();
         * primitives.add(labels);
         * primitives = primitives.destroy();
         * var b = labels.isDestroyed(); // true
         *
         * //////////////////////////////////////////////////////////////////
         *
         * // Example 2. Do not destroy primitives in a composite.
         * var primitives = new CompositePrimitive();
         * primitives.destroyPrimitives = false;
         * primitives.add(labels);
         * primitives = primitives.destroy();
         * var b = labels.isDestroyed(); // false
         * labels = labels.destroy();    // explicitly destroy
         */
        this.destroyPrimitives = true;

        /**
         * Determines if primitives in this composite will be shown.
         *
         * @type Boolean
         */
        this.show = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#setCentralBody
     */
    CompositePrimitive.prototype.getCentralBody = function() {
        return this._centralBody;
    };

    /**
     * DOC_TBA
     *
     * Implicitly sets the depth-test ellipsoid.
     *
     * @memberof CompositePrimitive
     *
     * @see CompositePrimitive#depthTestEllipsoid
     * @see CompositePrimitive#getCentralBody
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * var primitives = new CompositePrimitive();
     * primitives.setCentralBody(new CentralBody());
     */
    CompositePrimitive.prototype.setCentralBody = function(centralBody) {
        this._centralBody = this.destroyPrimitives && this._centralBody && this._centralBody.destroy();
        this._centralBody = centralBody;
    };

    /**
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} primitive DOC_TBA
     *
     * @exception {DeveloperError} primitive is required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#add
     *
     * @example
     * primitives.add(billboards);
     * primitives.add(labels);
     */
    CompositePrimitive.prototype.add = function(primitive) {
        if (typeof primitive === 'undefined') {
            throw new DeveloperError('primitive is required.');
        }

        var external = (primitive._external = primitive._external || {});
        var composites = (external._composites = external._composites || {});
        composites[this._guid] = {
            composite : this
        };

        this._primitives.push(primitive);
    };

    /**
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @param {Object} primitive DOC_TBA
     *
     * @return {Boolean} <code>true</code> if the primitive was removed; <code>false</code> if the primitive was not found in the composite.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#removeAll
     *
     * @example
     * primitives.add(p);
     * primitives.remove(p);  // Returns true
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
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#remove
     *
     * @example
     * primitives.add(...);
     * primitives.add(...);
     * primitives.removeAll();
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
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * Does not include central body.
     *
     * @param {Object} primitive DOC_TBA
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#get
     */
    CompositePrimitive.prototype.contains = function(primitive) {
        return !!(primitive &&
                  primitive._external &&
                  primitive._external._composites &&
                  primitive._external._composites[this._guid]);
    };

    function getPrimitiveIndex(compositePrimitive, primitive) {
        if (!compositePrimitive.contains(primitive)) {
            throw new DeveloperError('primitive is not in this composite.');
        }

        return compositePrimitive._primitives.indexOf(primitive);
    }

    /**
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} primitive is not in this composite.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#raiseToTop
     * @see CompositePrimitive#lower
     * @see CompositePrimitive#lowerToBottom
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.raise = function(primitive) {
        if (typeof primitive !== 'undefined') {
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
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} primitive is not in this composite.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#raise
     * @see CompositePrimitive#lower
     * @see CompositePrimitive#lowerToBottom
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.raiseToTop = function(primitive) {
        if (typeof primitive !== 'undefined') {
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
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} primitive is not in this composite.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#lowerToBottom
     * @see CompositePrimitive#raise
     * @see CompositePrimitive#raiseToTop
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.lower = function(primitive) {
        if (typeof primitive !== 'undefined') {
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
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} primitive is not in this composite.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#lower
     * @see CompositePrimitive#raise
     * @see CompositePrimitive#raiseToTop
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.lowerToBottom = function(primitive) {
        if (typeof primitive !== 'undefined') {
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
     * DOC_TBA
     *
     * The index is based on the order the primitives were added to the composite.
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} index is required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#getLength
     *
     * @example
     * // Toggle the show property of every primitive in the composite -
     * // not recursive on child composites.
     * var len = primitives.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var p = primitives.get(i);
     *   p.show = !p.show;
     * }
     */
    CompositePrimitive.prototype.get = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.');
        }

        return this._primitives[index];
    };

    /**
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#get
     *
     * @example
     * // Toggle the show property of every primitive in the composite -
     * // not recursive on child composites.
     * var len = primitives.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var p = primitives.get(i);
     *   p.show = !p.show;
     * }
     */
    CompositePrimitive.prototype.getLength = function() {
        return this._primitives.length;
    };

    /**
     * @private
     */
    CompositePrimitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        if (this._centralBody) {
            this._centralBody.update(context, frameState, commandList);
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
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see CompositePrimitive#destroy
     */
    CompositePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by each primitive in this composite.  Explicitly destroying this
     * composite allows for deterministic release of WebGL resources, instead of relying on the garbage
     * collector to destroy this composite.
     * <br /><br />
     * Since destroying a composite destroys all the contained primitives, only destroy a composite
     * when you are sure no other code is still using any of the contained primitives.
     * <br /><br />
     * Once this composite is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CompositePrimitive
     *
     * @return {undefined}
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
        this._centralBody = this.destroyPrimitives && this._centralBody && this._centralBody.destroy();
        return destroyObject(this);
    };

    return CompositePrimitive;
});
