/*global define*/
define([
        './defaultValue',
        './DeveloperError'
    ], function(
        defaultValue,
        DeveloperError) {
    'use strict';

    function returnTrue() {
        return true;
    }

    /**
     * Destroys an object.  Each of the object's functions, including functions in its prototype,
     * is replaced with a function that throws a {@link DeveloperError}, except for the object's
     * <code>isDestroyed</code> function, which is set to a function that returns <code>true</code>.
     * The object's properties are removed with <code>delete</code>.
     * <br /><br />
     * This function is used by objects that hold native resources, e.g., WebGL resources, which
     * need to be explicitly released.  Client code calls an object's <code>destroy</code> function,
     * which then releases the native resource and calls <code>destroyObject</code> to put itself
     * in a destroyed state.
     *
     * @exports destroyObject
     *
     * @param {Object} object The object to destroy.
     * @param {String} [message] The message to include in the exception that is thrown if
     *                           a destroyed object's function is called.
     *
     *
     * @example
     * // How a texture would destroy itself.
     * this.destroy = function () {
     *     _gl.deleteTexture(_texture);
     *     return Cesium.destroyObject(this);
     * };
     * 
     * @see DeveloperError
     */
    function destroyObject(object, message) {
        message = defaultValue(message, 'This object was destroyed, i.e., destroy() was called.');

        function throwOnDestroyed() {
            throw new DeveloperError(message);
        }

        for ( var key in object) {
            if (typeof object[key] === 'function') {
                object[key] = throwOnDestroyed;
            }
        }

        object.isDestroyed = returnTrue;

        return undefined;
    }

    return destroyObject;
});
