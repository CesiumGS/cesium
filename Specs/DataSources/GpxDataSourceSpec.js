/*global defineSuite*/
defineSuite(['DataSources/GpxDataSource',
             'Core/Cartesian3',
             'Core/DeveloperError',
             'DataSources/EntityCollection',
             'Core/loadXML',
             'Core/Event',
             'Core/Iso8601'
            ], function(
                    GpxDataSource,
                    Cartesian3,
                    DeveloperError,
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

    it('Waypoint: throws with invalid coordinates', function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
                <wpt lat="hello" lon="world">\
                </wpt>\
            </gpx>';
        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).otherwise(function(e) {
            expect(e).toBeInstanceOf(DeveloperError);
        });
    });

    it('Waypoint: throws when no coordinates are given', function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
                <wpt>\
                </wpt>\
            </gpx>';
        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).otherwise(function(e) {
            expect(e).toBeInstanceOf(DeveloperError);
        });
    });

    it('Waypoint: handles simple waypoint', function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
                <wpt lon="38.737125" lat="-9.139242">\
                    <name>Position 1</name>\
                </wpt>\
            </gpx>';
        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(38.737125, -9.139242, undefined));
        });
    });

//    it('Waypoint: handles simple waypoint with elevation', function() {
//        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
//            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
//                <wpt lon="1" lat="2">\
//                    <ele>3</ele>\
//                    <name>Position 1</name>\
//                </wpt>\
//            </gpx>';
//        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(function(dataSource) {
//            var entities = dataSource.entities.values;
//            expect(entities.length).toEqual(1);
//            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
//        });
//    });

    it('Waypoint: handles multiple waypoints', function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
                <wpt lon="1" lat="2">\
                    <name>Position 1</name>\
                </wpt>\
                <wpt lon="3" lat="4">\
                    <name>Position 2</name>\
                </wpt>\
                <wpt lon="5" lat="6">\
                <name>Position 3</name>\
                </wpt>\
            </gpx>';
        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(3);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, undefined));
            expect(entities[1].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(3, 4, undefined));
            expect(entities[2].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(5, 6, undefined));
        });
    });

    it('Waypoint: handles description', function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
                <wpt lon="1" lat="2">\
                    <desc>The Description</desc>\
                </wpt>\
            </gpx>';
        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var div = element.firstChild;
            expect(div.style['word-wrap']).toEqual('break-word');
            expect(div.style['background-color']).toEqual('rgb(255, 255, 255)');
            expect(div.style.color).toEqual('rgb(0, 0, 0)');
            expect(div.textContent).toEqual('Coordinates: 1, 2Description: The Description');
        });
    });

    it('Route: handles simple route', function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="RouteConverter">\
                <rte>\
                    <name>Test Route</name>\
                    <rtept lon="9.860624216140083" lat="54.9328621088893">\
                        <ele>0.0</ele>\
                        <name>Position 1</name>\
                    </rtept>\
                    <rtept lon="9.86092208681491" lat="54.93293237320851">\
                        <ele>0.0</ele>\
                        <name>Position 2</name>\
                    </rtept>\
                    <rtept lon="9.86187816543752" lat="54.93327743521187">\
                        <ele>0.0</ele>\
                        <name>Position 3</name>\
                    </rtept>\
                    <rtept lon="9.862439849679859" lat="54.93342326167919">\
                        <ele>0.0</ele>\
                        <name>Position 4</name>\
                    </rtept>\
                </rte>\
            </gpx>';
        return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(5); //1 for the route and 4 routepoints
        });
    });

});
