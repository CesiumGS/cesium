import Color from '../Core/Color.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';

    /**
     * A directional light source that originates from the Sun.
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Color} [options.color=new Color(1.0, 1.0, 1.0)] The light's color.
     * @param {Number} [options.intensity=2.0] The light's intensity.
     *
     * @alias SunLight
     * @constructor
     */
    function SunLight(options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        /**
         * The color of the light.
         * @type {Color}
         * @default new Color(1.0, 1.0, 1.0)
         */
        this.color = defined(options.color) ? Color.clone(options.color) : new Color(1.0, 1.0, 1.0);

        /**
         * The intensity of the light.
         * @type {Number}
         * @default 2.0
         */
        this.intensity = defaultValue(options.intensity, 2.0);
    }

export default SunLight;
