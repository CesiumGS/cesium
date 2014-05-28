/*global define*/
define(function() {
    "use strict";

    /**
     * Enumerates the available camera rotation types in a StoredView.  Not all rotation types are
     * applicable to all stored views.  If the description of a rotation type specifies that it
     * is "centered on a DynamicObject," then it requires a dynamicObject, otherwise it requires
     * the dynamicObject to be undefined.
     *
     * @exports StoredViewCameraRotationMode
     */
    var StoredViewCameraRotationMode = {
        /**
         * From the camera's point of view, the Earth remains fixed in space as time
         * advances, and the stars appear to rotate around the planet.  This is a typical
         * view from any fixed location on Earth or in the atmosphere.
         *
         * @type {Number}
         * @constant
         */
        EARTH_FIXED : 0,

        /**
         * The camera maintains its position in the International Celestial Reference System (ICRF),
         * which means that the stars remain fixed and the Earth rotates as time advances from the
         * camera's point of view.  This works better outside of Earth's atmosphere, in orbit.
         *
         * @type {Number}
         * @constant
         */
        ICRF : 1,

        /**
         * When the camera is centered on a DynamicObject, it will attempt to maintain the
         * Local Vertical, Local Horizontal (LVLH) reference frame, keeping the object's local
         * up (zenith) vector aligned to the top of the camera's view over time.
         *
         * @type {Number}
         * @constant
         */
        LVLH : 2,

        /**
         * When the camera is centered on a DynamicObject, the Earth will be visible "rightside-up"
         * behind the object, with the Earth's North Pole aligned to the top of the camera's view
         * over time.  This only works for objects in high orbits, where enough of the globe is visible
         * at once that a viewer might expect to see the globe rightside-up.
         *
         * @type {Number}
         * @constant
         */
        NORTH_UP : 3,

        /**
         * When the camera is centered on a DynamicObject, it attempts to emulate a view directly
         * from that object, displaying what an observer inside that object might see.
         *
         * @type {Number}
         * @constant
         */
        FROM_OBJECT : 4
    };

    /**
     * Get the name of a StoredViewCameraRotationMode value.
     * @memberof StoredViewCameraRotationMode
     *
     * @param {StoredViewCameraRotationMode} storedViewCameraRotationMode The mode to name.
     * @returns {String} The name of the mode.
     */
    StoredViewCameraRotationMode.getName = function(storedViewCameraRotationMode) {
        for (var key in StoredViewCameraRotationMode) {
            if (StoredViewCameraRotationMode.hasOwnProperty(key) && (typeof StoredViewCameraRotationMode[key] === 'number') &&
                    (StoredViewCameraRotationMode[key] === storedViewCameraRotationMode)) {
                return key;
            }
        }
        return 'undefined';
    };

    /**
     * Test if this rotation mode requires a {@link DynamicObject} to track.
     * @memberof StoredViewCameraRotationMode
     *
     * @param {StoredViewCameraRotationMode} storedViewCameraRotationMode The mode to test.
     * @returns {Bool} True if a DynamicObject is required.
     */
    StoredViewCameraRotationMode.requiresDynamicObject = function(storedViewCameraRotationMode) {
        return storedViewCameraRotationMode >= 2;
    };

    return StoredViewCameraRotationMode;
});
