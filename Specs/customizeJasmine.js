/*global define*/
define([
    'Source/Cesium',
    'Specs/addDefaultMatchers',
    'Specs/equalsMethodEqualityTester'
], function (Cesium,
             addDefaultMatchers,
             equalsMethodEqualityTester) {
    "use strict";

    return function (env) {

        var when = Cesium.when;

        // Override beforeEach(), afterEach(), beforeAll(), afterAll(), and it() to automatically
        // call done() when a returned promise resolves.
        var originalIt = window.it;

        window.it = function(description, f, timeout, categories) {
            originalIt(description, function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            }, timeout, categories);
        };

        var originalBeforeEach = window.beforeEach;

        window.beforeEach = function(f) {
            originalBeforeEach(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };

        var originalAfterEach = window.afterEach;

        window.afterEach = function(f) {
            originalAfterEach(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };

        var originalBeforeAll = window.beforeAll;

        window.beforeAll = function(f) {
            originalBeforeAll(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };

        var originalAfterAll = window.afterAll;

        window.afterAll = function(f) {
            originalAfterAll(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };

        //env.catchExceptions(true);

        env.beforeEach(function () {
            addDefaultMatchers(true).call(env);
            env.addCustomEqualityTester(equalsMethodEqualityTester);
        });
    };
});