/*global define*/
define([
        '../Core/createGuid',
        '../Core/DeveloperError'
    ], function(
        createGuid,
        DeveloperError) {
    "use strict";

    //Copied from GeoJsonDataSource
    var ConstantPositionProperty = function(value) {
        this._value = value;
    };

    ConstantPositionProperty.prototype.getValueCartesian = function(time, result) {
        var value = this._value;
        if (typeof value.clone === 'function') {
            return value.clone(result);
        }
        return value;
    };

    ConstantPositionProperty.prototype.setValue = function(value) {
        this._value = value;
    };

    var processKml = function(kml, dynamicObjectCollection, sourceUri) {
        if (typeof kml === 'undefined') {
            throw new DeveloperError('kml is required.');
        }
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }

        var array = kml.getElementByTagName('Placemark');
        for ( var i = 0, len = array.length; i < len; i++){
            dynamicObjectCollection.getOrCreateObject();
        }

        //coming up next, iterating Placemarks

    };

    return processKml;
});
