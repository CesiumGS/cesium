/*global defineSuite*/
defineSuite([
    'Core/loadJsonp',
    'Core/RequestErrorEvent'
], function(
    loadJsonp,
    RequestErrorEvent) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('throws with no url', function() {
        expect(function() {
            loadJsonp();
        }).toThrowDeveloperError();
    });

    it('returns a promise that resolves when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJsonp(testUrl).then(function(data){
            expect(data).toEqual({
                good : 'data'
            });
        }).otherwise(function(error) {

        });

        expect(promise).toBeDefined();
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJsonp(testUrl).then(function(data){

        }).otherwise(function(error) {
            expect(error).toBeDefined();
        });

        expect(promise).toBeDefined();
    });
});
