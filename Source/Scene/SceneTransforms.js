/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Matrix4',
        './SceneMode'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defined,
        DeveloperError,
        CesiumMath,
        Matrix4,
        SceneMode) {
    "use strict";

    /**
     * Functions that do scene-dependent transforms between rendering-related coordinate systems.
     *
     * @namespace
     * @alias SceneTransforms
     */
    var SceneTransforms = {};

    var actualPositionScratch = new Cartesian4(0, 0, 0, 1);
    var positionCC = new Cartesian4();
    var viewProjectionScratch = new Matrix4();

    /**
     * Transforms a position in WGS84 coordinates to window coordinates.  This is commonly used to place an
     * HTML element at the same screen position as an object in the scene.
     *
     * @param {Scene} scene The scene.
     * @param {Cartesian3} position The position in WGS84 (world) coordinates.
     * @param {Cartesian2} [result] An optional object to return the input position transformed to window coordinates.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
     *
     * @example
     * // Output the window position of longitude/latitude (0, 0) every time the mouse moves.
     * var scene = widget.scene;
     * var ellipsoid = scene.globe.ellipsoid;
     * var position = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
     * handler.setInputAction(function(movement) {
     *     console.log(Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position));
     * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
     */
    SceneTransforms.wgs84ToWindowCoordinates = function(scene, position, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(position)) {
            throw new DeveloperError('position is required.');
        }
        //>>includeEnd('debug');

        // Transform for 3D, 2D, or Columbus view
        var actualPosition = SceneTransforms.computeActualWgs84Position(scene.frameState, position, actualPositionScratch);

        if (!defined(actualPosition)) {
            return undefined;
        }

        // View-projection matrix to transform from world coordinates to clip coordinates
        var camera = scene.camera;
        var viewProjection = Matrix4.multiply(camera.frustum.projectionMatrix, camera.viewMatrix, viewProjectionScratch);
        Matrix4.multiplyByVector(viewProjection, Cartesian4.fromElements(actualPosition.x, actualPosition.y, actualPosition.z, 1, positionCC), positionCC);

        if ((positionCC.z < 0) && (scene.mode !== SceneMode.SCENE2D)) {
            return undefined;
        }

        result = SceneTransforms.clipToGLWindowCoordinates(scene, positionCC, result);
        result.y = scene.canvas.clientHeight - result.y;
        return result;
    };

    /**
     * Transforms a position in WGS84 coordinates to drawing buffer coordinates.  This may produce different
     * results from SceneTransforms.wgs84ToWindowCoordinates when the browser zoom is not 100%, or on high-DPI displays.
     *
     * @param {Scene} scene The scene.
     * @param {Cartesian3} position The position in WGS84 (world) coordinates.
     * @param {Cartesian2} [result] An optional object to return the input position transformed to window coordinates.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
     *
     * @example
     * // Output the window position of longitude/latitude (0, 0) every time the mouse moves.
     * var scene = widget.scene;
     * var ellipsoid = scene.globe.ellipsoid;
     * var position = Cesium.Cartesian3.fromDegrees(0.0, 0.0));
     * var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
     * handler.setInputAction(function(movement) {
     *     console.log(Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position));
     * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
     */
    SceneTransforms.wgs84ToDrawingBufferCoordinates = function(scene, position, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        if (!defined(position)) {
            throw new DeveloperError('position is required.');
        }
        //>>includeEnd('debug');

        // Transform for 3D, 2D, or Columbus view
        var actualPosition = SceneTransforms.computeActualWgs84Position(scene.frameState, position, actualPositionScratch);

        if (!defined(actualPosition)) {
            return undefined;
        }

        // View-projection matrix to transform from world coordinates to clip coordinates
        var camera = scene.camera;
        var viewProjection = Matrix4.multiply(camera.frustum.projectionMatrix, camera.viewMatrix, viewProjectionScratch);
        Matrix4.multiplyByVector(viewProjection, Cartesian4.fromElements(actualPosition.x, actualPosition.y, actualPosition.z, 1, positionCC), positionCC);

        if ((positionCC.z < 0) && (scene.mode !== SceneMode.SCENE2D)) {
            return undefined;
        }

        return SceneTransforms.clipToDrawingBufferCoordinates(scene, positionCC, result);
    };

    var projectedPosition = new Cartesian3();
    var positionInCartographic = new Cartographic();

    /**
     * @private
     */
    SceneTransforms.computeActualWgs84Position = function(frameState, position, result) {
        var mode = frameState.mode;

        if (mode === SceneMode.SCENE3D) {
            return Cartesian3.clone(position, result);
        }

        var projection = frameState.mapProjection;
        var cartographic = projection.ellipsoid.cartesianToCartographic(position, positionInCartographic);
        if (!defined(cartographic)) {
            return undefined;
        }

        projection.project(cartographic, projectedPosition);

        if (mode === SceneMode.COLUMBUS_VIEW) {
            return Cartesian3.fromElements(projectedPosition.z, projectedPosition.x, projectedPosition.y, result);
        }

        if (mode === SceneMode.SCENE2D) {
            return Cartesian3.fromElements(0.0, projectedPosition.x, projectedPosition.y, result);
        }

        // mode === SceneMode.MORPHING
        var morphTime = frameState.morphTime;
        return Cartesian3.fromElements(
            CesiumMath.lerp(projectedPosition.z, position.x, morphTime),
            CesiumMath.lerp(projectedPosition.x, position.y, morphTime),
            CesiumMath.lerp(projectedPosition.y, position.z, morphTime),
            result);
    };

    var positionNDC = new Cartesian3();
    var positionWC = new Cartesian3();
    var viewport = new BoundingRectangle();
    var viewportTransform = new Matrix4();

    /**
     * @private
     */
    SceneTransforms.clipToGLWindowCoordinates = function(scene, position, result) {
        var canvas = scene.canvas;

        // Perspective divide to transform from clip coordinates to normalized device coordinates
        Cartesian3.divideByScalar(position, position.w, positionNDC);

        // Assuming viewport takes up the entire canvas...
        viewport.width = canvas.clientWidth;
        viewport.height = canvas.clientHeight;
        Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, viewportTransform);

        // Viewport transform to transform from clip coordinates to window coordinates
        Matrix4.multiplyByPoint(viewportTransform, positionNDC, positionWC);

        return Cartesian2.fromCartesian3(positionWC, result);
    };

    /**
     * @private
     */
    SceneTransforms.clipToDrawingBufferCoordinates = function(scene, position, result) {
        // Perspective divide to transform from clip coordinates to normalized device coordinates
        Cartesian3.divideByScalar(position, position.w, positionNDC);

        // Assuming viewport takes up the entire canvas...
        viewport.width = scene.drawingBufferWidth;
        viewport.height = scene.drawingBufferHeight;
        Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, viewportTransform);

        // Viewport transform to transform from clip coordinates to drawing buffer coordinates
        Matrix4.multiplyByPoint(viewportTransform, positionNDC, positionWC);

        return Cartesian2.fromCartesian3(positionWC, result);
    };

    /**
     * @private
     */
    SceneTransforms.transformWindowToDrawingBuffer = function(scene, windowPosition, result) {
        var canvas = scene.canvas;
        var xScale = scene.drawingBufferWidth / canvas.clientWidth;
        var yScale = scene.drawingBufferHeight / canvas.clientHeight;
        return Cartesian2.fromElements(windowPosition.x * xScale, windowPosition.y * yScale, result);
    };

    var scratchNDC = new Cartesian4();
    var scratchWorldCoords = new Cartesian4();

    /**
     * @private
     */
    SceneTransforms.drawingBufferToWgs84Coordinates = function(scene, drawingBufferPosition, depth, result) {
        var context = scene.context;
        var uniformState = context.uniformState;

        var viewport = uniformState.viewport;
        var viewportTransformation = uniformState.viewportTransformation;

        var ndc = Cartesian4.clone(Cartesian4.UNIT_W, scratchNDC);
        ndc.x = (drawingBufferPosition.x - viewport.x) / viewport.width * 2.0 - 1.0;
        ndc.y = (drawingBufferPosition.y - viewport.y) / viewport.height * 2.0 - 1.0;
        ndc.z = (depth * 2.0) - 1.0;
        ndc.w = 1.0;

        var worldCoords = Matrix4.multiplyByVector(uniformState.inverseViewProjection, ndc, scratchWorldCoords);

        // Reverse perspective divide
        var w = 1.0 / worldCoords.w;
        Cartesian3.multiplyByScalar(worldCoords, w, worldCoords);

        return Cartesian3.fromCartesian4(worldCoords, result);
    };

    return SceneTransforms;
});
