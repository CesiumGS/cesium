define([], function() {
    'use strict';
    var testModule = function () {};
    testModule.main = function () { return 42; };
    return testModule;
});
