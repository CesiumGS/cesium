import { Cartesian3 } from '../../Source/Cesium.js';
import { CartographicGeocoderService } from '../../Source/Cesium.js';

describe('Core/CartographicGeocoderService', function() {

    var service = new CartographicGeocoderService();

    it('returns cartesian with matching coordinates for NS/EW input', function (done) {
        var query = '35N 75W';
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(1);
            expect(results[0].destination).toEqual(Cartesian3.fromDegrees(-75.0, 35.0, 300.0));
            done();
        });
    });

    it('returns cartesian with matching coordinates for EW/NS input', function (done) {
        var query = '75W 35N';
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(1);
            expect(results[0].destination).toEqual(Cartesian3.fromDegrees(-75.0, 35.0, 300.0));
            done();
        });
    });

    it('returns cartesian with matching coordinates for long/lat/height input', function (done) {
        var query = ' 1.0, 2.0, 3.0 ';
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(1);
            expect(results[0].destination).toEqual(Cartesian3.fromDegrees(1.0, 2.0, 3.0));
            done();
        });
    });

    it('returns cartesian with matching coordinates for long/lat input', function (done) {
        var query = ' 1.0, 2.0 ';
        var defaultHeight = 300.0;
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(1);
            expect(results[0].destination).toEqual(Cartesian3.fromDegrees(1.0, 2.0, defaultHeight));
            done();
        });
    });

    it('returns empty array for input with only longitudinal coordinates', function (done) {
        var query = ' 1e 1e ';
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

    it('returns empty array for input with only one NSEW coordinate', function (done) {
        var query = ' 1e 1 ';
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

    it('returns empty array for input with only one number', function (done) {
        var query = ' 2.0 ';
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

    it('returns empty array for with string', function (done) {
        var query = ' aoeu ';
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

});
