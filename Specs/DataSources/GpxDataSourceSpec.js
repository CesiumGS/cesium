/*global defineSuite*/
defineSuite(['DataSources/GpxDataSource',
             'Core/Cartesian3',
             'DataSources/EntityCollection',
             'Core/loadXML',
             'Core/Event',
             'Core/Iso8601'
            ], function(
                    GpxDataSource,
                    Cartesian3,
                    EntityCollection,
                    loadXML,
                    Event,
                    Iso8601) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var parser = new DOMParser();

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

    it('Waypoint: handles simple waypoint', function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
                <wpt lon="38.737125" lat="-9.139242">\
                    <ele>0.0</ele>\
                    <name>Position 1</name>\
                </wpt>\
            </gpx>';
        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(38.737125, -9.139242, undefined));
        });
    });

});