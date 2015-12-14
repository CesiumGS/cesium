/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    "use strict";

    /**
     * A 3D model based on {@link https://github.com/KhronosGroup/glTF|glTF}, the runtime asset format for WebGL, OpenGL ES, and OpenGL.
     * The position and orientation of the model is determined by the containing {@link Entity}.
     * <p>
     * Cesium includes support for glTF geometry, materials, animations, and skinning.
     * Cameras and lights are not currently supported.
     * </p>
     *
     * @alias ModelGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.uri] A string Property specifying the URI of the glTF asset.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the model.
     * @param {Property} [options.scale=1.0] A numeric Property specifying a uniform linear scale.
     * @param {Property} [options.minimumPixelSize=0.0] A numeric Property specifying the approximate minimum pixel size of the model regardless of zoom.
     * @param {Property} [options.maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
     *
     * @see {@link http://cesiumjs.org/2014/03/03/Cesium-3D-Models-Tutorial/|3D Models Tutorial}
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=3D%20Models.html|Cesium Sandcastle 3D Models Demo}
     */
    var ModelGraphics = function(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._minimumPixelSize = undefined;
        this._minimumPixelSizeSubscription = undefined;
        this._maximumScale = undefined;
        this._maximumScaleSubscription = undefined;
        this._uri = undefined;
        this._uriSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(ModelGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof ModelGraphics.prototype
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean Property specifying the visibility of the model.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric Property specifying a uniform linear scale
         * for this model. Values greater than 1.0 increase the size of the model while
         * values less than 1.0 decrease it.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        scale : createPropertyDescriptor('scale'),

        /**
         * Gets or sets the numeric Property specifying the approximate minimum
         * pixel size of the model regardless of zoom. This can be used to ensure that
         * a model is visible even when the viewer zooms out.  When <code>0.0</code>,
         * no minimum size is enforced.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         * @default 0.0
         */
        minimumPixelSize : createPropertyDescriptor('minimumPixelSize'),

        /**
         * Gets or sets the numeric Property specifying the maximum scale
         * size of a model. This property is used as an upper limit for 
         * {@link ModelGraphics#minimumPixelSize}.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         */
        maximumScale : createPropertyDescriptor('maximumScale'),

        /**
         * Gets or sets the string Property specifying the URI of the glTF asset.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         */
        uri : createPropertyDescriptor('uri')
    });

    /**
     * Duplicates this instance.
     *
     * @param {ModelGraphics} [result] The object onto which to store the result.
     * @returns {ModelGraphics} The modified result parameter or a new instance if one was not provided.
     */
    ModelGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new ModelGraphics(this);
        }
        result.show = this.show;
        result.scale = this.scale;
        result.minimumPixelSize = this.minimumPixelSize;
        result.maximumScale = this.maximumScale;
        result.uri = this.uri;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {ModelGraphics} source The object to be merged into this object.
     */
    ModelGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.scale = defaultValue(this.scale, source.scale);
        this.minimumPixelSize = defaultValue(this.minimumPixelSize, source.minimumPixelSize);
        this.maximumScale = defaultValue(this.maximumScale, source.maximumScale);
        this.uri = defaultValue(this.uri, source.uri);
    };

    return ModelGraphics;
});