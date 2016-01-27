/*global define*/
define([
        '../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * This type describes an interface and is not intended to be instantiated directly.
     *
     * @alias Cesium3DTileContentProvider
     * @constructor
     *
     * @see {@link Batched3DModel3DTileContentProvider}
     * @see {@link Instanced3DModel3DTileContentProvider}
     * @see {@link Points3DTileContentProvider}
     * @see {@link Composite3DTileContentProvider}
     * @see {@link Tileset3DTileContentProvider}
     * @see {@link Empty3DTileContentProvider}
     *
     * @private
     */
    function Cesium3DTileContentProvider(tileset, tile, url) {
        /**
         * The current state of the tile's content.
         *
         * @type {Cesium3DTileContentState}
         * @readonly
         */
        this.state = undefined;

        /**
         * Gets the promise that will be resolved when the tile's content is ready to process.
         * This happens after the content is downloaded but before the content is ready
         * to render.
         *
         * @type {Promise.<Cesium3DTileContentProvider>}
         * @readonly
         */
        this.processingPromise = undefined;

        /**
         * Gets the promise that will be resolved when the tile's content is ready to render.
         *
         * @type {Promise.<Cesium3DTileContentProvider>}
         * @readonly
         */
        this.readyPromise = undefined;
    }

    defineProperties(Cesium3DTileContentProvider.prototype, {
        /**
         * Gets the number of features in the tile.
         *
         * @memberof Cesium3DTileContentProvider.prototype
         *
         * @type {Number}
         * @readonly
         */
        featuresLength : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },

        /**
         * DOC_TBA
         */
        batchTableResources : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        }
    });

    /**
     * Returns the {@link Cesium3DTileFeature} object for the feature with the
     * given <code>batchId</code>.  This object is used to get and modify the
     * feature's properties.
     *
     * @param {Number} batchId The batchId for the feature.
     * @returns {Cesium3DTileFeature} The corresponding {@link Cesium3DTileFeature} object.
     *
     * @exception {DeveloperError} batchId must be between zero and {@link Cesium3DTileContentProvider#featuresLength - 1}.
     */
    Cesium3DTileContentProvider.prototype.getFeature = function(batchId) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Requests the tile's content.
     * <p>
     * The request may not be made if the Cesium Request Scheduler can't prioritize it.
     * </p>
     */
    Cesium3DTileContentProvider.prototype.request = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Parses the tile's content's array buffer and initializes the content.  This does not
     * necessarily move the state to READY since WebGL resource creation may be
     * amortized over several frames.
     *
     * @param {Object} arrayBuffer The array buffer containing the contents payload.
     * @param {Number} byteOffset The zero-based offset, in bytes, into the array buffer.
     */
    Cesium3DTileContentProvider.prototype.initialize = function(arrayBuffer, byteOffset) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Called when the tileset's debugColorizeTiles is changed.
     *
     * @private
     */
    Cesium3DTileContentProvider.prototype.applyDebugSettings = function(enabled, color) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Called by the tile during tileset traversal to get the draw commands needed to render this content.
     * When the tile's content is in the PROCESSING state, this creates WebGL resources to ultimately
     * move to the READY state.
     *
     * @param {Cesium3DTileset} tiles3D The tileset containing this tile.
     * @param {FrameState} frameState The frame state.
     */
    Cesium3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Cesium3DTileContentProvider#destroy
     */
    Cesium3DTileContentProvider.prototype.isDestroyed = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * content = content && content.destroy();
     *
     * @see Cesium3DTileContentProvider#isDestroyed
     */
    Cesium3DTileContentProvider.prototype.destroy = function() {
        DeveloperError.throwInstantiationError();
    };

    return Cesium3DTileContentProvider;
});
