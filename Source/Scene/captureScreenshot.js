import defaultValue from '../Core/defaultValue.js';
import Check from '../Core/Check.js';
import when from '../ThirdParty/when.js';

    /**
     * Capture a screenshot of the viewer to a dataURI containing a PNG image.
     *
     * @param {Viewer} viewer
     * @param {Number} [resolutionScale] scaling factor for rendering resolution.  See {@link Viewer#resolutionScale} for
     * more information on scale
     *
     * @return {Promise<String>} resolves to a dataURI of a PNG image
     */
    function captureScreenshot(viewer, resolutionScale) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('viewer', viewer);
        //>>includeEnd('debug');

        resolutionScale = defaultValue(resolutionScale, 1.0);
        return captureScreen(viewer.cesiumWidget, resolutionScale);
    }

    function captureScreen(cesiumWidget, targetResolutionScale) {
        var complete = when.defer();
        var initialScale = cesiumWidget.resolutionScale;
        cesiumWidget.resolutionScale = targetResolutionScale;
        var scene = cesiumWidget.scene;
        var removePreListener = scene.preUpdate.addEventListener(function() {
            var canvas = scene.canvas;
            var removePostListener = scene.postRender.addEventListener(function() {
                var dataUrl = canvas.toDataURL('image/png');
                cesiumWidget.resolutionScale = initialScale;
                complete.resolve(dataUrl);
                removePostListener();
            });
            removePreListener();
        });
        return complete.promise;
    }

export default captureScreenshot;
