/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * <p>
     * Observable properties are used to implement two-way data binding in
     * Cesium's Model-View-View-Model (MVVM) based widget architecture.
     * Observable properties can be accessed and assigned like any ECMAScript 5 property.
     * </p>
     * <p>
     * Internally, Cesium uses the Knockout and Knockout-ES5 libraries to implement
     * observable properties.
     * </p>
     * <p>
     * This type describes an interface and is not intended to be instantiated
     * directly.
     * </p>
     *
     * @alias Observable
     * @constructor
     *
     * @see <a href='http://knockoutjs.com/'>Knockout homepage</a>
     * @see <a href='https://github.com/SteveSanderson/knockout-es5'>Knockout-ES5</a>
     * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Architecture'>Widget Architecture</a>
     */
    var Observable = function Observable() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    return Observable;
});