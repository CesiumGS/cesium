/*global defineSuite*/
defineSuite([
        'Core/loadJsonp',
        'Core/DefaultProxy',
        'Core/RequestErrorEvent'
    ], function(
        loadJsonp,
        DefaultProxy,
        RequestErrorEvent) {
    'use strict';

    it('throws with no url', function() {
        expect(function() {
            loadJsonp();
        }).toThrowDeveloperError();
    });

    it('returns a promise that resolves when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function (url, name, deffered){
            expect(url).toContain(testUrl);
            expect(name).toContain('loadJsonp');
            expect(deffered).toBeDefined();
        });
        loadJsonp(testUrl);
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.invalid/testuri';
        return loadJsonp(testUrl).otherwise(function(error) {
            expect(error).toBeDefined();
        });
    });

    it('Appends parameters specified in options', function() {
        var testUrl = 'test';
        var options = {
            parameters: {
                isTest : 'true',
                myNum : 8
            }
        };
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
            expect(url).toContain('isTest=true&myNum=8');
        });
        loadJsonp(testUrl, options);
    });

    it('Uses callback name specified in options', function() {
        var testUrl = 'test';
        var options = {
            callbackParameterName : 'testCallback'
        };
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
            expect(url).toContain('testCallback=loadJsonp');
        });
        loadJsonp(testUrl, options);
    });

    it('Uses proxy url is proxy is specified', function() {
        var testUrl = 'test';
        var testProxy = '/proxy/';
        var options = {
            proxy: new DefaultProxy(testProxy)
        };
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
            expect(url).toStartWith(options.proxy.getURL(testUrl));
        });
        loadJsonp(testUrl, options);
    });
});
