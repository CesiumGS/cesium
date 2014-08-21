/*global define*/
define([
        'Core/combine',
        'Core/defaultValue',
        'Core/defined',
        'ThirdParty/when'
    ], function(
        combine,
        defaultValue,
        defined,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function waitsForPromise(promise, resolveOrRejectCallback, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var expectRejection = defaultValue(options.expectRejection, false);
        var timeout = options.timeout; // Jasmine default is 5000 ms

        var result;
        var error;
        var resolved = false;
        var rejected = false;
        when(promise, function(r) {
            result = r;
            resolved = true;
        }, function(e) {
            rejected = true;
            error = e;
        });

        waitsFor(function() {
            return resolved || rejected;
        }, 'promise did not resolve or reject within timeout', timeout);

        runs(function() {
            if (rejected) {
                if (!expectRejection) {
                    throw 'expected promise to resolve, but rejected: ' + error;
                }

                if (defined(resolveOrRejectCallback)) {
                    resolveOrRejectCallback(error);
                }
            }

            if (resolved) {
                if (expectRejection) {
                    throw 'expected promise to reject, but resolved: ' + result;
                }

                if (defined(resolveOrRejectCallback)) {
                    resolveOrRejectCallback(result);
                }
            }
        });
    }

    waitsForPromise.toReject = function(promise, resolveOrRejectCallback, options) {
        options = combine({
            expectRejection : true
        }, options);
        waitsForPromise(promise, resolveOrRejectCallback, options);
    };

    return waitsForPromise;
});