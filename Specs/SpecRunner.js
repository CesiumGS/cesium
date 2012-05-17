/**
 * Define a test suite.
 * @param {Array} deps An array of dependencies, to be passed to require.
 * @param {String|Function} name Either the name of the test suite, or the test suite itself,
 * in which case the first dependency in the array will be used as the name.
 * @param {Function} [suite] The test suite.
 */
var defineSuite;

(function() {
    "use strict";
    /*global require,describe,specs,jasmine*/

    var tests = [];
    var readyToCreateTests = false;
    var createTests;

    defineSuite = function(deps, name, suite) {
        if (typeof name === 'function') {
            suite = name;
            name = deps[0];
        }

        var test = {
            name : name
        };

        tests.push(test);

        require({
            baseUrl : getQueryParameter('baseUrl') || '../Source'
        }, deps, function() {
            var args = arguments;

            test.f = function() {
                return describe(name, function() {
                    suite.apply(null, args);
                });
            };

            createTestsIfReady();
        });
    };

    function getQueryParameter(name) {
        var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);

        if (match) {
            return decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    }

    function createTestsIfReady() {
        if (readyToCreateTests && allTestsReady()) {
            tests.sort(function(a, b) {
                return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
            });

            tests.forEach(function(test, i) {
                //calling the function registers the test with Jasmine
                var suite = test.f();

                //keep track of the index of the test in the suite so the sort later is stable.
                suite.index = i;
            });

            createTests();
        }
    }

    function allTestsReady() {
        return tests.every(function(test) {
            return !!test.f;
        });
    }

    //specs is an array defined by SpecList.js
    require({
        baseUrl : '.'
    }, ['./addDefaultMatchers'].concat(specs), function(addDefaultMatchers) {
        var env = jasmine.getEnv();

        env.beforeEach(addDefaultMatchers);

        createTests = function() {
            var isSuiteFocused = jasmine.TrivialReporter.isSuiteFocused;
            var suites = jasmine.getEnv().currentRunner().suites();

            for ( var i = 1, insertPoint = 0, len = suites.length; i < len; i++) {
                var suite = suites[i];
                if (isSuiteFocused(suite)) {
                    suites.splice(i, 1);
                    suites.splice(insertPoint, 0, suite);
                    insertPoint++;
                    i--;
                }
            }
            var reporter = new jasmine.TrivialReporter();
            env.addReporter(reporter);
            env.specFilter = reporter.specFilter;
            env.execute();
        };

        readyToCreateTests = true;
        createTestsIfReady();
    });
}());
