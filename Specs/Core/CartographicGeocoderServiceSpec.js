/*global defineSuite*/
defineSuite([
    'Core/CartographicGeocoderService',
    'Core/Cartesian3'
], function(
    CartographicGeocoderService,
    Cartesian3) {
    'use strict';

    var service = new CartographicGeocoderService();

    it('returns cartesian with matching coordinates for long/lat/height input', function (done) {
        var query = ' 1.0, 2.0, 3.0 ';
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(1);
            expect(results[0]).toEqual(Cartesian3.fromDegrees(1.0, 2.0, 3.0));
            done();
        });
    });

    it('returns cartesian with matching coordinates for long/lat input', function (done) {
        var query = ' 1.0, 2.0 ';
        var defaultHeight = 300.0;
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(1);
            expect(results[0]).toEqual(Cartesian3.fromDegrees(1.0, 2.0, defaultHeight));
            done();
        });
    });

    it('returns empty array for input with only one number', function (done) {
        var query = ' 2.0 ';
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

    it('returns empty array for with string', function (done) {
        var query = ' aoeu ';
        service.geocode(query, function(err, results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

});
