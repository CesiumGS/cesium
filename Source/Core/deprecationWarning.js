import defined from './defined.js';
import DeveloperError from './DeveloperError.js';
import oneTimeWarning from './oneTimeWarning.js';

    /**
     * Logs a deprecation message to the console.  Use this function instead of
     * <code>console.log</code> directly since this does not log duplicate messages
     * unless it is called from multiple workers.
     *
     * @exports deprecationWarning
     *
     * @param {String} identifier The unique identifier for this deprecated API.
     * @param {String} message The message to log to the console.
     *
     * @example
     * // Deprecated function or class
     * function Foo() {
     *    deprecationWarning('Foo', 'Foo was deprecated in Cesium 1.01.  It will be removed in 1.03.  Use newFoo instead.');
     *    // ...
     * }
     *
     * // Deprecated function
     * Bar.prototype.func = function() {
     *    deprecationWarning('Bar.func', 'Bar.func() was deprecated in Cesium 1.01.  It will be removed in 1.03.  Use Bar.newFunc() instead.');
     *    // ...
     * };
     *
     * // Deprecated property
     * defineProperties(Bar.prototype, {
     *     prop : {
     *         get : function() {
     *             deprecationWarning('Bar.prop', 'Bar.prop was deprecated in Cesium 1.01.  It will be removed in 1.03.  Use Bar.newProp instead.');
     *             // ...
     *         },
     *         set : function(value) {
     *             deprecationWarning('Bar.prop', 'Bar.prop was deprecated in Cesium 1.01.  It will be removed in 1.03.  Use Bar.newProp instead.');
     *             // ...
     *         }
     *     }
     * });
     *
     * @private
     */
    function deprecationWarning(identifier, message) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(identifier) || !defined(message)) {
            throw new DeveloperError('identifier and message are required.');
        }
        //>>includeEnd('debug');

        oneTimeWarning(identifier, message);
    }
export default deprecationWarning;
