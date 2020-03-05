/**
 * An enum describing the globe translucency modes.
 *
 * @exports GlobeTranslucencyMode
 */
var GlobeTranslucencyMode = {
    /**
     * Render the globe without translucency.
     *
     * @type {Number}
     * @constant
     */
    DISABLED : 0,

    /**
     * Render the globe with translucency. Both front faces and back faces are rendered with translucency.
     *
     * @type {Number}
     * @constant
     */
    ENABLED : 1,

    /**
     * Only front faces are rendered with translucency.
     *
     * @type {Number}
     * @constant
     */
    FRONT_FACES_ONLY : 1
};
export default Object.freeze(GlobeTranslucencyMode);
