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
        this.clock = undefined;
        this.dynamicObjectCollection = new DynamicObjectCollection();
        this.isTimeVarying = false;
        this.destroyed = false;

        var that = this;
        //The actual DataSource interface.
        this.getChangedEvent = function() {
            return that.changedEvent;
        };

        this.getErrorEvent = function() {
            return that.errorEvent;
        };

        this.getClock = function() {
            return that.clock;
        };

        this.getDynamicObjectCollection = function() {
            return that.dynamicObjectCollection;
        };

        this.destroy = function() {
            that.destroyed = true;
        };
    };

    return MockDataSource;
});