/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
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
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        EARTH_FIXED : new Enumeration(0, 'EARTH_FIXED'),

        /**
         * The camera maintains its position in the International Celestial Reference System (ICRF),
         * which means that the stars remain fixed and the Earth rotates as time advances from the
         * camera's point of view.  This works better outside of Earth's atmosphere, in orbit.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        ICRF : new Enumeration(1, 'ICRF'),

        /**
         * When the camera is centered on a DynamicObject, it will attempt to maintain the
         * Local Vertical, Local Horizontal (LVLH) reference frame, keeping the object's local
         * up (zenith) vector aligned to the top of the camera's view over time.
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        LVLH : new Enumeration(2, 'LVLH'),

        /**
         * When the camera is centered on a DynamicObject, the Earth will be visible "rightside-up"
         * behind the object, with the Earth's North Pole aligned to the top of the camera's view
         * over time.  This only works for objects in high orbits, where enough of the globe is visible
         * at once that a viewer might expect to see the globe rightside-up.
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        NORTH_UP : new Enumeration(3, 'NORTH_UP'),

        /**
         * When the camera is centered on a DynamicObject, it attempts to emulate a view directly
         * from that object, displaying what an observer inside that object might see.
         *
         * @type {Enumeration}
         * @constant
         * @default 4
         */
        FROM_OBJECT : new Enumeration(4, 'FROM_OBJECT')
    };

    /**
     * Test if this rotation mode requires a {@link DynamicObject} to track.
     * @memberof StoredViewCameraRotationMode
     *
     * @param {StoredViewCameraRotationMode} storedViewCameraRotationMode The mode to test.
     * @returns {Bool} True if a DynamicObject is required.
     */
    StoredViewCameraRotationMode.requiresDynamicObject = function(storedViewCameraRotationMode) {
        return storedViewCameraRotationMode.value >= 2;
    };

    return StoredViewCameraRotationMode;
});
