import freezeObject from '../Core/freezeObject.js';

    /**
     * Represents which vertices should have a value of `true` for the `applyOffset` attribute
     * @private
     */
    var GeometryOffsetAttribute = {
        NONE : 0,
        TOP : 1,
        ALL : 2
    };
export default freezeObject(GeometryOffsetAttribute);
