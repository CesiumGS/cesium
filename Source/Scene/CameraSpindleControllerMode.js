/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * This enumerated type is for describing how the <code>CameraSpindleController</code>
     * will handle mouse events.
     *
     * @exports CameraSpindleControllerMode
     *
     * @see {CameraSpindleController#mode}
     */
    var CameraSpindleControllerMode = {
        /**
         * This mode is useful for rotating around arbitrary ellipsoids.
         *
         * @constant
         * @type {Enumeration}
         */
        ROTATE : new Enumeration(0, 'ROTATE'),

        /**
         * This mode will cause the controller to rotate around an ellipsoid such that
         * the point under the mouse cursor will remain there when dragged. This mode can only
         * be used for larger ellipsoids like the WGS84 ellipsoid.
         *
         * @constant
         * @type {Enumeration}
         */
        PAN : new Enumeration(1, 'PAN'),

        /**
         * This mode will choose the best mode for the mouse input.
         *
         * @constant
         * @type {Enumeration}
         */
        AUTO : new Enumeration(2, 'AUTO')
    };

    return CameraSpindleControllerMode;
});