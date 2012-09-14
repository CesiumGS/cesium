/*global defineSuite*/
defineSuite([
             'Core/loadText'
            ], function(
             loadText) {
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
            loadText();
        }).toThrow();
    });

    it('creates and sends request without any custom headers', function() {
        var testUrl = 'http://example.com/testuri';
        loadText(testUrl);

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', testUrl, true);
        expect(fakeXHR.setRequestHeader).not.toHaveBeenCalled();
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('creates and sends request with custom headers', function() {
        var testUrl = 'http://example.com/testuri';
        loadText(testUrl, {
            'Accept' : 'application/json',
            'Cache-Control' : 'no-cache'
        });

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', testUrl, true);
        expect(fakeXHR.setRequestHeader.callCount).toEqual(2);
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Accept', 'application/json');
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('returns a promise that resolves when the request loads', function() {
        var testUrl = 'http://example.com/testuri';
        var promise = loadText(testUrl);

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

        var response = 'some response';
        fakeXHR.simulateLoad(response);
        expect(resolvedValue).toEqual(response);
        expect(rejectedError).toBeUndefined();
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.com/testuri';
        var promise = loadText(testUrl);

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