/**
 * Define a test suite.
 * @param {Array} deps An array of dependencies, to be passed to require.
 * @param {String|Function} name Either the name of the test suite, or the test suite itself,
 * in which case the first dependency in the array will be used as the name.
 * @param {Function} [suite] The test suite.
 */
var defineSuite;

/**
 * Registers a function that is called before running all tests.
 *
 * @param {Function} beforeAllFunction The function to run before all tests.
 */
var beforeAll;

/**
 * Registers a function that is called after running all tests.
 *
 * @param {Function} afterAllFunction The function to run after all tests.
 */
var afterAll;

(function() {
    "use strict";
    /*global require,describe,specs,jasmine*/

    // patch in beforeAll/afterAll functions
    // based on existing beforeEach/afterEach

    jasmine.Env.prototype.beforeAll = function(beforeAllFunction) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll(beforeAllFunction);
        } else {
            throw 'Must call beforeAll while defining a suite.';
        }
    };

    jasmine.Env.prototype.afterAll = function(afterAllFunction) {
        if (this.currentSuite) {
            this.currentSuite.afterAll(afterAllFunction);
        } else {
            throw 'Must call beforeAll while defining a suite.';
        }
    };

    jasmine.Suite.prototype.beforeAll = function(beforeAllFunction) {
        beforeAllFunction.typeName = 'beforeAll';
        if (typeof this.beforeAll_ === 'undefined') {
            this.beforeAll_ = [];
        }
        this.beforeAll_.unshift(beforeAllFunction);
    };

    jasmine.Suite.prototype.afterAll = function(afterAllFunction) {
        afterAllFunction.typeName = 'afterAll';
        if (typeof this.afterAll_ === 'undefined') {
            this.afterAll_ = [];
        }
        this.afterAll_.unshift(afterAllFunction);
    };

    jasmine.Suite.prototype.execute = (function(originalExecute) {
        return function(onComplete) {
            var i, len;

            var block, results;

            var beforeAll = this.beforeAll_;
            if (typeof beforeAll !== 'undefined') {
                var beforeSpec = new jasmine.Spec(this.env, this, 'beforeAll');
                results = function() {
                    return beforeSpec.results();
                };
                for (i = 0, len = beforeAll.length; i < len; i++) {
                    block = new jasmine.Block(this.env, beforeAll[i], beforeSpec);
                    block.results = results;
                    this.queue.addBefore(block);
                }
            }

            var afterAll = this.afterAll_;
            if (typeof afterAll !== 'undefined') {
                var afterSpec = new jasmine.Spec(this.env, this, 'afterAll');
                results = function() {
                    return afterSpec.results();
                };
                for (i = 0, len = afterAll.length; i < len; i++) {
                    block = new jasmine.Block(this.env, afterAll[i], afterSpec);
                    block.results = results;
                    this.queue.add(block);
                }
            }

            originalExecute.call(this, onComplete);
        };
    })(jasmine.Suite.prototype.execute);

    beforeAll = function(beforeAllFunction) {
        jasmine.getEnv().beforeAll(beforeAllFunction);
    };

    afterAll = function(afterAllFunction) {
        jasmine.getEnv().afterAll(afterAllFunction);
    };

    var tests = [];
    var readyToCreateTests = false;
    var createTests;

    function getQueryParameter(name) {
        var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);

        if (match) {
            return decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    }

    require.config({
        baseUrl : getQueryParameter('baseUrl') || '../Source',
        paths : {
            'Specs' : '../Specs'
        }
    });

    //start loading all of Cesium early, so it's all available for code coverage calculations.
    require(['Cesium']);

    defineSuite = function(deps, name, suite) {
        if (typeof name === 'function') {
            suite = name;
            name = deps[0];
        }

        var test = {
            name : name
        };

        tests.push(test);

        require(deps, function() {
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

    //specs is an array defined by SpecList.js
    require([
             'Specs/addDefaultMatchers',
             'Specs/equalsMethodEqualityTester'
         ].concat(specs), function(
             addDefaultMatchers,
             equalsMethodEqualityTester) {
        var env = jasmine.getEnv();

        env.beforeEach(addDefaultMatchers);
        env.addEqualityTester(equalsMethodEqualityTester);

        createTests = function() {
            var reporter = new jasmine.HtmlReporter();
            var isSuiteFocused = jasmine.HtmlReporterHelpers.isSuiteFocused;
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

            env.addReporter(reporter);
            env.specFilter = reporter.specFilter;
            env.execute();
        };

        readyToCreateTests = true;
        createTestsIfReady();
    });
}());