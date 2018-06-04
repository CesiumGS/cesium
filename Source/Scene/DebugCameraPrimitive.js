define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FrustumGeometry',
        '../Core/FrustumOutlineGeometry',
        '../Core/GeometryInstance',
        '../Core/Matrix3',
        '../Core/OrthographicFrustum',
        '../Core/OrthographicOffCenterFrustum',
        '../Core/PerspectiveFrustum',
        '../Core/PerspectiveOffCenterFrustum',
        '../Core/Quaternion',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        FrustumGeometry,
        FrustumOutlineGeometry,
        GeometryInstance,
        Matrix3,
        OrthographicFrustum,
        OrthographicOffCenterFrustum,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        Quaternion,
        PerInstanceColorAppearance,
        Primitive) {
    'use strict';

    /**
     * Draws the outline of the camera's view frustum.
     *
     * @alias DebugCameraPrimitive
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Camera} options.camera The camera.
     * @param {Color} [options.color=Color.CYAN] The color of the debug outline.
     * @param {Boolean} [options.updateOnChange=true] Whether the primitive updates when the underlying camera changes.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick}.
     *
     * @example
     * primitives.add(new Cesium.DebugCameraPrimitive({
     *   camera : camera,
     *   color : Cesium.Color.YELLOW
     * }));
     */
    function DebugCameraPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.camera)) {
            throw new DeveloperError('options.camera is required.');
        }
        //>>includeEnd('debug');

        this._camera = options.camera;
        this._color = defaultValue(options.color, Color.CYAN);
        this._updateOnChange = defaultValue(options.updateOnChange, true);

        /**
         * Determines if this primitive will be shown.
         *
         * @type Boolean
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * User-defined value returned when the primitive is picked.
         *
         * @type {*}
         * @default undefined
         *
         * @see Scene#pick
         */
        this.id = options.id;
        this._id = undefined;

        this._outlinePrimitives = [];
        this._planesPrimitives = [];
    }

    var scratchRight = new Cartesian3();
    var scratchRotation = new Matrix3();
    var scratchOrientation = new Quaternion();
    var scratchPerspective = new PerspectiveFrustum();
    var scratchPerspectiveOffCenter = new PerspectiveOffCenterFrustum();
    var scratchOrthographic = new OrthographicFrustum();
    var scratchOrthographicOffCenter = new OrthographicOffCenterFrustum();

    var scratchColor = new Color();
    var scratchSplits = [1.0, 100000.0];

    /**
     * @private
     */
    DebugCameraPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        var planesPrimitives = this._planesPrimitives;
        var outlinePrimitives = this._outlinePrimitives;
        var i;
        var length;

        if (this._updateOnChange) {
            // Recreate the primitive every frame
            length = planesPrimitives.length;
            for (i = 0; i < length; ++i) {
                outlinePrimitives[i] = outlinePrimitives[i] && outlinePrimitives[i].destroy();
                planesPrimitives[i] = planesPrimitives[i] && planesPrimitives[i].destroy();
            }
            planesPrimitives.length = 0;
            outlinePrimitives.length = 0;
        }

        if (planesPrimitives.length === 0) {
            var camera = this._camera;
            var cameraFrustum = camera.frustum;
            var frustum;
            if (cameraFrustum instanceof PerspectiveFrustum) {
                frustum = scratchPerspective;
            } else if (cameraFrustum instanceof PerspectiveOffCenterFrustum) {
                frustum = scratchPerspectiveOffCenter;
            } else if (cameraFrustum instanceof OrthographicFrustum) {
                frustum = scratchOrthographic;
            } else {
                frustum = scratchOrthographicOffCenter;
            }
            frustum = cameraFrustum.clone(frustum);

            var frustumSplits = frameState.frustumSplits;
            var numFrustums = frustumSplits.length - 1;
            if (numFrustums <= 0) {
                frustumSplits = scratchSplits; // Use near and far planes if no splits created
                frustumSplits[0] = this._camera.frustum.near;
                frustumSplits[1] = this._camera.frustum.far;
                numFrustums = 1;
            }

            var position = camera.positionWC;
            var direction = camera.directionWC;
            var up = camera.upWC;
            var right = camera.rightWC;
            right = Cartesian3.negate(right, scratchRight);

            var rotation = scratchRotation;
            Matrix3.setColumn(rotation, 0, right, rotation);
            Matrix3.setColumn(rotation, 1, up, rotation);
            Matrix3.setColumn(rotation, 2, direction, rotation);

            var orientation = Quaternion.fromRotationMatrix(rotation, scratchOrientation);

            planesPrimitives.length = outlinePrimitives.length = numFrustums;

            for (i = 0; i < numFrustums; ++i) {
                frustum.near = frustumSplits[i];
                frustum.far = frustumSplits[i + 1];

                planesPrimitives[i] = new Primitive({
                    geometryInstances : new GeometryInstance({
                        geometry : new FrustumGeometry({
                            origin : position,
                            orientation : orientation,
                            frustum : frustum,
                            _drawNearPlane : i === 0
                        }),
                        attributes : {
                            color : ColorGeometryInstanceAttribute.fromColor(Color.fromAlpha(this._color, 0.1, scratchColor))
                        },
                        id : this.id,
                        pickPrimitive : this
                    }),
                    appearance : new PerInstanceColorAppearance({
                        translucent : true,
                        flat : true
                    }),
                    asynchronous : false
                });

                outlinePrimitives[i] = new Primitive({
                    geometryInstances : new GeometryInstance({
                        geometry : new FrustumOutlineGeometry({
                            origin : position,
                            orientation : orientation,
                            frustum : frustum,
                            _drawNearPlane : i === 0
                        }),
                        attributes : {
                            color : ColorGeometryInstanceAttribute.fromColor(this._color)
                        },
                        id : this.id,
                        pickPrimitive : this
                    }),
                    appearance : new PerInstanceColorAppearance({
                        translucent : false,
                        flat : true
                    }),
                    asynchronous : false
                });
            }
        }

        length = planesPrimitives.length;
        for (i = 0; i < length; ++i) {
            outlinePrimitives[i].update(frameState);
            planesPrimitives[i].update(frameState);
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
     * @see DebugCameraPrimitive#destroy
     */
    DebugCameraPrimitive.prototype.isDestroyed = function() {
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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * p = p && p.destroy();
     *
     * @see DebugCameraPrimitive#isDestroyed
     */
    DebugCameraPrimitive.prototype.destroy = function() {
        var length = this._planesPrimitives.length;
        for (var i = 0; i < length; ++i) {
            this._outlinePrimitives[i] = this._outlinePrimitives[i] && this._outlinePrimitives[i].destroy();
            this._planesPrimitives[i] = this._planesPrimitives[i] && this._planesPrimitives[i].destroy();
        }
        return destroyObject(this);
    };

    return DebugCameraPrimitive;
});
