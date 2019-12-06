import defined from '../../Source/Core/defined.js';
import defineProperties from '../../Source/Core/defineProperties.js';
import DeveloperError from '../../Source/Core/DeveloperError.js';
import CesiumNavigation from './CesiumNavigation.js';
/**
 * Created by Larcius on 18.02.16.
 */


/**
 * A mixin which adds the Compass/Navigation widget to the Viewer widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @exports viewerCesiumNavigationMixin
 *
 * @param {Viewer} viewer The viewer instance.
 * @param {{}} options The options.
 *
 * @exception {DeveloperError} viewer is required.
 *
 * @demo {@link http://localhost:8080/index.html|run local server with examples}
 *
 * @example
 * var viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(viewerCesiumNavigationMixin);
 */
function viewerCesiumNavigationMixin(viewer, options) {
    if (!defined(viewer)) {
        throw new DeveloperError('viewer is required.');
    }

    var cesiumNavigation = init(viewer, options);

    cesiumNavigation.addOnDestroyListener((function (viewer) {
        return function () {
            delete viewer.cesiumNavigation;
        };
    })(viewer));

    defineProperties(viewer, {
        cesiumNavigation: {
            configurable: true,
            get: function () {
                return viewer.cesiumWidget.cesiumNavigation;
            }
        }
    });
}

/**
 *
 * @param {CesiumWidget} cesiumWidget The cesium widget instance.
 * @param {{}} options The options.
 */
viewerCesiumNavigationMixin.mixinWidget = function (cesiumWidget, options) {
    return init.apply(undefined, arguments);
};

/**
 * @param {Viewer|CesiumWidget} viewerCesiumWidget The Viewer or CesiumWidget instance
 * @param {{}} options the options
 */
var init = function (viewerCesiumWidget, options) {
    var cesiumNavigation = new CesiumNavigation(viewerCesiumWidget, options);

    var cesiumWidget = defined(viewerCesiumWidget.cesiumWidget) ? viewerCesiumWidget.cesiumWidget : viewerCesiumWidget;

    defineProperties(cesiumWidget, {
        cesiumNavigation: {
            configurable: true,
            get: function () {
                return cesiumNavigation;
            }
        }
    });

    cesiumNavigation.addOnDestroyListener((function (cesiumWidget) {
        return function () {
            delete cesiumWidget.cesiumNavigation;
        };
    })(cesiumWidget));

    return cesiumNavigation;
};

export default viewerCesiumNavigationMixin;
