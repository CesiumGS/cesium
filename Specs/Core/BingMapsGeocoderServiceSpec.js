/*global defineSuite*/
defineSuite([
    'Core/BingMapsGeocoderService',
    'Core/loadJsonp',
    'Core/Rectangle',
    'Specs/createScene'
], function(
    BingMapsGeocoderService,
    loadJsonp,
    Rectangle,
    createScene) {
    'use strict';

    var service;
    var scene;
    beforeEach(function() {
        scene = createScene();
        service = new BingMapsGeocoderService({scene: scene});
    });

    afterEach(function() {
        scene.destroyForSpecs();
    });

    afterAll(function() {
        loadJsonp.loadAndExecuteScript = loadJsonp.defaultLoadAndExecuteScript;
    });

    it('constructor throws without scene', function() {
        expect(function() {
            return new BingMapsGeocoderService();
        }).toThrowDeveloperError();
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
        loadJsonp.loadAndExecuteScript = function(url, functionName, deferred) {
            deferred.resolve(data);
        };
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
        loadJsonp.loadAndExecuteScript = function(url, functionName, deferred) {
            deferred.resolve(data);
        };
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
        loadJsonp.loadAndExecuteScript = function(url, functionName, deferred) {
            deferred.resolve(data);
        };
        service.geocode(query).then(function(results) {
            expect(results.length).toEqual(0);
            done();
        });
    });
});
