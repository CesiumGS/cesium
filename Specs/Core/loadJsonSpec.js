/*global defineSuite*/
defineSuite([
         'Core/loadJson'
     ], function(
         loadJson) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var fakeXHR;

    beforeEach(function() {
        fakeXHR = jasmine.createSpyObj('XMLHttpRequest', ['send', 'open', 'setRequestHeader', 'abort']);
        fakeXHR.simulateLoad = function(response) {
            fakeXHR.response = response;
            if (typeof fakeXHR.onload === 'function') {
                fakeXHR.onload();
            }
        };
        fakeXHR.simulateError = function(error) {
            fakeXHR.response = '';
            if (typeof fakeXHR.onerror === 'function') {
                fakeXHR.onerror(error);
            }
        };

        spyOn(window, 'XMLHttpRequest').andReturn(fakeXHR);
    });

    it('throws with no url', function() {
        expect(function() {
            loadJson();
        }).toThrow();
    });

    it('creates and sends request, adding Accept header', function() {
        loadJson("test", {
            'Cache-Control' : 'no-cache'
        });

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', "test", true);
        expect(fakeXHR.setRequestHeader.callCount).toEqual(2);
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Accept', 'application/json');
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('returns a promise that resolves when the request loads', function() {
        var testUrl = 'http://example.com/testuri';
        var promise = loadJson(testUrl);

        expect(promise).toBeDefined();

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        var response = '{"good":"data"}';
        fakeXHR.simulateLoad(response);
        expect(resolvedValue).toEqual({
            good : 'data'
        });
        expect(rejectedError).toBeUndefined();
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.com/testuri';
        var promise = loadJson(testUrl);

        expect(promise).toBeDefined();

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        var error = 'some error';
        fakeXHR.simulateError(error);
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toEqual(error);
    });
});