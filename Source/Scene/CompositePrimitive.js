/*global define*/
define([
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/DeveloperError',
        '../Core/Intersect',
        '../Core/Matrix4',
        './SceneMode'
    ], function(
        createGuid,
        defaultValue,
        destroyObject,
        BoundingRectangle,
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        DeveloperError,
        Intersect,
        Matrix4,
        SceneMode) {
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
        this._centralBody = null;
        this._primitives = [];
        this._guid = createGuid();
        this._renderList = [];

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
        if (!primitive) {
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

    CompositePrimitive.prototype._getPrimitiveIndex = function(primitive) {
        if (!this.contains(primitive)) {
            throw new DeveloperError('primitive is not in this composite.');
        }

        return this._primitives.indexOf(primitive);
    };

    /**
     * DOC_TBA
     *
     * @memberof CompositePrimitive
     *
     * @exception {DeveloperError} primitive is not in this composite.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CompositePrimitive#bringToFront
     * @see CompositePrimitive#sendBackward
     * @see CompositePrimitive#sendToBack
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.bringForward = function(primitive) {
        if (primitive) {
            var index = this._getPrimitiveIndex(primitive);
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
     * @see CompositePrimitive#bringForward
     * @see CompositePrimitive#sendBackward
     * @see CompositePrimitive#sendToBack
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.bringToFront = function(primitive) {
        if (primitive) {
            var index = this._getPrimitiveIndex(primitive);
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
     * @see CompositePrimitive#sendToBack
     * @see CompositePrimitive#bringForward
     * @see CompositePrimitive#bringToFront
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.sendBackward = function(primitive) {
        if (primitive) {
            var index = this._getPrimitiveIndex(primitive);
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
     * @see CompositePrimitive#sendBackward
     * @see CompositePrimitive#bringForward
     * @see CompositePrimitive#bringToFront
     * @see CompositePrimitive#addGround
     */
    CompositePrimitive.prototype.sendToBack = function(primitive) {
        if (primitive) {
            var index = this._getPrimitiveIndex(primitive);
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

    function update2D(context, frameState, primitives, renderList) {
        var camera = frameState.camera;
        var frustum = camera.frustum;

        var frustumRect;
        if (typeof frustum.top !== 'undefined') {
            var position = camera.position;
            var up = camera.up;
            var right = camera.right;

            var width = frustum.right - frustum.left;
            var height = frustum.top - frustum.bottom;

            var lowerLeft = position.add(right.multiplyByScalar(frustum.left));
            lowerLeft = lowerLeft.add(up.multiplyByScalar(frustum.bottom));
            var upperLeft = lowerLeft.add(up.multiplyByScalar(height));
            var upperRight = upperLeft.add(right.multiplyByScalar(width));
            var lowerRight = upperRight.add(up.multiplyByScalar(-height));

            var x = Math.min(lowerLeft.x, lowerRight.x, upperLeft.x, upperRight.x);
            var y = Math.min(lowerLeft.y, lowerRight.y, upperLeft.y, upperRight.y);
            var w = Math.max(lowerLeft.x, lowerRight.x, upperLeft.x, upperRight.x) - x;
            var h = Math.max(lowerLeft.y, lowerRight.y, upperLeft.y, upperRight.y) - y;

            frustumRect = new BoundingRectangle(x, y, w, h);
        }

        var length = primitives.length;
        for ( var i = 0; i < length; ++i) {
            var primitive = primitives[i];
            var spatialState = primitive.update(context, frameState);

            if (typeof spatialState === 'undefined') {
                continue;
            }

            var boundingVolume = spatialState.boundingVolume;
            if (typeof boundingVolume !== 'undefined' &&
                    typeof frustumRect !== 'undefined' &&
                    boundingVolume.intersect(frustumRect) === Intersect.OUTSIDE) {
                continue;
            }

            renderList.push(primitive);
        }
    }

    function update3D(context, frameState, primitives, renderList) {
        var mode = frameState.mode;
        var camera = frameState.camera;
        var occluder = frameState.occluder;

        var length = primitives.length;
        for ( var i = 0; i < length; ++i) {
            var primitive = primitives[i];
            var spatialState = primitive.update(context, frameState);

            if (typeof spatialState === 'undefined') {
                continue;
            }

            var boundingVolume = spatialState.boundingVolume;
            if (typeof boundingVolume !== 'undefined') {
                var modelMatrix = defaultValue(spatialState.modelMatrix, Matrix4.IDENTITY);
                var center = new Cartesian4(boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center.z, 1.0);
                center = Cartesian3.fromCartesian4(modelMatrix.multiplyByVector(center));
                boundingVolume = new BoundingSphere(center, boundingVolume.radius);

                if (camera.getVisibility(boundingVolume) === Intersect.OUTSIDE) {
                    continue;
                }

                if (mode === SceneMode.SCENE3D &&
                        typeof occluder !== 'undefined' &&
                        !occluder.isVisible(boundingVolume)) {
                    continue;
                }
            }

            renderList.push(primitive);
        }
    }

    /**
     * @private
     */
    CompositePrimitive.prototype.update = function(context, frameState) {
        if (!this.show) {
            return undefined;
        }

        if (this._centralBody) {
            this._centralBody.update(context, frameState);
        }

        var mode = frameState.mode;
        if (mode === SceneMode.SCENE2D) {
            update2D(context, frameState, this._primitives, this._renderList);
        } else {
            update3D(context, frameState, this._primitives, this._renderList);
        }

        return {};
    };

    /**
     * DOC_TBA
     * @memberof CompositePrimitive
     */
    CompositePrimitive.prototype.render = function(context) {
        var cb = this._centralBody;
        var primitives = this._renderList;
        var primitivesLen = primitives.length;

        if (cb) {
            cb.render(context);
        }
        for ( var i = 0; i < primitivesLen; ++i) {
            var primitive = primitives[i];
            primitive.render(context);
        }
        this._renderList.length = 0;
    };

    /**
     * DOC_TBA
     * @memberof CompositePrimitive
     */
    CompositePrimitive.prototype.renderForPick = function(context, framebuffer) {
        var cb = this._centralBody;
        var primitives = this._renderList;
        var primitivesLen = primitives.length;

        if (cb) {
            cb.renderForPick(context, framebuffer);
        }

        for ( var i = 0; i < primitivesLen; ++i) {
            var primitive = primitives[i];
            if (primitive.renderForPick) {
                primitive.renderForPick(context, framebuffer);
            }
        }
        this._renderList.length = 0;
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