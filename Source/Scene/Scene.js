/*global define*/
define([
        '../Core/destroyObject',
        '../Core/EquidistantCylindricalProjection',
        '../Core/Ellipsoid',
        '../Renderer/Context',
        './Camera',
        './CompositePrimitive',
        './AnimationCollection',
        './SceneMode'
    ], function(
        destroyObject,
        EquidistantCylindricalProjection,
        Ellipsoid,
        Context,
        Camera,
        CompositePrimitive,
        AnimationCollection,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name Scene
     * @constructor
     */
    function Scene(canvas) {
        var context = new Context(canvas);

        this._canvas = canvas;
        this._context = context;
        this._primitives = new CompositePrimitive();
        this._pickFramebuffer = undefined;
        this._camera = new Camera(canvas);
        this._clearState = context.createClearState({
            color : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            },
            depth : 1.0
        });

        this._animate = undefined; // Animation callback
        this._animations = new AnimationCollection();

        this._shaderFrameCount = 0;

        /**
         * DOC_TBA
         */
        this.mode = SceneMode.SCENE3D;

        /**
         * DOC_TBA
         */
        this.scene2D = {
            /**
             * DOC_TBA
             */
            projection : new EquidistantCylindricalProjection(Ellipsoid.getWgs84())
        };
    }

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

        this._primitives.update(this._context, {
            mode : this.mode,
            scene2D : this.scene2D
        });
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.render = function() {
        this._update();

        this._context.clear(this._clearState);
        this._primitives.render(this._context);
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
        this._camera = this._camera && this._camera.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this._context = this._context && this._context.destroy();
        return destroyObject(this);
    };

    return Scene;
});