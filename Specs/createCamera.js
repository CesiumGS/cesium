/*global define*/
define([
        'Core/Cartesian3',
        'Core/defaultValue',
        'Core/GeographicProjection',
        'Core/Matrix4',
        'Scene/Camera'
    ], function(
        Cartesian3,
        defaultValue,
        GeographicProjection,
        Matrix4,
        Camera) {
    "use strict";

    var MockScene = function(canvas) {
        canvas = defaultValue(canvas, {
            clientWidth: 512,
            clientHeight: 384
        });

        this.canvas = canvas;
        this.drawingBufferWidth = canvas.clientWidth * 2;
        this.drawingBufferHeight = canvas.clientHeight * 2;
        this.mapProjection = new GeographicProjection();
    };

    function createCamera(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var offset = defaultValue(options.offset, new Cartesian3(-1.0, 0.0, 0.0));
        var target = defaultValue(options.target, Cartesian3.ZERO);
        var transform = defaultValue(options.transform, Matrix4.IDENTITY);
        var near = defaultValue(options.near, 0.01);
        var far = defaultValue(options.far, 10.0);

        var scene = new MockScene(options.canvas);
        var camera = new Camera(scene);
        camera.lookAt({
            target : target,
            offset : offset,
            transform : transform
        });
        camera.frustum.near = near;
        camera.frustum.far = far;

        return camera;
    }

    return createCamera;
});
