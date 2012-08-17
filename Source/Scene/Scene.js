/*global define*/
define([
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/EquidistantCylindricalProjection',
        '../Core/Ellipsoid',
        '../Core/DeveloperError',
        '../Core/Rectangle',
        '../Renderer/Context',
        '../Renderer/PixelFormat',
        '../Renderer/PixelDatatype',
        './Camera',
        './CompositePrimitive',
        './AnimationCollection',
        './SceneMode',
        './SceneState',
        './ViewportQuad',
        '../Shaders/PostFX/LuminanceFS',
        '../Shaders/PostFX/BlackAndWhite',
        '../Shaders/PostFX/EightBit',
        '../Shaders/PostFX/NightVision',
        '../Shaders/PostFX/Brightness',
        '../Shaders/PostFX/Contrast',
        '../Shaders/PostFX/Toon'
    ], function(
        Color,
        destroyObject,
        EquidistantCylindricalProjection,
        Ellipsoid,
        DeveloperError,
        Rectangle,
        Context,
        PixelFormat,
        PixelDatatype,
        Camera,
        CompositePrimitive,
        AnimationCollection,
        SceneMode,
        SceneState,
        ViewportQuad,
        LuminanceFS,
        BlackAndWhite,
        EightBit,
        NightVision,
        Brightness,
        Contrast,
        Toon) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Scene
     * @constructor
     */
    var Scene = function(canvas) {
        var context = new Context(canvas);

        this._sceneState = new SceneState();
        this._canvas = canvas;
        this._context = context;
        this._primitives = new CompositePrimitive();
        this._pickFramebuffer = undefined;
        this._camera = new Camera(canvas);
        this._clearState = context.createClearState({
            color : Color.BLACK,
            depth : 1.0
        });

        this._animate = undefined; // Animation callback
        this._animations = new AnimationCollection();

        this._shaderFrameCount = 0;

        /**
         * The current mode of the scene.
         *
         * @type SceneMode
         */
        this.mode = SceneMode.SCENE3D;

        /**
         * DOC_TBA
         */
        this.scene2D = {
            /**
             * The projection to use in 2D mode.
             */
            projection : new EquidistantCylindricalProjection(Ellipsoid.WGS84)
        };

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = 1.0;

        this._framebuffer = undefined;
        //this._postFX = new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), LuminanceFS);
        //this._postFX = new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), BlackAndWhite);
        //this._postFX = new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), EightBit);
        //this._postFX = new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), NightVision);
        //this._postFX = new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), Brightness);
        //this._postFX = new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), Contrast);
        this._postFX = new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), Toon);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getCanvas = function() {
        return this._canvas;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getContext = function() {
        return this._context;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getPrimitives = function() {
        return this._primitives;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getCamera = function() {
        return this._camera;
    };
    // TODO: setCamera

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getUniformState = function() {
        return this._context.getUniformState();
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getAnimations = function() {
        return this._animations;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.setSunPosition = function(sunPosition) {
        this.getUniformState().setSunPosition(sunPosition);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getSunPosition = function() {
        return this.getUniformState().getSunPosition();
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.setAnimation = function(animationCallback) {
        this._animate = animationCallback;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getAnimation = function() {
        return this._animate;
    };

    Scene.prototype._update = function() {
        var us = this.getUniformState();
        var camera = this._camera;

        // Destroy released shaders once every 120 frames to avoid thrashing the cache
        if (this._shaderFrameCount++ === 120) {
            this._shaderFrameCount = 0;
            this._context.getShaderCache().destroyReleasedShaderPrograms();
        }

        this._animations.update();
        camera.update();
        us.setProjection(camera.frustum.getProjectionMatrix());
        if (camera.frustum.getInfiniteProjectionMatrix) {
            us.setInfiniteProjection(camera.frustum.getInfiniteProjectionMatrix());
        }
        us.setView(camera.getViewMatrix());

        if (this._animate) {
            this._animate();
        }

        var sceneState = this._sceneState;
        sceneState.mode = this.mode;
        sceneState.scene2D = this.scene2D;
        sceneState.camera = camera;

        this._primitives.update(this._context, sceneState);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.render = function() {
        this._update();

// TODO: recreate if width or height changes
        if (!this._framebuffer) {
            var width = this._canvas.clientWidth;
            var height = this._canvas.clientHeight;

            this._framebuffer = this._context.createFramebuffer({
                colorTexture : this._context.createTexture2D({
                    width : width,
                    height : height
                }),
                depthTexture : this._context.createTexture2D({
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });
        }
        this._context._HACK_framebuffer = this._framebuffer;

        this._context.clear(this._clearState);
        this._primitives.render(this._context);

        this._context._HACK_framebuffer = undefined;

// TODO: _postFX doesn't use sceneState so we pull off this hack.
        var sceneState = undefined;
        var postFX = this._postFX;

// TODO: if width or height changes, ViewQuad needs to be recreated
        postFX.setTexture(this._framebuffer.getColorTexture());
        //postFX.setTexture(this._framebuffer.getDepthTexture());
        postFX.update(this._context, sceneState);
        postFX.render(this._context);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.pick = function(windowPosition) {
        var context = this._context;
        var primitives = this._primitives;

        this._pickFramebuffer = this._pickFramebuffer || context.createPickFramebuffer();
        var fb = this._pickFramebuffer.begin();

        // TODO: Should we also do a regular update?
        primitives.updateForPick(context);
        primitives.renderForPick(context, fb);

        return this._pickFramebuffer.end({
            x : windowPosition.x,
            y : (this._canvas.clientHeight - windowPosition.y)
        });
    };

    /**
     * Pick an ellipsoid or map.
     *
     * @memberof Scene
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Cartesian3} If the ellipsoid or map was picked, returns the point on the surface of the ellipsoid or map
     * in world coordinates. If the ellipsoid or map was not picked, returns undefined.
     */
    Scene.prototype.pickEllipsoid = function(windowPosition, ellipsoid) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        var p;
        if (this.mode === SceneMode.SCENE3D) {
            p = this._camera.pickEllipsoid(windowPosition, ellipsoid);
        } else if (this.mode === SceneMode.SCENE2D) {
            p = this._camera.pickMap2D(windowPosition, this.scene2D.projection);
        } else if (this.mode === SceneMode.COLUMBUS_VIEW) {
            p = this._camera.pickMapColumbusView(windowPosition, this.scene2D.projection);
        }

        return p;
    };

    /**
     * View an extent on an ellipsoid or map.
     *
     * @memberof Scene
     *
     * @param {Extent} extent The extent to view.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to view.
     *
     * @exception {DeveloperError} extent is required.
     */
    Scene.prototype.viewExtent = function(extent, ellipsoid) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        if (this.mode === SceneMode.SCENE3D) {
            this._camera.viewExtent(extent, ellipsoid);
        } else if (this.mode === SceneMode.SCENE2D) {
            this._camera.viewExtent2D(extent, this.scene2D.projection);
        } else if (this.mode === SceneMode.COLUMBUS_VIEW) {
            this._camera.viewExtentColumbusView(extent, this.scene2D.projection);
        }
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.destroy = function() {
        this._postFX = this._postFX && this._postFX.destroy();
        this._camera = this._camera && this._camera.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this._context = this._context && this._context.destroy();
        return destroyObject(this);
    };

    return Scene;
});