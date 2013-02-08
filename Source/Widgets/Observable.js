/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Observables are used by view models in the Widgets layer
     * in order to allow for two-way data binding and implement
     * a Model-View-View-Model (MVVM) based architecture.
     *
     * You get their current value by simply calling them as a function
     * with no parameters.
     *
     * You set their current value (if writable) but calling them as a
     * function with a single argument defining the new value.
     *
     * @alias Observable
     * @constructor
     *
     * @see <a href='http://knockoutjs.com/'>Knockout homepage/</a>.
     * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Architecture'>Widget Architecture/</a>.
     */
    var Observable = function Observable() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    return Observable;
});