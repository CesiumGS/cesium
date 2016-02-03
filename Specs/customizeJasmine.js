/*global define*/
define([
    'Source/ThirdParty/when',
    'Specs/addDefaultMatchers',
    'Specs/equalsMethodEqualityTester'
], function (when,
             addDefaultMatchers,
             equalsMethodEqualityTester) {
    "use strict";

    return function (env, includedCategories, excludedCategories) {
        window.defineSuite = function(deps, name, suite, categories) {
            /*global define,describe*/
            if (typeof suite === 'object' || typeof suite === 'string') {
                categories = suite;
            }

            if (typeof name === 'function') {
                suite = name;
                name = deps[0];
            }

            // exclude this test if we're filtering by category and it's not the selected category
            // otherwise if we have not categories, excluded if the category matches
            if (includedCategories && categories !== includedCategories) {
                return;
            } else if (excludedCategories && categories === excludedCategories) {
                return;
            }

            define(deps, function() {
                var args = arguments;
                describe(name, function() {
                    suite.apply(null, args);
                }, categories);
            });
        };

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
