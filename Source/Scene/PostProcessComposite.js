define([
        '../Core/Check',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        Check,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        destroyObject) {
    'use strict';

    /**
     * A collection of {@link PostProcess}es or other post-process composites that execute together logically.
     * <p>
     * All processes are executed in the order of the array. The input texture changes based on the value of <code>executeInSeries</code>.
     * If <code>executeInSeries</code> is <code>true</code>, the input to each post-process is the output texture rendered to by the scene or of the process that executed before it.
     * If <code>executeInseries</code> is <code>false</code>, the input texture is the same for each post-process in the composite. The input texture is the texture rendered to by the scene
     * or the output texture of the previous process or composite.
     * </p>
     *
     * @alias PostProcessComposite
     * @constructor
     *
     * @param {Object} options An object with the following properties:
     * @param {Array} options.processes An array of {@link PostProcess}es or composites to be executed in order.
     * @param {Boolean} [options.executeInSeries=true] Whether to execute each post-process where the input to one post-process is the output of the previous. Otherwise, the input to each contained post-process is the output of the post-process that executed before the composite.
     * @param {String} [options.name=createGuid()] The unique name of this post-process for reference by other composites. If a name is not supplied, a GUID will be generated.
     *
     * @exception {DeveloperError} options.processes.length must be greater than 0.0.
     *
     * @see PostProcess
     *
     * @example
     * // Example 1: seperable blur filter
     * // The input to blurXDirection is the texture rendered to by the scene or the output of the previous process.
     * // The input to blurYDirection is the texture rendered to by blurXDirection.
     * scene.postProcessCollection.add(new Cesium.PostProcessComposite({
     *     processes : [blurXDirection, blurYDirection],
     * }));
     *
     * @example
     * // Example 2: referencing the output of another post-process
     * scene.postProcessCollection.add(new Cesium.PostProcessComposite({
     *     executeInSeries : false,
     *     processes : [
     *         // The same as Example 1.
     *         new Cesium.PostProcessComposite({
     *             executeInSeries : true
     *             processes : [blurXDirection, blurYDirection],
     *             name : 'blur'
     *         }),
     *         // The input texture for this process is the same input texture to blurXDirection since executeInSeries is false
     *         new Cesium.PostProcess({
     *             fragmentShader : compositeShader,
     *             uniformValues : {
     *                 blurTexture : 'blur' // The output of the composite with name 'blur' (the texture that blurYDirection rendered to).
     *             }
     *         })
     *     ]
     * });
     */
    function PostProcessComposite(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options', options);
        Check.defined('options.processes', options.processes);
        Check.typeOf.number.greaterThan('options.processes.length', options.processes.length, 0);
        //>>includeEnd('debug');
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._processes = options.processes;
        this._executeInSeries = defaultValue(options.executeInSeries, true);

        this._name = options.name;
        if (!defined(this._name)) {
            this._name = createGuid();
        }

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
    }

    defineProperties(PostProcessComposite.prototype, {
        /**
         * Determines if this post-process is ready to be executed.
         *
         * @memberof PostProcessComposite.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                var processes = this._processes;
                var length = processes.length;
                for (var i = 0; i < length; ++i) {
                    if (!processes[i].ready) {
                        return false;
                    }
                }
                return true;
            }
        },
        /**
         * The unique name of this post-process for reference by other processes in a PostProcessComposite.
         *
         * @memberof PostProcessComposite.prototype
         * @type {String}
         * @readonly
         */
        name : {
            get : function() {
                return this._name;
            }
        },
        /**
         * Whether or not to execute this post-process when ready.
         *
         * @memberof PostProcessComposite.prototype
         * @type {Boolean}
         */
        enabled : {
            get : function() {
                return this._processes[0].enabled;
            },
            set : function(value) {
                var processes = this._processes;
                var length = processes.length;
                for (var i = 0; i < length; ++i) {
                    processes[i].enabled = value;
                }
            }
        },
        /**
         * All processes are executed in the order of the array. The input texture changes based on the value of <code>executeInSeries</code>.
         * If <code>executeInSeries</code> is <code>true</code>, the input to each post-process is the output texture rendered to by the scene or of the process that executed before it.
         * If <code>executeInseries</code> is <code>false</code>, the input texture is the same for each post-process in the composite. The input texture is the texture rendered to by the scene
         * or the output texture of the previous process or composite.
         *
         * @memberof PostProcessComposite.prototype
         * @type {Boolean}
         * @readonly
         */
        executeInSeries : {
            get : function() {
                return this._executeInSeries;
            }
        },
        /**
         * The number of post-processes in this composite.
         *
         * @memberof PostProcessComposite.prototype
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._processes.length;
            }
        }
    });

    /**
     * Gets the post-process at <code>index</code>
     *
     * @param {Number} index The index of the post-process or composite.
     * @return {PostProcess|PostProcessComposite} The post-process or composite at index.
     *
     * @exception {DeveloperError} index must be greater than or equal to 0.
     * @exception {DeveloperError} index must be less than {@link PostProcessComposite#length}.
     */
    PostProcessComposite.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        Check.typeOf.number.lessThan('index', index, this.length);
        //>>includeEnd('debug');
        return this._processes[index];
    };

    /**
     * A function that will be called before execute. Updates each post-process in the composite.
     * @param {Context} context The context.
     * @private
     */
    PostProcessComposite.prototype.update = function(context) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].update(context);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see PostProcessComposite#destroy
     */
    PostProcessComposite.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PostProcessComposite#isDestroyed
     */
    PostProcessComposite.prototype.destroy = function() {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].destroy();
        }
        return destroyObject(this);
    };

    return PostProcessComposite;
});
