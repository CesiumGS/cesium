/*global define*/
define(['../Core/DeveloperError',
        '../Core/loadJson',
        '../DynamicScene/processCzml',
        '../DynamicScene/DynamicObjectCollection'
        ], function(
                DeveloperError,
                loadJson,
                processCzml,
                DynamicObjectCollection) {
    "use strict";

    var CzmlDataSource = function(czml, source) {
        this._dynamicObjectCollection = new DynamicObjectCollection();
        this._clock = undefined;

        if (typeof czml !== 'undefined') {
            processCzml(czml, this._dynamicObjectCollection, source);
        }
    };

    CzmlDataSource.fromString = function(string, name) {
        return new CzmlDataSource(JSON.parse(string), name);
    };

    CzmlDataSource.fromUrl = function(url) {
        return loadJson(url).then(function(czml) {
            var source = new CzmlDataSource();
            processCzml(czml, source._dynamicObjectCollection, url);
            return source;
        });
    };

    CzmlDataSource.prototype.getClock = function() {
        return this._clock;
    };

    CzmlDataSource.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    return CzmlDataSource;
});