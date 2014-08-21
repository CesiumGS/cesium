/*global define*/
define([
        'Core/defaultValue',
        'Core/defined',
        'ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function waitsForPromise(promise, options, resolveOrRejectCallback) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var expectRejection = defaultValue(options.expectRejection, false);

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
        }, 'promise did not resolve or reject within timeout', options.timeout);

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

    return waitsForPromise;
});