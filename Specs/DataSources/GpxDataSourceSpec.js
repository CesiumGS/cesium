/*global defineSuite*/
defineSuite(['DataSources/GpxDataSource',
             'DataSources/EntityCollection',
             'Core/loadXML',
             'Core/Event'
            ], function(
                    GpxDataSource,
                    EntityCollection,
                    loadXML,
                    Event) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('default constructor has expected values', function() {
        var dataSource = new GpxDataSource();
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.isLoading).toBe(false);
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.loadingEvent).toBeInstanceOf(Event);
    });

    it('load throws with undefined GPX', function() {
        var dataSource = new GpxDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrowDeveloperError();
    });

    it('load works with a GPX URL', function() {
        var dataSource = new GpxDataSource();
        return dataSource.load('Data/GPX/simple.gpx').then(function(source) {
            expect(source).toBe(dataSource);
            expect(source.entities.values.length).toEqual(1);
        });
    });

});