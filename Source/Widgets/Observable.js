/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Observable properties are used to implement two-way data binding in
     * Cesium's Model-View-View-Model (MVVM) based widget architecture.
     *
     * To retrieve an Observable's value, call it as a function with no
     * parameters.
     *
     * To set an Observable's value, call it as a function with a single
     * parameter.
     *
     * This type describes an interface and is not intended to be instantiated
     * directly.
     *
     * @alias Observable
     * @constructor
     *
     * @see <a href='http://knockoutjs.com/'>Knockout homepage</a>.
     * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Architecture'>Widget Architecture</a>.
     */
    var Observable = function Observable() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    return Observable;
});