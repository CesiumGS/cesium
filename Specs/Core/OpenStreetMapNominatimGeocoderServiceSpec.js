/*global defineSuite*/
defineSuite([
    'Core/OpenStreetMapNominatimGeocoderService',
    'Core/Cartesian3',
    'Core/loadJsonp',
    'Core/Rectangle'
], function(
    OpenStreetMapNominatimGeocoderService,
    Cartesian3,
    loadJsonp,
    Rectangle) {
    'use strict';

    var service = new OpenStreetMapNominatimGeocoderService();

    it('returns geocoder results', function (done) {
        var query = 'some query';
        jasmine.createSpy('testSpy', loadJsonp).and.returnValue([{
            displayName: 'a',
            boundingbox: [10, 20, 0, 20]
        }]);
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(1);
            expect(results[0].displayName).toEqual('a');
            expect(results[0].destination).toBeInstanceOf(Rectangle);
            done();
        });
    });

    it('returns no geocoder results if OSM Nominatim has no results', function (done) {
        var query = 'some query';
        jasmine.createSpy('testSpy', loadJsonp).and.returnValue([]);
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(0);
            done();
        });
    });
});