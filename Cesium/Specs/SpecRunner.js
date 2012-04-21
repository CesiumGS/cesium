/**
 * Define a test suite.
 * @param {Array} An array of dependencies, to be passed to require.
 * @param {String} The name of the suite.
 * @param {Function} The test suite.
 */
var defineSuite;

(function() {
    /*global require*/

    var tests = [];
    var readyToCreateTests = false;
    var createTests;

    defineSuite = function(deps, name, suite) {
        var test = {
            name : name
        };

        tests.push(test);

        require({
            baseUrl : '../Source'
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

    /*global specs*/
    //specs is an array defined by SpecList.js
    require({
        baseUrl : '.'
    }, ['./addDefaultMatchers'].concat(specs), function(addDefaultMatchers) {
        var env = jasmine.getEnv();

        env.beforeEach(addDefaultMatchers);

        createTests = function() {
            env.currentRunner().suites().sort(function(a, b) {
                var aFocused = jasmine.TrivialReporter.isSuiteFocused(a);
                var bFocused = jasmine.TrivialReporter.isSuiteFocused(b);

                if (aFocused && !bFocused) {
                    return -1;
                }

                if (bFocused && !aFocused) {
                    return 1;
                }

                return a.index - b.index;
            });

            var reporter = new jasmine.TrivialReporter();
            env.addReporter(reporter);
            env.specFilter = reporter.specFilter;
            env.execute();
        };

        readyToCreateTests = true;
        createTestsIfReady();
    });
}());
