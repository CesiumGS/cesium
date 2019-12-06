import defined from '../../../Source/Core/defined.js';
import Camera from '../../../Source/Scene/Camera.js';
import Cartographic from '../../../Source/Core/Cartographic.js';
import NavigationControl from './NavigationControl.js';
import svgReset from '../SvgPaths/svgReset.js';




/**
 * The model for a zoom in control in the navigation control tool bar
 *
 * @alias ResetViewNavigationControl
 * @constructor
 * @abstract
 *
 * @param {Terria} terria The Terria instance.
 */
var ResetViewNavigationControl = function (terria) {
    NavigationControl.apply(this, arguments);

    /**
     * Gets or sets the name of the control which is set as the control's title.
     * This property is observable.
     * @type {String}
     */
    this.name = 'Reset View';

    /**
     * Gets or sets the svg icon of the control.  This property is observable.
     * @type {Object}
     */
    this.svgIcon = svgReset;

    /**
     * Gets or sets the height of the svg icon.  This property is observable.
     * @type {Integer}
     */
    this.svgHeight = 15;

    /**
     * Gets or sets the width of the svg icon.  This property is observable.
     * @type {Integer}
     */
    this.svgWidth = 15;

    /**
     * Gets or sets the CSS class of the control. This property is observable.
     * @type {String}
     */
    this.cssClass = "navigation-control-icon-reset";

};

ResetViewNavigationControl.prototype = Object.create(NavigationControl.prototype);

ResetViewNavigationControl.prototype.resetView = function () {
    //this.terria.analytics.logEvent('navigation', 'click', 'reset');

    var scene = this.terria.scene;

    var sscc = scene.screenSpaceCameraController;
    if (!sscc.enableInputs) {
        return;
    }

    this.isActive = true;

    var camera = scene.camera;

    if (defined(this.terria.trackedEntity)) {
        // when tracking do not reset to default view but to default view of tracked entity
        var trackedEntity = this.terria.trackedEntity;
        this.terria.trackedEntity = undefined;
        this.terria.trackedEntity = trackedEntity;
    } else {
        // reset to a default position or view defined in the options
        if (this.terria.options.defaultResetView) {
            if (this.terria.options.defaultResetView && this.terria.options.defaultResetView instanceof Cartographic) {
                camera.flyTo({
                    destination: scene.globe.ellipsoid.cartographicToCartesian(this.terria.options.defaultResetView)
                });
            } else if (this.terria.options.defaultResetView && this.terria.options.defaultResetView instanceof Rectangle) {
                try {
                    Rectangle.validate(this.terria.options.defaultResetView);
                    camera.flyTo({
                        destination: this.terria.options.defaultResetView
                    });
                } catch (e) {
                    console.log("Cesium-navigation/ResetViewNavigationControl:   options.defaultResetView Cesium rectangle is  invalid!");
                }
            }
        }
        else if (typeof camera.flyHome === "function") {
            camera.flyHome(1);
        } else {
            camera.flyTo({'destination': Camera.DEFAULT_VIEW_RECTANGLE, 'duration': 1});
        }
    }
    this.isActive = false;
};

/**
 * When implemented in a derived class, performs an action when the user clicks
 * on this control
 * @abstract
 * @protected
 */
ResetViewNavigationControl.prototype.activate = function () {
    this.resetView();
};

export default ResetViewNavigationControl;
