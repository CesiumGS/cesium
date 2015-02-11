/*global defineSuite*/
defineSuite([
        'DataSources/CustomDataSource',
        'Core/Event',
        'DataSources/DataSourceClock',
        'DataSources/EntityCollection'
    ], function(
        CustomDataSource,
        Event,
        DataSourceClock,
        EntityCollection) {
    "use strict";
    /*global jasmine,it,expect*/

    it('constructor has expected defaults', function() {
        var dataSource = new CustomDataSource();
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.isLoading).toBe(false);
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.loadingEvent).toBeInstanceOf(Event);
    });

    it('setting name raises changed event', function() {
        var dataSource = new CustomDataSource();

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        var newName = 'chester';
        dataSource.name = newName;
        expect(dataSource.name).toEqual(newName);
        expect(spy.calls.count()).toEqual(1);
        expect(spy).toHaveBeenCalledWith(dataSource);
    });

    it('setting clock raises changed event', function() {
        var dataSource = new CustomDataSource();

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        var newClock = new DataSourceClock();
        dataSource.clock = newClock;
        expect(dataSource.clock).toBe(newClock);
        expect(spy.calls.count()).toEqual(1);
        expect(spy).toHaveBeenCalledWith(dataSource);
    });

    it('setting isLoading raises loading event', function() {
        var dataSource = new CustomDataSource();

        var spy = jasmine.createSpy('loadingEvent');
        dataSource.loadingEvent.addEventListener(spy);

        dataSource.isLoading = true;
        expect(spy.calls.count()).toEqual(1);
        expect(spy).toHaveBeenCalledWith(dataSource, true);

        dataSource.isLoading = false;
        expect(spy.calls.count()).toEqual(2);
        expect(spy).toHaveBeenCalledWith(dataSource, false);
    });
});