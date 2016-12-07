/*global defineSuite*/
defineSuite([
    'Core/BingMapsGeocoderService',
    'Core/Cartesian3',
    'Core/loadJsonp',
    'Core/Rectangle'
], function(
    BingMapsGeocoderService,
    Cartesian3,
    loadJsonp,
    Rectangle) {
    'use strict';

    var service = new BingMapsGeocoderService();

    it('returns geocoder results', function (done) {
        var query = 'some query';
        jasmine.createSpy('testSpy', loadJsonp).and.returnValue({
            resourceSets: [{
                resources : [{
                    name : 'a',
                    bbox : [32.0, 3.0, 3.0, 4.0]
                }]
            }]
        });
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(1);
            expect(results[0].displayName).toEqual('a');
            expect(results[0].destination).toBeInstanceOf(Rectangle);
            done();
        });
    });

    it('returns no geocoder results if Bing has no results', function (done) {
        var query = 'some query';
        jasmine.createSpy('testSpy', loadJsonp).and.returnValue({
            resourceSets: []
        });
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

    it('returns no geocoder results if Bing has results but no resources', function (done) {
        var query = 'some query';
        jasmine.createSpy('testSpy', loadJsonp).and.returnValue({
            resourceSets: [{
                resources: []
            }]
        });
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(0);
            done();
        });
    });
});
