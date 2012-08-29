/*global define*/
define([
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/EquidistantCylindricalProjection',
        '../Core/Ellipsoid',
        '../Core/DeveloperError',
        '../Core/Occluder',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Renderer/Context',
        './Camera',
        './CompositePrimitive',
        './AnimationCollection',
        './SceneMode',
        './FrameState'
    ], function(
        Color,
        destroyObject,
        EquidistantCylindricalProjection,
        Ellipsoid,
        DeveloperError,
        Occluder,
        BoundingSphere,
        Cartesian3,
        Context,
        Camera,
        CompositePrimitive,
        AnimationCollection,
        SceneMode,
        FrameState) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Scene
     * @constructor
     */
    var Scene = function(canvas) {
        var context = new Context(canvas);

        this._frameState = new FrameState();
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
     * Gets state information about the current scene.
     *
     * @memberof Scene
     */
    Scene.prototype.getFrameState = function() {
        return this._frameState;
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

    Scene.prototype._updateFrameState = function(passName) {
        var camera = this._camera;

        var frameState = this._frameState;
        frameState.mode = this.mode;
        frameState.scene2D = this.scene2D;
        frameState.camera = camera;
        frameState.occluder = undefined;

        // TODO: The occluder is the top-level central body. When we add
        //       support for multiple central bodies, this should be the closest one?
        var cb = this._primitives.getCentralBody();
        if (this.mode === SceneMode.SCENE3D && typeof cb !== 'undefined') {
            var ellipsoid = cb.getEllipsoid();
            var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMinimumRadius()), camera.getPositionWC());
            frameState.occluder = occluder;
        }

        var passes = frameState.passes;
        for (var pass in passes) {
            if (passes.hasOwnProperty(pass)) {
                passes[pass] = false;
            }
        }

        if (typeof passName !== 'undefined') {
            frameState.passes[passName] = true;
        }
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

        this._updateFrameState();
        this._primitives.update(this._context, this._frameState);
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
        var frameState = this._frameState;

        this._pickFramebuffer = this._pickFramebuffer || context.createPickFramebuffer();
        var fb = this._pickFramebuffer.begin();

        this._updateFrameState('pick');
        primitives.update(context, frameState);
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
        this._camera = this._camera && this._camera.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this._context = this._context && this._context.destroy();
        return destroyObject(this);
    };

    return Scene;
});