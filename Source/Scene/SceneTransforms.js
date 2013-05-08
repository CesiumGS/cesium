/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/BoundingRectangle'
    ],
    function(
        defaultValue,
        DeveloperError,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Matrix4,
        BoundingRectangle) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports SceneTransforms
     */
    var SceneTransforms = {};

    var positionNDC = new Cartesian3();
    var positionWC = new Cartesian4();
    var viewport = new BoundingRectangle();
    var viewportTransform = new Matrix4();

    /**
     * DOC_TBA
     *
     * @memberof SceneTransforms
     *
     * @exception {DeveloperError} canvas is required.
     * @exception {DeveloperError} position is required.
     *
     */
    SceneTransforms.clipToWindowCoordinates = function(canvas, position, result) {
        if (typeof canvas === 'undefined') {
            throw new DeveloperError('canvas is required.');
        }

        if (typeof position === 'undefined') {
            throw new DeveloperError('position is required.');
        }

        // Perspective divide to transform from clip coordinates to normalized device coordinates
        positionNDC.x = position.x / position.w;
        positionNDC.y = position.y / position.w;
        positionNDC.z = position.z / position.w;

        // Assuming viewport takes up the entire canvas...
        viewport.width = canvas.clientWidth;
        viewport.height = canvas.clientHeight;
        Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, viewportTransform);

        // Viewport transform to transform from clip coordinates to window coordinates
        viewportTransform.multiplyByPoint(positionNDC, positionWC);

        return Cartesian2.fromCartesian4(positionWC, result);
    };

    return SceneTransforms;
});
