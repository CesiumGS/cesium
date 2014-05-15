/*global define*/
define([
        'Core/Event',
        'DynamicScene/DynamicObjectCollection'
    ], function(
        Event,
        DynamicObjectCollection) {
    "use strict";

    var MockDataSource = function() {
        //Values to be fiddled with by the test
        this.changedEvent = new Event();
        this.errorEvent = new Event();
        this.dynamicObjects = new DynamicObjectCollection();
        this.name = 'Mock Data';
        this.clock = undefined;
        this.isTimeVarying = false;
        this.isLoading = false;
        this.loadingEvent = new Event();
        this.destroyed = false;
    };

    MockDataSource.prototype.update = function() {
        return true;
    };

    MockDataSource.prototype.destroy = function() {
        this.destroyed = true;
    };

    return MockDataSource;
});