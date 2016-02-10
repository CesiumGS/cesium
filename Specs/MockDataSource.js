/*global define*/
define([
        'Core/Event',
        'DataSources/EntityCollection'
    ], function(
        Event,
        EntityCollection) {
    'use strict';

    function MockDataSource() {
        //Values to be fiddled with by the test
        this.changedEvent = new Event();
        this.errorEvent = new Event();
        this.entities = new EntityCollection();
        this.name = 'Mock Data';
        this.clock = undefined;
        this.isTimeVarying = false;
        this.isLoading = false;
        this.loadingEvent = new Event();
        this.destroyed = false;
    }
    MockDataSource.prototype.update = function() {
        return true;
    };

    MockDataSource.prototype.destroy = function() {
        this.destroyed = true;
    };

    return MockDataSource;
});
