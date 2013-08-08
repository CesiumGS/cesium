/*global define*/
define(function() {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function waitsForException(func, errorFunc) {
        var thrown = false;
        var error;

        waitsFor(function() {
            var succeeded = false;
            try {
                succeeded = func();
            } catch (err) {
                error = err;
                thrown = true;
            }

            return succeeded || thrown;
        });

        runs(function() {
            expect(thrown).toEqual(true);
            if (typeof errorFunc === 'function' && thrown) {
                errorFunc(error);
            }
        });
    }

    return waitsForException;
});