defineSuite([
        'Core/BingMapsGeocoderService',
        'Core/Rectangle',
        'Core/Resource'
    ], function(
        BingMapsGeocoderService,
        Rectangle,
        Resource) {
    'use strict';

    afterAll(function() {
        Resource._Implementations.loadAndExecuteScript = Resource._DefaultImplementations.loadAndExecuteScript;
    });

    it('returns geocoder results', function (done) {
        var query = 'some query';
        var data = {
            resourceSets: [{
                resources : [{
                    name : 'a',
                    bbox : [32.0, 3.0, 3.0, 4.0]
                }]
            }]
        };
        Resource._Implementations.loadAndExecuteScript = function(url, functionName, deferred) {
            deferred.resolve(data);
        };
        var service = new BingMapsGeocoderService();
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(1);
            expect(results[0].displayName).toEqual('a');
            expect(results[0].destination).toBeInstanceOf(Rectangle);
            done();
        });
    });

    it('returns no geocoder results if Bing has no results', function (done) {
        var query = 'some query';
        var data = {
            resourceSets: []
        };
        Resource._Implementations.loadAndExecuteScript = function(url, functionName, deferred) {
            deferred.resolve(data);
        };
        var service = new BingMapsGeocoderService();
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(0);
            done();
        });
    });

    it('returns no geocoder results if Bing has results but no resources', function (done) {
        var query = 'some query';
        var data = {
            resourceSets: [{
                resources: []
            }]
        };
        Resource._Implementations.loadAndExecuteScript = function(url, functionName, deferred) {
            deferred.resolve(data);
        };
        var service = new BingMapsGeocoderService();
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(0);
            done();
        });
    });
});
