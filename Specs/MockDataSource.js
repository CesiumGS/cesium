/*global define*/
define(['Core/Event',
        'DynamicScene/DynamicObjectCollection'
    ], function(
        Event,
        DynamicObjectCollection) {
    "use strict";

    var MockDataSource = function() {
        //Values to be fiddled with by the test
        this.changedEvent = new Event();
        this.errorEvent = new Event();
        this.dynamicObjectCollection = new DynamicObjectCollection();
        this.name = 'Mock Data';
        this.clock = undefined;
        this.isTimeVarying = false;
        this.isLoading = false;
        this.loadEvent = new Event();
        this.destroyed = false;
    };

    MockDataSource.prototype.getChangedEvent = function() {
        return this.changedEvent;
    };

    MockDataSource.prototype.getErrorEvent = function() {
        return this.errorEvent;
    };

    MockDataSource.prototype.getDynamicObjectCollection = function() {
        return this.dynamicObjectCollection;
    };

    MockDataSource.prototype.getName = function() {
        return this.name;
    };

    MockDataSource.prototype.getClock = function() {
        return this.clock;
    };

    MockDataSource.prototype.getIsTimeVarying = function() {
        return this.isTimeVarying;
    };

    MockDataSource.prototype.getIsLoading = function() {
        return this.isLoading;
    };

    MockDataSource.prototype.getLoadingEvent = function() {
        return this.loadEvent;
    };

    MockDataSource.prototype.update = function() {
        return true;
    };

    MockDataSource.prototype.destroy = function() {
        this.destroyed = true;
    };

    return MockDataSource;
});
